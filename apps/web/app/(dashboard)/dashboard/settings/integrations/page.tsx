import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";

import { IntegrationsCatalogView } from "./components/integrations-catalog-view";

export default async function IntegrationsPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell title={t("integrations")} description={t("integrationsPage.description")}>
      <IntegrationsCatalogView />
    </SettingsPageShell>
  );
}
