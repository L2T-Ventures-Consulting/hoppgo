import sharp from "sharp";

const ANALYSIS_SIZE = 160;
const NEAR_COLOR_DISTANCE = 110;
const REQUEST_MATCH_DISTANCE = 140;
const MIN_MATCHING_BORDER_RATIO = 0.15;
const MIN_BACKGROUND_RATIO = 0.02;
const MAX_BACKGROUND_RATIO = 0.98;
const MIN_KEY_DISTANCE = 18;
const MAX_KEY_DISTANCE = 72;
const MIN_GLOBAL_KEY_DISTANCE = 36;
const EDGE_FEATHER_DISTANCE = 32;
const MIN_SPILL_CHANNEL_DELTA = 32;

export interface ChromaKeyColor {
  id: "green" | "magenta" | "cyan" | "blue";
  hex: string;
  rgb: readonly [number, number, number];
}

const CHROMA_KEY_COLORS = [
  { id: "green", hex: "#00FF00", rgb: [0, 255, 0] },
  { id: "magenta", hex: "#FF00FF", rgb: [255, 0, 255] },
  { id: "cyan", hex: "#00FFFF", rgb: [0, 255, 255] },
  { id: "blue", hex: "#0040FF", rgb: [0, 64, 255] },
] as const satisfies readonly ChromaKeyColor[];

export class ChromaBackgroundError extends Error {
  constructor(readonly code: "background_not_uniform" | "implausible_mask") {
    super(code);
    this.name = "ChromaBackgroundError";
  }
}

const colorDistanceSquared = (
  red: number,
  green: number,
  blue: number,
  target: readonly [number, number, number],
) => {
  const redDelta = red - target[0];
  const greenDelta = green - target[1];
  const blueDelta = blue - target[2];
  return redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
};

/**
 * Pick a saturated backdrop that is both rare in and far from the source.
 * The palette is deliberately finite so the prompt can name an exact color.
 */
export const selectChromaKeyColor = async (input: Buffer): Promise<ChromaKeyColor> => {
  const { data, info } = await sharp(input)
    .rotate()
    .resize({
      width: ANALYSIS_SIZE,
      height: ANALYSIS_SIZE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelCount = info.width * info.height;
  if (pixelCount === 0) throw new ChromaBackgroundError("implausible_mask");

  let selected: ChromaKeyColor = CHROMA_KEY_COLORS[0];
  let selectedScore = Number.NEGATIVE_INFINITY;
  const nearDistanceSquared = NEAR_COLOR_DISTANCE * NEAR_COLOR_DISTANCE;
  const maxDistanceSquared = 3 * 255 * 255;

  for (const candidate of CHROMA_KEY_COLORS) {
    let nearPixels = 0;
    let totalDistance = 0;

    for (let offset = 0; offset < data.length; offset += info.channels) {
      const distance = colorDistanceSquared(
        data[offset],
        data[offset + 1],
        data[offset + 2],
        candidate.rgb,
      );
      if (distance <= nearDistanceSquared) nearPixels += 1;
      totalDistance += distance;
    }

    const nearRatio = nearPixels / pixelCount;
    const meanDistance = totalDistance / pixelCount;
    // Similar pixels are riskier than a merely modest mean distance: penalize
    // them strongly so a product accent cannot become its own background key.
    const score = meanDistance - nearRatio * maxDistanceSquared * 4;
    if (score > selectedScore) {
      selected = candidate;
      selectedScore = score;
    }
  }

  return selected;
};

const median = (values: number[]) => {
  values.sort((left, right) => left - right);
  return values[Math.floor(values.length / 2)] ?? 0;
};

const percentile = (values: number[], ratio: number) => {
  values.sort((left, right) => left - right);
  return values[Math.min(values.length - 1, Math.floor(values.length * ratio))] ?? 0;
};

interface ChromaSpillModel {
  deltas: readonly number[];
  referenceChannels: readonly number[];
  spillChannels: readonly number[];
}

const createChromaSpillModel = (
  actualBackground: readonly [number, number, number],
): ChromaSpillModel => {
  const minimumBackgroundChannel = Math.min(...actualBackground);
  const spillChannels = [0, 1, 2].filter(
    (channel) => actualBackground[channel] - minimumBackgroundChannel >= MIN_SPILL_CHANNEL_DELTA,
  );
  const referenceChannels = [0, 1, 2].filter((channel) => !spillChannels.includes(channel));
  return {
    deltas: actualBackground.map((channel) => channel - minimumBackgroundChannel),
    referenceChannels,
    spillChannels,
  };
};

/**
 * Reconstruct a neutral foreground pixel blended with the chroma backdrop.
 * Subtract only the chromatic component shared by every saturated key channel,
 * so a red product remains red against a magenta key, for example.
 */
const suppressChromaSpill = (output: Buffer, offset: number, model: ChromaSpillModel) => {
  if (model.spillChannels.length === 0 || model.referenceChannels.length === 0) return;

  let reference = 0;
  for (const channel of model.referenceChannels) {
    reference = Math.max(reference, output[offset + channel]);
  }
  let spillFactor = Number.POSITIVE_INFINITY;

  for (const channel of model.spillChannels) {
    const backgroundDelta = model.deltas[channel];
    const pixelDelta = output[offset + channel] - reference;
    spillFactor = Math.min(spillFactor, pixelDelta / backgroundDelta);
  }

  if (!Number.isFinite(spillFactor) || spillFactor <= 0) return;

  for (const channel of model.spillChannels) {
    const backgroundDelta = model.deltas[channel];
    output[offset + channel] = Math.max(
      0,
      Math.round(output[offset + channel] - spillFactor * backgroundDelta),
    );
  }
};

/**
 * Remove the backdrop connected to the canvas edges, plus only the strongest
 * chroma matches elsewhere. The latter catches enclosed background pockets
 * (for example below a handle) without globally keying softer product colors.
 */
export const removeChromaBackground = async (
  input: Buffer,
  requestedColor: ChromaKeyColor,
): Promise<Buffer> => {
  const { data, info } = await sharp(input)
    .rotate()
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const pixelCount = width * height;
  if (pixelCount === 0) throw new ChromaBackgroundError("implausible_mask");

  const borderIndexes: number[] = [];
  for (let x = 0; x < width; x += 1) {
    borderIndexes.push(x, (height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    borderIndexes.push(y * width, y * width + width - 1);
  }

  const requestedMatchSquared = REQUEST_MATCH_DISTANCE * REQUEST_MATCH_DISTANCE;
  const matchingBorderIndexes = borderIndexes.filter((pixelIndex) => {
    const offset = pixelIndex * channels;
    return (
      colorDistanceSquared(data[offset], data[offset + 1], data[offset + 2], requestedColor.rgb) <=
      requestedMatchSquared
    );
  });
  if (matchingBorderIndexes.length / borderIndexes.length < MIN_MATCHING_BORDER_RATIO) {
    throw new ChromaBackgroundError("background_not_uniform");
  }

  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  for (const pixelIndex of matchingBorderIndexes) {
    const offset = pixelIndex * channels;
    reds.push(data[offset]);
    greens.push(data[offset + 1]);
    blues.push(data[offset + 2]);
  }
  const actualBackground = [median(reds), median(greens), median(blues)] as const;
  const matchingDistances = matchingBorderIndexes.map((pixelIndex) => {
    const offset = pixelIndex * channels;
    return Math.sqrt(
      colorDistanceSquared(data[offset], data[offset + 1], data[offset + 2], actualBackground),
    );
  });
  const keyDistance = Math.min(
    MAX_KEY_DISTANCE,
    Math.max(MIN_KEY_DISTANCE, percentile(matchingDistances, 0.9) + 10),
  );
  const keyDistanceSquared = keyDistance * keyDistance;

  const backgroundMask = new Uint8Array(pixelCount);
  const queue = new Int32Array(pixelCount);
  let queueStart = 0;
  let queueEnd = 0;
  const enqueueIfBackground = (pixelIndex: number) => {
    if (backgroundMask[pixelIndex] === 1) return;
    const offset = pixelIndex * channels;
    if (
      colorDistanceSquared(data[offset], data[offset + 1], data[offset + 2], actualBackground) >
      keyDistanceSquared
    ) {
      return;
    }
    backgroundMask[pixelIndex] = 1;
    queue[queueEnd] = pixelIndex;
    queueEnd += 1;
  };

  for (const pixelIndex of borderIndexes) enqueueIfBackground(pixelIndex);

  while (queueStart < queueEnd) {
    const pixelIndex = queue[queueStart];
    queueStart += 1;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    if (x > 0) enqueueIfBackground(pixelIndex - 1);
    if (x < width - 1) enqueueIfBackground(pixelIndex + 1);
    if (y > 0) enqueueIfBackground(pixelIndex - width);
    if (y < height - 1) enqueueIfBackground(pixelIndex + width);
  }

  // A flood fill cannot reach backdrop visible through a closed product shape.
  // The requested key was selected because it is rare in the source, so exact
  // and near-exact matches are safe to remove globally with a stricter limit.
  const globalKeyDistance = Math.max(MIN_GLOBAL_KEY_DISTANCE, keyDistance);
  const globalKeyDistanceSquared = globalKeyDistance * globalKeyDistance;
  let backgroundPixelCount = queueEnd;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    if (backgroundMask[pixelIndex] === 1) continue;
    const offset = pixelIndex * channels;
    if (
      colorDistanceSquared(data[offset], data[offset + 1], data[offset + 2], actualBackground) >
      globalKeyDistanceSquared
    ) {
      continue;
    }
    backgroundMask[pixelIndex] = 1;
    backgroundPixelCount += 1;
  }

  const backgroundRatio = backgroundPixelCount / pixelCount;
  if (backgroundRatio < MIN_BACKGROUND_RATIO || backgroundRatio > MAX_BACKGROUND_RATIO) {
    throw new ChromaBackgroundError("implausible_mask");
  }

  const output = Buffer.from(data);
  const spillModel = createChromaSpillModel(actualBackground);
  const featherLimit = keyDistance + EDGE_FEATHER_DISTANCE;
  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const offset = pixelIndex * channels;
    if (backgroundMask[pixelIndex] === 1) {
      output[offset + 3] = 0;
      continue;
    }

    // The key color is selected because it is absent from the source product.
    // GPT can nevertheless cast it onto reflective internal details, so remove
    // that directional color spill across the complete foreground, not merely
    // along the alpha edge.
    suppressChromaSpill(output, offset, spillModel);

    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const touchesBackground =
      (x > 0 && backgroundMask[pixelIndex - 1] === 1) ||
      (x < width - 1 && backgroundMask[pixelIndex + 1] === 1) ||
      (y > 0 && backgroundMask[pixelIndex - width] === 1) ||
      (y < height - 1 && backgroundMask[pixelIndex + width] === 1);
    if (!touchesBackground) continue;

    const distance = Math.sqrt(
      colorDistanceSquared(data[offset], data[offset + 1], data[offset + 2], actualBackground),
    );
    if (distance >= featherLimit) continue;
    output[offset + 3] = Math.min(
      output[offset + 3],
      Math.round(((distance - keyDistance) / EDGE_FEATHER_DISTANCE) * 255),
    );
  }

  return sharp(output, { raw: { width, height, channels } }).png().toBuffer();
};
