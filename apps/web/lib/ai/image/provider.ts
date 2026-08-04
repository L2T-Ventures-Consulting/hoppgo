import { env } from "@/env";
import type { ChromaKeyColor } from "@/lib/ai/image/chroma-background";
import type { ImageTokenUsage } from "@/lib/ai/pricing";
import { z } from "zod";

/**
 * OpenAI image-edit call behind the "enhance product photo" dashboard action.
 *
 * Deliberately a raw `fetch` against the REST endpoint rather than the `openai`
 * package: this is the only image call in the app, the multipart body is three
 * fields wide, and the AI SDK has no image-EDIT primitive. Keeping it dependency
 * free also keeps the feature inert (and unbundled) when no key is configured.
 */

const IMAGE_EDITS_URL = "https://api.openai.com/v1/images/edits";

const DEFAULT_MODEL = "gpt-image-2";
const DEFAULT_QUALITY = "medium";
const OUTPUT_SIZE = "1600x1200";

/**
 * A single edit routinely takes 1–3 minutes at high input fidelity (observed
 * >120s in practice). The route's maxDuration leaves headroom above this.
 */
const REQUEST_TIMEOUT_MS = 210_000;

/** How much of a provider error body is kept for the server logs. */
const ERROR_BODY_SNIPPET = 500;

/**
 * The product must come back IDENTICAL — this tool cleans up the background of a
 * real rental item, it does not reimagine it. Any invented detail would misprice
 * or misrepresent the goods a customer books.
 */
const getEnhancePrompt = (chromaColor: ChromaKeyColor) =>
  [
    "Create a clean, professional 4:3 product photo of the exact rental product shown in the input.",
    "First inspect the original composition and choose the correct framing rule. If the entire product is visible with space around it, keep the ENTIRE product visible and place it centered with comfortable, even margins. If any part of the product is intentionally cropped by an image edge, preserve the original framing exactly: keep the same camera angle, perspective, product scale, zoom, position and the same parts cropped at the same edges.",
    "For a cropped product, never zoom out, shrink, reveal, reconstruct or invent any off-frame part. Keep the visible product at the exact same relative size, and do not introduce new background margins around it.",
    "Keep every visible part completely unchanged: same shape, proportions, colors, materials, textures, logos, labels, markings, scratches, wear and every small detail.",
    "Do not add, remove or modify anything: no props, no accessories, no text, no watermark, no reflection, no drop shadow or contact shadow outside the product itself.",
    "Improve only the photographic presentation with studio-quality neutral lighting, natural sharpness and accurate real colors.",
    `Replace the complete background with one perfectly flat, uniform chroma-key color: ${chromaColor.hex} (RGB ${chromaColor.rgb.join(", ")}). Use exactly this color from edge to edge, with no gradient, texture, shadow, reflection, glow or color spill on the product.`,
    "When the source is intentionally cropped, adapt to 4:3 only by extending this empty chroma-key background where necessary and never by shrinking or moving the product.",
  ].join(" ");

export type ImageProviderErrorCode = "not_configured" | "request_failed" | "invalid_response";

/** Provider-side failure. `message` is for logs only — never returned to a client. */
export class ImageProviderError extends Error {
  constructor(
    readonly code: ImageProviderErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ImageProviderError";
  }
}

/**
 * API key for image editing: the dedicated key first, else the shared AI key
 * when the configured provider is already OpenAI. Null ⇒ feature disabled.
 */
export function resolveImageApiKey(): string | null {
  const dedicated = env.AI_IMAGE_OPENAI_API_KEY?.trim();
  if (dedicated) return dedicated;
  if (env.AI_PROVIDER === "openai") {
    const shared = env.AI_API_KEY?.trim();
    if (shared) return shared;
  }
  return null;
}

const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const imageEditUsageSchema = z.object({
  input_tokens: z.number().int().nonnegative(),
  input_tokens_details: z.object({
    image_tokens: z.number().int().nonnegative(),
    text_tokens: z.number().int().nonnegative(),
  }),
  output_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

const imageEditResponseSchema = z.object({
  data: z.array(z.object({ b64_json: z.string().min(1) })).min(1),
  // Usage is diagnostic metadata: a provider-side shape change must not make
  // an otherwise valid customer image fail. Validate it independently below.
  usage: z.unknown().optional(),
});

export type ImageProviderResult = {
  buffer: Buffer;
  usage: ImageTokenUsage | null;
};

/**
 * Send one product photo to GPT Image 2 and return its opaque 1600x1200 PNG.
 * Background removal and final canvas normalization are separate deterministic
 * steps so this provider never relies on unsupported GPT Image 2 transparency.
 */
export async function enhanceProductImage(input: {
  buffer: Buffer;
  mimeType: string;
  chromaColor: ChromaKeyColor;
  /**
   * Caller-owned cancellation (the route passes `request.signal`). Aborting it
   * drops the provider call instead of letting a run nobody waits for finish.
   */
  signal?: AbortSignal;
}): Promise<ImageProviderResult> {
  const apiKey = resolveImageApiKey();
  if (!apiKey) {
    throw new ImageProviderError("not_configured", "no image API key configured");
  }

  const extension = FILE_EXTENSIONS[input.mimeType] ?? "png";
  const form = new FormData();
  form.append("model", env.AI_IMAGE_MODEL?.trim() || DEFAULT_MODEL);
  form.append(
    "image",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    `product.${extension}`,
  );
  form.append("prompt", getEnhancePrompt(input.chromaColor));
  form.append("background", "opaque");
  form.append("quality", env.AI_IMAGE_QUALITY ?? DEFAULT_QUALITY);
  form.append("size", OUTPUT_SIZE);
  form.append("output_format", "png");
  form.append("n", "1");

  let response: Response;
  try {
    response = await fetch(IMAGE_EDITS_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      // Whichever comes first: the caller giving up, or our own ceiling.
      signal: input.signal
        ? AbortSignal.any([input.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)])
        : AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ImageProviderError(
      "request_failed",
      `image edit request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new ImageProviderError(
      "request_failed",
      `image edit returned ${response.status}: ${body.slice(0, ERROR_BODY_SNIPPET)}`,
    );
  }

  // Read the body as text first: an abort mid-download (the timeout also
  // cancels body streaming) must surface as a timeout, not "non-JSON body",
  // and a genuine non-JSON body is worth a snippet in the logs.
  let bodyText: string;
  try {
    bodyText = await response.text();
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new ImageProviderError(
      "request_failed",
      aborted
        ? `image edit timed out after ${REQUEST_TIMEOUT_MS / 1000}s while downloading the response`
        : `image edit body read failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(bodyText);
  } catch {
    throw new ImageProviderError(
      "invalid_response",
      `image edit returned a non-JSON body (status ${response.status}, ${
        response.headers.get("content-type") ?? "no content-type"
      }): ${bodyText.slice(0, ERROR_BODY_SNIPPET)}`,
    );
  }

  const parsedPayload = imageEditResponseSchema.safeParse(rawPayload);
  if (!parsedPayload.success) {
    throw new ImageProviderError(
      "invalid_response",
      "image edit response did not match the expected shape",
    );
  }

  const buffer = Buffer.from(parsedPayload.data.data[0].b64_json, "base64");
  if (buffer.byteLength === 0) {
    throw new ImageProviderError("invalid_response", "image edit returned 0 bytes");
  }

  const providerUsage = imageEditUsageSchema.safeParse(parsedPayload.data.usage);
  const usage = providerUsage.success
    ? {
        inputTokens: providerUsage.data.input_tokens,
        inputImageTokens: providerUsage.data.input_tokens_details.image_tokens,
        inputTextTokens: providerUsage.data.input_tokens_details.text_tokens,
        outputTokens: providerUsage.data.output_tokens,
        totalTokens: providerUsage.data.total_tokens,
      }
    : null;

  return { buffer, usage };
}
