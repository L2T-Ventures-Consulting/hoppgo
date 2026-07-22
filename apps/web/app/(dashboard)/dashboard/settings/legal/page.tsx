import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { LegalPagesForm } from "./legal-pages-form";

export default async function LegalPagesPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell title={t("legal")} description={t("legalSettings.description")}>
      <LegalPagesForm store={store} />
    </SettingsPageShell>
  );
}
