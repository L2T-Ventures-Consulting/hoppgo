import { env } from "@/env";

const REQUEST_TIMEOUT_MS = 120_000;
const MAX_OUTPUT_SIZE = 32 * 1024 * 1024;
const ERROR_BODY_SNIPPET = 500;

export type BackgroundRemovalErrorCode = "not_configured" | "request_failed" | "invalid_response";

export class BackgroundRemovalError extends Error {
  constructor(
    readonly code: BackgroundRemovalErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BackgroundRemovalError";
  }
}

export function resolveBackgroundRemovalUrl(): string | null {
  const value = env.AI_IMAGE_BACKGROUND_REMOVAL_URL?.trim();
  return value ? value.replace(/\/+$/, "") : null;
}

export function isImageBackgroundRemovalEnabled(): boolean {
  return resolveBackgroundRemovalUrl() !== null;
}

/**
 * Send image bytes to the private rembg sidecar and return a PNG carrying the
 * inferred alpha channel. The service URL is operator-controlled; no user URL
 * is ever forwarded, which keeps this boundary from becoming an SSRF proxy.
 */
export async function removeImageBackground(input: {
  buffer: Buffer;
  mimeType: string;
}): Promise<Buffer> {
  const baseUrl = resolveBackgroundRemovalUrl();
  if (!baseUrl) {
    throw new BackgroundRemovalError("not_configured", "no background removal service configured");
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(input.buffer)], { type: input.mimeType }),
    "product",
  );
  const token = env.AI_IMAGE_BACKGROUND_REMOVAL_TOKEN?.trim();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/remove`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new BackgroundRemovalError(
      "request_failed",
      `background removal request failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new BackgroundRemovalError(
      "request_failed",
      `background removal returned ${response.status}: ${body.slice(0, ERROR_BODY_SNIPPET)}`,
    );
  }

  const contentType = response.headers.get("content-type")?.split(";")[0];
  if (contentType !== "image/png") {
    throw new BackgroundRemovalError(
      "invalid_response",
      `background removal returned ${contentType ?? "no content-type"}`,
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await response.arrayBuffer());
  } catch (error) {
    throw new BackgroundRemovalError(
      "request_failed",
      `background removal body read failed: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (buffer.byteLength === 0 || buffer.byteLength > MAX_OUTPUT_SIZE) {
    throw new BackgroundRemovalError(
      "invalid_response",
      `background removal returned ${buffer.byteLength} bytes`,
    );
  }

  return buffer;
}
