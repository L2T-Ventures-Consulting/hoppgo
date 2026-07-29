import { redirect } from "next/navigation";

interface InventoryPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Inventory has been merged into the product page: a product's units, downtime
 * and history now live under `/dashboard/products/<id>`. Bookmarks and links
 * pointing at the old page keep working — when they named a product we land
 * straight on it, otherwise on the catalogue.
 */
export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;

  if (productId && /^[A-Za-z0-9_-]{21}$/.test(productId)) {
    redirect(`/dashboard/products/${productId}`);
  }

  redirect("/dashboard/products");
}
