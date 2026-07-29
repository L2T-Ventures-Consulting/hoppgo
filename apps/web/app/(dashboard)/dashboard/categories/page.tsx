import { redirect } from "next/navigation";

/**
 * Categories are no longer a page of their own: they are managed from the
 * drawer on the products page. Old bookmarks land there.
 */
export default function CategoriesPage() {
  redirect("/dashboard/products");
}
