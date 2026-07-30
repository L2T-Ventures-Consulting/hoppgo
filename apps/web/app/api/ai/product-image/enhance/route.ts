import { NextResponse } from "next/server";

import { randomUUID } from "node:crypto";
import { z } from "zod";

import { MAX_IMAGE_SIZE } from "@louez/validations";

import { maybeTriggerAutoTopup } from "@/lib/ai/advisor/auto-topup";
import { microToCredits } from "@/lib/ai/advisor/credits";
import {
  BackgroundRemovalError,
  isImageBackgroundRemovalEnabled,
  removeImageBackground,
} from "@/lib/ai/image/background-removal";
import {
  checkImageEnhanceCredits,
  isAiImageEnhanceEnabled,
  recordImageEnhanceDebit,
} from "@/lib/ai/image/credits";
import { standardizeProductImage } from "@/lib/ai/image/postprocess";
import { ImageProviderError, enhanceProductImage } from "@/lib/ai/image/provider";
import { auth } from "@/lib/auth";
import { useLogger, withEvlog } from "@/lib/evlog";
import { getStorePlan } from "@/lib/plan-limits";
import { areAiCreditsEnabled } from "@/lib/plans";
import { getImageFiles } from "@/lib/storage/files";
import { getCurrentStore, hasPermission } from "@/lib/store-context";

export const runtime = "nodejs";
// GPT Image (up to 210s), rembg (up to 120s), storage and post-processing.
export const maxDuration = 360;

// Same shape the upload pipeline enforces on keys (lib/storage/files.ts),
// minus GIF: an animated source has no meaningful "product on transparency".
const KEY_PATTERN = /^[a-zA-Z0-9/_-]+\.(?:jpe?g|png|webp)$/;

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const requestSchema = z.object({
  imageKey: z.string().min(1).max(300),
  operation: z.enum(["enhance", "remove-background"]).default("enhance"),
});

const handlePost = async (request: Request) => {
  const logger = useLogger();

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  // Writes a new object into the store's product folder and can spend the
  // store's credits, so it needs the same 'write' grant as editing a product.
  const store = await getCurrentStore();
  if (!store || !hasPermission(store.role, "write")) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ code: "invalid_image" }, { status: 400 });
  }

  const { operation } = parsed.data;
  if (operation === "enhance" && !isAiImageEnhanceEnabled()) {
    return NextResponse.json({ code: "ai_image_disabled" }, { status: 503 });
  }
  if (operation === "remove-background" && !isImageBackgroundRemovalEnabled()) {
    return NextResponse.json({ code: "background_removal_disabled" }, { status: 503 });
  }

  // The key must belong to THIS store's product folder — the only thing that
  // keeps this from becoming a "run the AI over any object in the bucket" tool.
  // A bare object name (what getImageKeyFromUrl returns client-side, and what
  // the upload router itself takes) is resolved under the store prefix; a full
  // key must already carry it.
  const prefix = `${store.id}/products/`;
  const imageKey = parsed.data.imageKey.includes("/")
    ? parsed.data.imageKey
    : `${prefix}${parsed.data.imageKey}`;
  if (!imageKey.startsWith(prefix) || !KEY_PATTERN.test(imageKey)) {
    return NextResponse.json({ code: "invalid_image" }, { status: 400 });
  }

  // AI credit gate (cloud commercial layer). Inert unless enabled; fail-closed.
  const plan =
    operation === "enhance" && areAiCreditsEnabled() ? await getStorePlan(store.id) : null;
  if (plan) {
    const creditCheck = await checkImageEnhanceCredits(store.id, plan);
    if (!creditCheck.allowed) {
      return NextResponse.json({ code: "credits_exhausted" }, { status: 402 });
    }
  }

  const files = getImageFiles();

  // Read the original through the storage adapter (works identically for a
  // public bucket and for the private, proxied MinIO of standalone installs).
  let source: Buffer;
  let sourceMimeType: string;
  try {
    const stored = await files.download(imageKey);
    source = Buffer.from(await stored.arrayBuffer());
    const extension = imageKey.split(".").pop()?.toLowerCase() ?? "";
    sourceMimeType = MIME_BY_EXTENSION[extension] ?? stored.type ?? "application/octet-stream";
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error("Product image read failed"));
    return NextResponse.json({ code: "invalid_image" }, { status: 400 });
  }

  if (source.byteLength === 0 || source.byteLength > MAX_IMAGE_SIZE) {
    return NextResponse.json({ code: "invalid_image" }, { status: 400 });
  }

  let standardized: { buffer: Buffer; contentType: "image/webp" };
  try {
    const backgroundRemovalInput =
      operation === "enhance"
        ? {
            buffer: await enhanceProductImage({
              buffer: source,
              mimeType: sourceMimeType,
            }),
            mimeType: "image/png",
          }
        : { buffer: source, mimeType: sourceMimeType };
    const isolated = await removeImageBackground(backgroundRemovalInput);
    standardized = await standardizeProductImage(isolated);
  } catch (error) {
    // Provider messages can carry request details — logged, never returned.
    logger.error(error instanceof Error ? error : new Error("Product image processing failed"));
    if (error instanceof Error && error.message === "empty_image") {
      return NextResponse.json({ code: "empty_image" }, { status: 422 });
    }
    if (error instanceof ImageProviderError) {
      return NextResponse.json({ code: "provider_error" }, { status: 502 });
    }
    if (error instanceof BackgroundRemovalError) {
      return NextResponse.json({ code: "background_removal_error" }, { status: 502 });
    }
    // Anything else (e.g. an unreadable source the decoder chokes on) is ours.
    return NextResponse.json({ code: "server_error" }, { status: 500 });
  }

  // Always a NEW object (same id shape the upload router mints) — the original
  // stays untouched so the merchant can always fall back to it.
  const objectId = randomUUID();
  const suffix = operation === "enhance" ? "ai" : "bg";
  const key = `${prefix}${objectId}-${suffix}.webp`;

  let url: string;
  try {
    await files.upload(key, standardized.buffer, {
      contentType: standardized.contentType,
    });
    url = await files.url(key);
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error("Processed image upload failed"));
    return NextResponse.json({ code: "server_error" }, { status: 500 });
  }

  // Billed only once the result is stored, and keyed on the new object so a
  // retried request can never charge twice. If the ledger write fails for any
  // reason other than a dedup replay, withhold the result (delete the object)
  // instead of delivering unaccounted work.
  let creditsCharged = 0;
  if (operation === "enhance" && plan) {
    try {
      const debitedMicro = await recordImageEnhanceDebit(store.id, {
        dedupKey: `imgenh:${objectId}`,
        plan,
      });
      creditsCharged = microToCredits(debitedMicro);
    } catch {
      await files.delete(key).catch(() => undefined);
      return NextResponse.json({ code: "server_error" }, { status: 500 });
    }

    // Off the critical path (result already stored): recharge the merchant's
    // balance off-session if it dropped below their threshold.
    await maybeTriggerAutoTopup(store.id);
  }

  return NextResponse.json({ key, url, creditsCharged });
};

export const POST = withEvlog(handlePost);
