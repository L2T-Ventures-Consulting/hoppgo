import { redirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * Categories are no longer a page of their own: they are managed from the
 * drawer on the products page. Old bookmarks land there.
 */
export default function CategoriesPage() {
  redirect("/dashboard/products");
}
