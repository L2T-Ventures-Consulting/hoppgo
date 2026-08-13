import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import { standardizeProductImage } from "./postprocess";

const assertApproximately = (actual: number, expected: number) =>
  assert.ok(
    Math.abs(actual - expected) <= 1,
    `expected ${actual} to be within one pixel of ${expected}`,
  );

const getAlphaBounds = async (input: Buffer) => {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[y * info.width + x] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
};

const createProduct = ({ left, top }: { left: number; top: number }) =>
  sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 200,
            height: 150,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
        left,
        top,
      },
    ])
    .png()
    .toBuffer();

test("auto framing preserves a product that crosses image edges", async () => {
  const source = await createProduct({ left: 0, top: 150 });
  const result = await standardizeProductImage(source, {
    canvasWidth: 160,
    canvasHeight: 120,
    framingStrategy: "auto",
  });
  const bounds = await getAlphaBounds(result.buffer);

  assert.equal(result.resolvedFramingMode, "preserve");
  assert.equal(bounds.width, 160);
  assert.equal(bounds.height, 120);
  assert.equal(bounds.minX, 0);
  assertApproximately(bounds.maxX, 79);
  assertApproximately(bounds.minY, 60);
  assert.equal(bounds.maxY, 119);
});

test("auto framing preserves the provider composition on a single edge contact", async () => {
  const source = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 320,
            height: 280,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
        left: 40,
        top: 20,
      },
    ])
    .png()
    .toBuffer();

  const result = await standardizeProductImage(source, {
    canvasWidth: 160,
    canvasHeight: 120,
    framingStrategy: "auto",
  });
  const bounds = await getAlphaBounds(result.buffer);

  assert.equal(result.resolvedFramingMode, "preserve");
  assertApproximately(bounds.minX, 16);
  assertApproximately(bounds.maxX, 143);
  assertApproximately(bounds.minY, 8);
  assert.equal(bounds.maxY, 119);
});

test("auto framing preserves side gutters around vertical edge contacts", async () => {
  const source = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 240,
            height: 300,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
        left: 80,
        top: 0,
      },
    ])
    .png()
    .toBuffer();

  const result = await standardizeProductImage(source, {
    canvasWidth: 160,
    canvasHeight: 120,
    framingStrategy: "auto",
  });
  const bounds = await getAlphaBounds(result.buffer);

  assert.equal(result.resolvedFramingMode, "preserve");
  assertApproximately(bounds.minX, 32);
  assertApproximately(bounds.maxX, 127);
  assert.equal(bounds.minY, 0);
  assert.equal(bounds.maxY, 119);
});

test("auto framing does not crop a wide product touching both side edges", async () => {
  const source = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 400,
            height: 200,
            channels: 4,
            background: { r: 255, g: 0, b: 0, alpha: 1 },
          },
        },
        left: 0,
        top: 50,
      },
    ])
    .png()
    .toBuffer();

  const result = await standardizeProductImage(source, {
    canvasWidth: 160,
    canvasHeight: 120,
    framingStrategy: "auto",
  });
  const bounds = await getAlphaBounds(result.buffer);

  assert.equal(result.resolvedFramingMode, "preserve");
  assert.equal(bounds.minX, 0);
  assert.equal(bounds.maxX, 159);
  assertApproximately(bounds.minY, 20);
  assertApproximately(bounds.maxY, 99);
});

test("auto framing preserves a fully enclosed provider composition", async () => {
  const source = await createProduct({ left: 100, top: 75 });
  const result = await standardizeProductImage(source, {
    canvasWidth: 160,
    canvasHeight: 120,
    fillRatio: 0.5,
    framingStrategy: "auto",
  });
  const bounds = await getAlphaBounds(result.buffer);

  assert.equal(result.resolvedFramingMode, "recenter");
  assertApproximately(bounds.minX, 40);
  assertApproximately(bounds.maxX, 119);
  assertApproximately(bounds.minY, 30);
  assertApproximately(bounds.maxY, 89);
});

test("explicit recentering still trims and centers a detached product", async () => {
  const source = await createProduct({ left: 10, top: 20 });
  const result = await standardizeProductImage(source, {
    canvasWidth: 160,
    canvasHeight: 120,
    fillRatio: 0.5,
    framingStrategy: "recenter",
  });
  const bounds = await getAlphaBounds(result.buffer);

  assert.equal(result.resolvedFramingMode, "recenter");
  assert.equal(bounds.minX, 40);
  assert.equal(bounds.maxX, 119);
  assert.equal(bounds.minY, 30);
  assert.equal(bounds.maxY, 89);
});
