import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";

import { ApiKeysPageContent } from "./api-keys-page-content";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

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
