import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import { generateStoreMetadata, stripHtml } from "@/lib/seo";
import { db, stores } from "@louez/db";
import type { StoreSettings, StoreTheme } from "@louez/types";
import { eq } from "drizzle-orm";

import { StorefrontLayoutContent } from "./storefront-layout-content";

export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> => {
  const { slug } = await params;
  const store = await db.query.stores.findFirst({
    where: eq(stores.slug, slug),
  });

  if (!store || !store.onboardingCompleted) {
    return { title: "Boutique introuvable" };
  }

  const theme = (store.theme as StoreTheme) || {};
  const settings = (store.settings as StoreSettings) || {};

  return generateStoreMetadata(
    {
      id: store.id,
      name: store.name,
      slug: store.slug,
      description: store.description,
      email: store.email,
      phone: store.phone,
      address: store.address,
      latitude: store.latitude,
      longitude: store.longitude,
      logoUrl: store.logoUrl,
      settings,
      theme,
    },
    {
      description: store.description
        ? stripHtml(store.description)
        : `Location de matériel chez ${store.name}. Réservez facilement en ligne.`,
    },
  );
};

export const generateViewport = (): Viewport => ({
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
});

// Store existence, metadata, theme, and embed mode are resolved per request.
export const instant = false;

const StorefrontLayout = ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) => {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <StorefrontLayoutContent params={params}>{children}</StorefrontLayoutContent>
    </Suspense>
  );
};

export default StorefrontLayout;
