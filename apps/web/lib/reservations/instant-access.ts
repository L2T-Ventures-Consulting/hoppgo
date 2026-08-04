import "server-only";

import { nanoid } from "nanoid";

import { db, verificationCodes } from "@louez/db";

import { getStorefrontUrl } from "@/lib/storefront-url";

const INSTANT_ACCESS_TOKEN_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export async function createReservationInstantAccessUrl({
  storeId,
  storeSlug,
  customerEmail,
  reservationId,
  redirectPath,
}: {
  storeId: string;
  storeSlug: string;
  customerEmail: string;
  reservationId: string;
  redirectPath?: string;
}): Promise<string> {
  const token = nanoid(64);
  const expiresAt = new Date(Date.now() + INSTANT_ACCESS_TOKEN_DURATION_MS);

  await db.insert(verificationCodes).values({
    id: nanoid(),
    email: customerEmail,
    storeId,
    code: "",
    type: "instant_access",
    token,
    reservationId,
    expiresAt,
    createdAt: new Date(),
  });

  const searchParams = new URLSearchParams({ token });
  if (redirectPath) {
    searchParams.set("redirect", redirectPath);
  }

  return getStorefrontUrl(storeSlug, `/r/${reservationId}?${searchParams.toString()}`);
}
