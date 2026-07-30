import "server-only";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "node:stream";
import { z } from "zod";

import { env } from "@/env";
import { getStorageClient } from "@/lib/storage/files";

const DEBUG_ROOT = "dev/image-processing";
const MANIFEST_FILENAME = "manifest.json";
const MANIFEST_VERSION = 1;
const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

const stageIdSchema = z.enum(["original", "ai-enhanced", "background-removed", "standardized"]);

export type ImageProcessingDebugStageId = z.infer<typeof stageIdSchema>;

const operationSchema = z.enum(["enhance", "remove-background"]);

const manifestSchema = z.object({
  version: z.literal(MANIFEST_VERSION),
  runId: z.uuid(),
  storeId: z.string().min(1),
  operation: operationSchema,
  createdAt: z.iso.datetime(),
  sourceKey: z.string().min(1),
  outputKey: z.string().min(1),
  totalDurationMs: z.number().int().nonnegative(),
  configuration: z.object({
    aiModel: z.string().nullable(),
    aiQuality: z.string().nullable(),
    backgroundRemovalModel: z.string(),
  }),
  stages: z.array(
    z.object({
      id: stageIdSchema,
      label: z.string().min(1),
      key: z.string().min(1),
      contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      byteSize: z.number().int().positive(),
      durationMs: z.number().int().nonnegative().nullable(),
    }),
  ),
});

export type ImageProcessingDebugRun = z.infer<typeof manifestSchema>;

export interface ImageProcessingDebugStageInput {
  id: ImageProcessingDebugStageId;
  label: string;
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  durationMs?: number;
}

interface PersistImageProcessingDebugRunInput {
  runId: string;
  storeId: string;
  operation: z.infer<typeof operationSchema>;
  createdAt: Date;
  sourceKey: string;
  outputKey: string;
  totalDurationMs: number;
  stages: ImageProcessingDebugStageInput[];
}

const extensionByContentType = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export function isImageProcessingDebugEnabled(): boolean {
  return env.NODE_ENV === "development" || env.AI_IMAGE_DEBUG_ENABLED === "true";
}

function getRunPrefix(storeId: string, runId: string): string {
  return `${storeId}/${DEBUG_ROOT}/${runId}/`;
}

function getManifestKey(storeId: string, runId: string): string {
  return `${getRunPrefix(storeId, runId)}${MANIFEST_FILENAME}`;
}

function isRunId(value: string): boolean {
  return z.uuid().safeParse(value).success;
}

async function readManifest(
  storeId: string,
  runId: string,
): Promise<ImageProcessingDebugRun | null> {
  if (!isRunId(runId)) return null;

  try {
    const object = await getStorageClient().send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: getManifestKey(storeId, runId),
      }),
    );
    const body = await object.Body?.transformToString();
    if (!body) return null;

    const parsed = manifestSchema.safeParse(JSON.parse(body));
    if (!parsed.success || parsed.data.storeId !== storeId || parsed.data.runId !== runId) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Store one successful processing run as private S3 objects.
 *
 * This intentionally bypasses the public-image files adapter: product assets
 * receive a public-read ACL, while diagnostic originals and intermediate
 * outputs must only be served through the authenticated dev API.
 */
export async function persistImageProcessingDebugRun(
  input: PersistImageProcessingDebugRunInput,
): Promise<void> {
  if (!isImageProcessingDebugEnabled()) return;
  if (!isRunId(input.runId)) throw new Error("invalid image processing debug run id");

  const client = getStorageClient();
  const prefix = getRunPrefix(input.storeId, input.runId);
  const stages = input.stages.map((stage) => ({
    ...stage,
    key: `${prefix}${stage.id}.${extensionByContentType[stage.contentType]}`,
  }));
  const uploadedKeys = stages.map((stage) => stage.key);

  try {
    await Promise.all(
      stages.map((stage) =>
        client.send(
          new PutObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: stage.key,
            Body: stage.buffer,
            ContentType: stage.contentType,
            CacheControl: "private, no-store",
          }),
        ),
      ),
    );

    const manifest = manifestSchema.parse({
      version: MANIFEST_VERSION,
      runId: input.runId,
      storeId: input.storeId,
      operation: input.operation,
      createdAt: input.createdAt.toISOString(),
      sourceKey: input.sourceKey,
      outputKey: input.outputKey,
      totalDurationMs: Math.max(0, Math.round(input.totalDurationMs)),
      configuration: {
        aiModel: input.operation === "enhance" ? env.AI_IMAGE_MODEL?.trim() || "gpt-image-2" : null,
        aiQuality: input.operation === "enhance" ? (env.AI_IMAGE_QUALITY ?? "medium") : null,
        backgroundRemovalModel: "worker-managed",
      },
      stages: stages.map((stage) => ({
        id: stage.id,
        label: stage.label,
        key: stage.key,
        contentType: stage.contentType,
        byteSize: stage.buffer.byteLength,
        durationMs:
          stage.durationMs === undefined ? null : Math.max(0, Math.round(stage.durationMs)),
      })),
    });

    await client.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: getManifestKey(input.storeId, input.runId),
        Body: JSON.stringify(manifest),
        ContentType: "application/json",
        CacheControl: "private, no-store",
      }),
    );
  } catch (error) {
    if (uploadedKeys.length > 0) {
      await client
        .send(
          new DeleteObjectsCommand({
            Bucket: env.S3_BUCKET,
            Delete: {
              Objects: uploadedKeys.map((key) => ({ Key: key })),
              Quiet: true,
            },
          }),
        )
        .catch(() => undefined);
    }
    throw error;
  }
}

export async function listImageProcessingDebugRuns(
  storeId: string,
  limit = DEFAULT_LIST_LIMIT,
): Promise<ImageProcessingDebugRun[]> {
  if (!isImageProcessingDebugEnabled()) return [];

  const client = getStorageClient();
  const prefix = `${storeId}/${DEBUG_ROOT}/`;
  const manifestCandidates: { runId: string; lastModified: number }[] = [];
  let continuationToken: string | undefined;

  do {
    const result = await client.send(
      new ListObjectsV2Command({
        Bucket: env.S3_BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000,
      }),
    );

    for (const object of result.Contents ?? []) {
      if (!object.Key?.endsWith(`/${MANIFEST_FILENAME}`)) continue;

      const runId = object.Key.slice(prefix.length, -`/${MANIFEST_FILENAME}`.length);
      if (!isRunId(runId)) continue;

      manifestCandidates.push({
        runId,
        lastModified: object.LastModified?.getTime() ?? 0,
      });
    }

    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  const boundedLimit = Math.min(Math.max(Math.floor(limit), 1), MAX_LIST_LIMIT);
  const manifests = await Promise.all(
    manifestCandidates
      .sort((left, right) => right.lastModified - left.lastModified)
      .slice(0, boundedLimit)
      .map(({ runId }) => readManifest(storeId, runId)),
  );

  return manifests.filter((manifest): manifest is ImageProcessingDebugRun => manifest !== null);
}

export async function getImageProcessingDebugStage(
  storeId: string,
  runId: string,
  stageId: string,
): Promise<{ body: Readable; contentType: string; byteSize: number } | null> {
  const parsedStageId = stageIdSchema.safeParse(stageId);
  if (!parsedStageId.success) return null;

  const manifest = await readManifest(storeId, runId);
  const stage = manifest?.stages.find((candidate) => candidate.id === parsedStageId.data);
  if (!stage || !stage.key.startsWith(getRunPrefix(storeId, runId))) return null;

  try {
    const object = await getStorageClient().send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: stage.key,
      }),
    );
    if (!(object.Body instanceof Readable)) return null;

    return {
      body: object.Body,
      contentType: stage.contentType,
      byteSize: stage.byteSize,
    };
  } catch {
    return null;
  }
}
