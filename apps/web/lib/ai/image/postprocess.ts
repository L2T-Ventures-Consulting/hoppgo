import sharp from "sharp";

import type { ProductImageFramingMode } from "@/lib/ai/image/framing";

export interface StandardizeOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  fillRatio?: number;
  framingStrategy?: "auto" | "recenter";
}

const ALPHA_THRESHOLD = 8;
const EDGE_CONTACT_RATIO = 0.015;

interface EdgeContacts {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

export interface StandardizedProductImage {
  buffer: Buffer;
  contentType: "image/webp";
  resolvedFramingMode: ProductImageFramingMode;
}

export async function standardizeProductImage(
  input: Buffer,
  options: StandardizeOptions = {},
): Promise<StandardizedProductImage> {
  const {
    canvasWidth = 1600,
    canvasHeight = 1200,
    fillRatio = 0.88,
    framingStrategy = "recenter",
  } = options;
  const source = sharp(input).ensureAlpha();

  // Manual alpha scanning avoids trim's dependency on the top-left pixel.
  const { data: alpha, info } = await source
    .clone()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  const edgeThresholdX = Math.max(1, Math.round(info.width * EDGE_CONTACT_RATIO));
  const edgeThresholdY = Math.max(1, Math.round(info.height * EDGE_CONTACT_RATIO));
  let leftEdgePixels = 0;
  let rightEdgePixels = 0;
  let topEdgePixels = 0;
  let bottomEdgePixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (alpha[y * info.width + x] <= ALPHA_THRESHOLD) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      if (x <= edgeThresholdX) leftEdgePixels += 1;
      if (x >= info.width - 1 - edgeThresholdX) rightEdgePixels += 1;
      if (y <= edgeThresholdY) topEdgePixels += 1;
      if (y >= info.height - 1 - edgeThresholdY) bottomEdgePixels += 1;
    }
  }

  if (maxX < minX || maxY < minY) throw new Error("empty_image");

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (width < 4 || height < 4) throw new Error("empty_image");

  // A few semi-transparent segmentation specks must not flip the decision.
  // Require a short continuous-looking contact area on at least one edge.
  const minVerticalContactPixels =
    (edgeThresholdX + 1) * Math.max(4, Math.round(info.height * EDGE_CONTACT_RATIO));
  const minHorizontalContactPixels =
    (edgeThresholdY + 1) * Math.max(4, Math.round(info.width * EDGE_CONTACT_RATIO));
  const contacts = {
    left: leftEdgePixels >= minVerticalContactPixels,
    right: rightEdgePixels >= minVerticalContactPixels,
    top: topEdgePixels >= minHorizontalContactPixels,
    bottom: bottomEdgePixels >= minHorizontalContactPixels,
  } satisfies EdgeContacts;
  const touchesEdge = contacts.left || contacts.right || contacts.top || contacts.bottom;
  const resolvedFramingMode: ProductImageFramingMode =
    framingStrategy === "auto" && touchesEdge ? "preserve" : "recenter";

  if (framingStrategy === "auto") {
    // The provider already composes its output on the requested 4:3 canvas.
    // Transparent space is part of that composition: trimming it can zoom a
    // wide product (a bike, for example) and cut the edges it already touches.
    const buffer = await source
      .clone()
      .resize({
        width: canvasWidth,
        height: canvasHeight,
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 90, alphaQuality: 90, effort: 4 })
      .toBuffer();

    return { buffer, contentType: "image/webp", resolvedFramingMode };
  }

  const { data: product, info: productInfo } = await source
    .clone()
    .extract({ left: minX, top: minY, width, height })
    .resize({
      width: Math.floor(canvasWidth * fillRatio),
      height: Math.floor(canvasHeight * fillRatio),
      fit: "inside",
      withoutEnlargement: false,
    })
    .toBuffer({ resolveWithObject: true });

  const buffer = await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: product,
        left: Math.round((canvasWidth - productInfo.width) / 2),
        top: Math.round((canvasHeight - productInfo.height) / 2),
      },
    ])
    .webp({ quality: 90, alphaQuality: 90, effort: 4 })
    .toBuffer();

  return { buffer, contentType: "image/webp", resolvedFramingMode };
}
