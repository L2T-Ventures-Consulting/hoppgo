import assert from "node:assert/strict";
import test from "node:test";

import { buildAbsoluteStorefrontUrl } from "./use-storefront-url";

test("keeps standalone URLs hydration-safe before the browser origin is available", () => {
  assert.equal(
    buildAbsoluteStorefrontUrl({
      domain: "localhost:3000",
      origin: "",
      standalone: true,
      storeSlug: "armor-location",
    }),
    "/",
  );

  assert.equal(
    buildAbsoluteStorefrontUrl({
      domain: "localhost:3000",
      origin: "http://localhost:3000",
      path: "/catalog",
      standalone: true,
      storeSlug: "armor-location",
    }),
    "http://localhost:3000/catalog",
  );
});

test("uses the store subdomain for platform deployments", () => {
  assert.equal(
    buildAbsoluteStorefrontUrl({
      domain: "louez.io",
      origin: "",
      path: "/catalog",
      standalone: false,
      storeSlug: "armor-location",
    }),
    "https://armor-location.louez.io/catalog",
  );
});

test("uses path routing for local platform development", () => {
  assert.equal(
    buildAbsoluteStorefrontUrl({
      domain: "127.0.0.1:3015",
      origin: "http://127.0.0.1:3015",
      standalone: false,
      storeSlug: "armor-location",
    }),
    "http://127.0.0.1:3015/armor-location",
  );
});
