import { NextResponse } from "next/server";

import type { Readable } from "node:stream";
import { z } from "zod";

import {
  getImageProcessingDebugStage,
  isImageProcessingDebugEnabled,
} from "@/lib/ai/image/debug-artifacts";
import {
  IMAGE_PROCESSING_BENCHMARK_FILTER,
  IMAGE_PROCESSING_BENCHMARK_SCOPE_ID,
} from "@/lib/ai/image/benchmark-fixtures";
import { auth } from "@/lib/auth";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getCurrentStore, hasPermission, verifyStoreAccess } from "@/lib/store-context";

interface RouteContext {
  params: Promise<{ runId: string; stageId: string }>;
}

const storeIdSchema = z.string().length(21);

function toResponseStream(source: Readable): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = await iterator.next();
        if (result.done) {
          controller.close();
          return;
        }

        if (typeof result.value === "string") {
          controller.enqueue(Buffer.from(result.value));
          return;
        }
        if (result.value instanceof Uint8Array) {
          controller.enqueue(result.value);
          return;
        }

        controller.error(new Error("Unsupported image stream chunk"));
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      await iterator.return?.();
      source.destroy();
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  if (!isImageProcessingDebugEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const requestedScope = url.searchParams.get("scope");
  const requestedStoreId = url.searchParams.get("storeId");
  let storeId: string;

  if (requestedScope === IMAGE_PROCESSING_BENCHMARK_FILTER) {
    if (!isPlatformAdmin(session.user.email)) {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }
    storeId = IMAGE_PROCESSING_BENCHMARK_SCOPE_ID;
  } else if (requestedScope) {
    return NextResponse.json({ code: "invalid_scope" }, { status: 400 });
  } else if (requestedStoreId) {
    const parsedStoreId = storeIdSchema.safeParse(requestedStoreId);
    if (!parsedStoreId.success) {
      return NextResponse.json({ code: "invalid_store" }, { status: 400 });
    }

    const role = await verifyStoreAccess(parsedStoreId.data);
    if (!role || !hasPermission(role, "read")) {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }
    storeId = parsedStoreId.data;
  } else {
    // Backward compatibility for already-open image URLs from the former
    // single-store page.
    const store = await getCurrentStore();
    if (!store || !hasPermission(store.role, "read")) {
      return NextResponse.json({ code: "forbidden" }, { status: 403 });
    }
    storeId = store.id;
  }

  const { runId, stageId } = await context.params;
  const stage = await getImageProcessingDebugStage(storeId, runId, stageId);
  if (!stage) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(toResponseStream(stage.body), {
    headers: {
      "Content-Type": stage.contentType,
      "Content-Length": String(stage.byteSize),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
