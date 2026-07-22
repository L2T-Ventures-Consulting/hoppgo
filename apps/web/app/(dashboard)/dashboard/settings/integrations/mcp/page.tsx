import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";

import { ApiKeysPageContent } from "./api-keys-page-content";

export default async function McpIntegrationPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings.api");
  const tHub = await getTranslations("dashboard.settings.integrationsHub");

  return (
    <SettingsPageShell
      back={{ href: "/dashboard/settings/integrations", label: t("backToIntegrations") }}
      title={tHub("builtIn.mcp.name")}
      description={t("description")}
    >
      <ApiKeysPageContent />
    </SettingsPageShell>
  );
}
