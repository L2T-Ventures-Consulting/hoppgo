import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  IMAGE_PROCESSING_BENCHMARK_CASES,
  getImageProcessingBenchmarkCase,
} from "./benchmark-fixtures";

test("benchmark fixtures are unique and storeless", () => {
  assert.ok(IMAGE_PROCESSING_BENCHMARK_CASES.length >= 7);
  assert.equal(
    new Set(IMAGE_PROCESSING_BENCHMARK_CASES.map(({ id }) => id)).size,
    IMAGE_PROCESSING_BENCHMARK_CASES.length,
  );

  for (const fixture of IMAGE_PROCESSING_BENCHMARK_CASES) {
    if (fixture.source.kind === "remote") {
      const url = new URL(fixture.source.url);
      assert.equal(url.protocol, "https:");
      assert.equal(url.hostname, "louez-dev.s3.fr-par.scw.cloud");
      assert.ok(url.pathname.startsWith("/demo/ar-mor-location/products/"));
    } else {
      assert.ok(fixture.source.path.startsWith("/images/ai-image-benchmark/"));
      assert.equal(fixture.previewUrl, fixture.source.path);
    }
    assert.equal(getImageProcessingBenchmarkCase(fixture.id), fixture);
  }
});

test("unknown benchmark fixtures cannot be selected", () => {
  assert.equal(getImageProcessingBenchmarkCase("unknown"), null);
});

test("local benchmark fixtures are versioned public image assets", async () => {
  const localFixtures = IMAGE_PROCESSING_BENCHMARK_CASES.filter(
    (fixture) => fixture.source.kind === "public",
  );
  assert.equal(localFixtures.length, 2);

  for (const fixture of localFixtures) {
    if (fixture.source.kind !== "public") continue;
    const file = fileURLToPath(new URL(`../../../public${fixture.source.path}`, import.meta.url));
    const metadata = await stat(file);
    assert.ok(metadata.isFile());
    assert.ok(metadata.size > 0);
  }
});
