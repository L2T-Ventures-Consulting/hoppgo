import { redirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/** Analytics has no landing page of its own: sales is the default section. */
export default function AnalyticsPage() {
  redirect("/dashboard/analytics/sales");
}
