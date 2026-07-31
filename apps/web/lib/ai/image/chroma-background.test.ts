import assert from "node:assert/strict";
import { test } from "node:test";

import sharp from "sharp";

import {
  ChromaBackgroundError,
  type ChromaKeyColor,
  removeChromaBackground,
  selectChromaKeyColor,
} from "./chroma-background";

const CYAN = {
  id: "cyan",
  hex: "#00FFFF",
  rgb: [0, 255, 255],
} as const satisfies ChromaKeyColor;

test("selects a chroma color away from the source palette", async () => {
  const source = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 240, b: 0 },
    },
  })
    .png()
    .toBuffer();

  const selected = await selectChromaKeyColor(source);

  assert.notEqual(selected.id, "green");
});

test("removes edge-connected chroma and an enclosed background pocket", async () => {
  const source = await sharp({
    create: {
      width: 400,
      height: 300,
      channels: 3,
      background: { r: 0, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 400,
            height: 150,
            channels: 3,
            background: { r: 20, g: 20, b: 20 },
          },
        },
        left: 0,
        top: 75,
      },
      {
        input: {
          create: {
            width: 30,
            height: 30,
            channels: 3,
            background: { r: 4, g: 247, b: 250 },
          },
        },
        left: 185,
        top: 135,
      },
    ])
    .png()
    .toBuffer();

  const output = await removeChromaBackground(source, CYAN);
  const { data, info } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];

  assert.equal(alphaAt(200, 0), 0);
  assert.equal(alphaAt(0, 150), 255);
  assert.equal(alphaAt(200, 150), 0);
  assert.equal(alphaAt(170, 150), 255);
});

test("removes cyan spill from anti-aliased product edges", async () => {
  const source = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 10,
            height: 80,
            channels: 3,
            background: { r: 20, g: 20, b: 20 },
          },
        },
        left: 45,
        top: 10,
      },
      {
        input: {
          create: {
            width: 1,
            height: 80,
            channels: 3,
            background: { r: 10, g: 110, b: 110 },
          },
        },
        left: 45,
        top: 10,
      },
    ])
    .png()
    .toBuffer();

  const output = await removeChromaBackground(source, CYAN);
  const { data, info } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const pixelAt = (x: number, y: number) => {
    const offset = (y * info.width + x) * info.channels;
    return {
      red: data[offset],
      green: data[offset + 1],
      blue: data[offset + 2],
      alpha: data[offset + 3],
    };
  };

  const edge = pixelAt(45, 50);
  assert.ok(edge.alpha > 200);
  assert.equal(edge.red, 10);
  assert.equal(edge.green, 10);
  assert.equal(edge.blue, 10);
  assert.equal(pixelAt(44, 50).alpha, 0);
  assert.deepEqual(pixelAt(50, 50), { red: 20, green: 20, blue: 20, alpha: 255 });
});

test("removes chroma reflected inside a product", async () => {
  const source = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 0, g: 255, b: 255 },
    },
  })
    .composite([
      {
        input: {
          create: {
            width: 60,
            height: 80,
            channels: 3,
            background: { r: 30, g: 30, b: 30 },
          },
        },
        left: 20,
        top: 10,
      },
      {
        input: {
          create: {
            width: 10,
            height: 10,
            channels: 3,
            background: { r: 80, g: 150, b: 150 },
          },
        },
        left: 45,
        top: 45,
      },
    ])
    .png()
    .toBuffer();

  const output = await removeChromaBackground(source, CYAN);
  const { data, info } = await sharp(output)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const offset = (50 * info.width + 50) * info.channels;

  assert.deepEqual(Array.from(data.subarray(offset, offset + 4)), [80, 80, 80, 255]);
});

test("rejects an output that does not contain the requested chroma background", async () => {
  const source = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    removeChromaBackground(source, CYAN),
    (error) => error instanceof ChromaBackgroundError && error.code === "background_not_uniform",
  );
});
