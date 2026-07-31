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
const MIN_LETTERBOX_GUTTER_RATIO = 0.03;

interface EdgeContacts {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * GPT sometimes respects a cropped edge but shrinks the subject on the other
 * axis. Build the tightest 4:3 crop around the alpha bounds and place any
 * unavoidable extra crop on an edge that was already intentionally cut.
 */
const getPreservedCrop = (input: {
  sourceWidth: number;
  sourceHeight: number;
  minX: number;
  minY: number;
  width: number;
  height: number;
  targetAspect: number;
  contacts: EdgeContacts;
}) => {
  const boundsAspect = input.width / input.height;
  let width: number;
  let height: number;

  if (boundsAspect < input.targetAspect) {
    width = input.width;
    height = Math.max(1, Math.round(width / input.targetAspect));
  } else {
    height = input.height;
    width = Math.max(1, Math.round(height * input.targetAspect));
  }

  width = Math.min(width, input.sourceWidth);
  height = Math.min(height, input.sourceHeight);

  let left = Math.round(input.minX + (input.width - width) / 2);
  let top = Math.round(input.minY + (input.height - height) / 2);

  if (width < input.width) {
    if (input.contacts.left && !input.contacts.right) left = input.sourceWidth - width;
    if (input.contacts.right && !input.contacts.left) left = 0;
  }
  if (height < input.height) {
    if (input.contacts.top && !input.contacts.bottom) top = input.sourceHeight - height;
    if (input.contacts.bottom && !input.contacts.top) top = 0;
  }

  return {
    left: clamp(left, 0, input.sourceWidth - width),
    top: clamp(top, 0, input.sourceHeight - height),
    width,
    height,
  };
};

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
    const minimumHorizontalGutter = Math.round(info.width * MIN_LETTERBOX_GUTTER_RATIO);
    const minimumVerticalGutter = Math.round(info.height * MIN_LETTERBOX_GUTTER_RATIO);
    const hasSideGutters =
      minX >= minimumHorizontalGutter && info.width - 1 - maxX >= minimumHorizontalGutter;
    const hasVerticalGutters =
      minY >= minimumVerticalGutter && info.height - 1 - maxY >= minimumVerticalGutter;
    const hasVerticalLetterbox = contacts.top && contacts.bottom && hasSideGutters;
    const hasHorizontalLetterbox = contacts.left && contacts.right && hasVerticalGutters;

    // GPT already composes its result on the requested 4:3 canvas. Preserve
    // that composition unless the alpha mask proves that it merely added
    // transparent gutters around a subject spanning two opposite edges.
    if (!hasVerticalLetterbox && !hasHorizontalLetterbox) {
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

    const crop = getPreservedCrop({
      sourceWidth: info.width,
      sourceHeight: info.height,
      minX,
      minY,
      width,
      height,
      targetAspect: canvasWidth / canvasHeight,
      contacts,
    });
    const buffer = await source
      .clone()
      .extract(crop)
      .resize({
        width: canvasWidth,
        height: canvasHeight,
        fit: "fill",
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
