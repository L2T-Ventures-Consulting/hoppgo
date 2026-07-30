import { env } from "@/env";

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
const ENHANCE_PROMPT = [
  "Create a clean, professional 4:3 product photo of the exact rental product shown in the input.",
  "Keep the ENTIRE product visible and completely unchanged: same shape, proportions, colors, materials, textures, logos, labels, markings, scratches, wear and every small detail.",
  "Do not crop, cut off or extend any part of the product. Do not add, remove or modify anything: no props, no accessories, no text, no watermark, no reflection, no drop shadow or contact shadow outside the product itself.",
  "Improve only the photographic presentation with studio-quality neutral lighting, natural sharpness and accurate real colors.",
  "Place the product centered on a perfectly uniform pure white background with comfortable margins.",
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

type ImageEditResponse = {
  data?: { b64_json?: string }[];
};

/**
 * Send one product photo to GPT Image 2 and return its opaque 1600x1200 PNG.
 * Background removal and final canvas normalization are separate deterministic
 * steps so this provider never relies on unsupported GPT Image 2 transparency.
 */
export async function enhanceProductImage(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<Buffer> {
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
  form.append("prompt", ENHANCE_PROMPT);
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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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

  let payload: ImageEditResponse;
  try {
    payload = JSON.parse(bodyText) as ImageEditResponse;
  } catch {
    throw new ImageProviderError(
      "invalid_response",
      `image edit returned a non-JSON body (status ${response.status}, ${
        response.headers.get("content-type") ?? "no content-type"
      }): ${bodyText.slice(0, ERROR_BODY_SNIPPET)}`,
    );
  }

  const b64 = payload.data?.[0]?.b64_json;
  if (!b64) {
    throw new ImageProviderError("invalid_response", "image edit response carried no image data");
  }

  const buffer = Buffer.from(b64, "base64");
  if (buffer.byteLength === 0) {
    throw new ImageProviderError("invalid_response", "image edit returned 0 bytes");
  }

  return buffer;
}
