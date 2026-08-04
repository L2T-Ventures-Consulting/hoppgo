import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { getCurrentStore } from "@/lib/store-context";

import { WhatsNewPageContent } from "./whats-new-page-content";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function WhatsNewPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.whatsNew");

  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      <div className="min-w-0 space-y-1">
        <h1 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{t("title")}</h1>
        <p className="text-muted-foreground text-sm sm:text-base">{t("pageDescription")}</p>
      </div>

      <WhatsNewPageContent />
    </div>
  );
}
