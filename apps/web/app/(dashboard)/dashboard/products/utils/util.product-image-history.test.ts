import assert from "node:assert/strict";
import { test } from "node:test";

import {
  appendProductImageVersion,
  collectProductImageUrls,
  createInitialProductImageHistory,
  findProductImageHistory,
  removeProductImageHistory,
  removeProductImageVersion,
} from "./util.product-image-history";

test("keeps legacy images and every transformation in one history", () => {
  const initial = createInitialProductImageHistory(["/files/original.webp"]);
  const cropped = appendProductImageVersion(
    initial,
    "/files/original.webp",
    "/files/cropped.webp",
    "cropped",
  );
  const enhanced = appendProductImageVersion(
    cropped,
    "/files/cropped.webp",
    "/files/cropped-ai.webp",
    "ai-enhanced",
  );

  assert.deepEqual(
    findProductImageHistory(enhanced, "/files/cropped-ai.webp")?.versions.map(({ url }) => url),
    ["/files/original.webp", "/files/cropped.webp", "/files/cropped-ai.webp"],
  );
  assert.deepEqual(collectProductImageUrls(["/files/cropped-ai.webp"], enhanced), [
    "/files/cropped-ai.webp",
    "/files/original.webp",
    "/files/cropped.webp",
  ]);
});

test("removing a photo removes its complete version lineage", () => {
  const histories = createInitialProductImageHistory(["/files/first.webp", "/files/second.webp"]);

  assert.deepEqual(
    removeProductImageHistory(histories, "/files/first.webp").flatMap((history) =>
      history.versions.map(({ url }) => url),
    ),
    ["/files/second.webp"],
  );
});

test("removes one historical version but never the last version", () => {
  const initial = createInitialProductImageHistory(["/files/original.webp"]);
  const histories = appendProductImageVersion(
    initial,
    "/files/original.webp",
    "/files/original-ai.webp",
    "ai-enhanced",
  );
  const history = histories[0];
  assert.ok(history);

  const withoutAiVersion = removeProductImageVersion(
    histories,
    history.id,
    history.versions[1]?.id ?? "missing",
  );
  assert.deepEqual(
    withoutAiVersion[0]?.versions.map(({ url }) => url),
    ["/files/original.webp"],
  );

  const unchanged = removeProductImageVersion(
    withoutAiVersion,
    history.id,
    withoutAiVersion[0]?.versions[0]?.id ?? "missing",
  );
  assert.deepEqual(unchanged, withoutAiVersion);
});
