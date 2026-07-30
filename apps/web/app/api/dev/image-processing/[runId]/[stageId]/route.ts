import { NextResponse } from "next/server";

import type { Readable } from "node:stream";

import {
  getImageProcessingDebugStage,
  isImageProcessingDebugEnabled,
} from "@/lib/ai/image/debug-artifacts";
import { auth } from "@/lib/auth";
import { getCurrentStore, hasPermission } from "@/lib/store-context";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ runId: string; stageId: string }>;
}

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

export async function GET(_request: Request, context: RouteContext) {
  if (!isImageProcessingDebugEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ code: "unauthorized" }, { status: 401 });
  }

  const store = await getCurrentStore();
  if (!store || !hasPermission(store.role, "read")) {
    return NextResponse.json({ code: "forbidden" }, { status: 403 });
  }

  const { runId, stageId } = await context.params;
  const stage = await getImageProcessingDebugStage(store.id, runId, stageId);
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
