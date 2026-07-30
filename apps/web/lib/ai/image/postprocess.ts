import sharp from "sharp";

export interface StandardizeOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  fillRatio?: number;
}

const ALPHA_THRESHOLD = 8;

export async function standardizeProductImage(
  input: Buffer,
  options: StandardizeOptions = {},
): Promise<{ buffer: Buffer; contentType: "image/webp" }> {
  const { canvasWidth = 1600, canvasHeight = 1200, fillRatio = 0.88 } = options;
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

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (alpha[y * info.width + x] <= ALPHA_THRESHOLD) continue;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  if (maxX < minX || maxY < minY) throw new Error("empty_image");

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;

  if (width < 4 || height < 4) throw new Error("empty_image");

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

  return { buffer, contentType: "image/webp" };
}
