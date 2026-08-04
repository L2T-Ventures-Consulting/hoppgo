import { redirect } from "next/navigation";

import { getTranslations } from "next-intl/server";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { getStorefrontUrl } from "@/lib/storefront-url";

import { EmbedCodeSection } from "./embed-code-section";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function WidgetIntegrationPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings.embed");
  const tHub = await getTranslations("dashboard.settings.integrationsHub");
  const embedUrl = getStorefrontUrl(store.slug, "/embed");

  return (
    <SettingsPageShell
      back={{ href: "/dashboard/settings/integrations", label: t("backToIntegrations") }}
      title={tHub("builtIn.widget.name")}
      description={t("description")}
    >
      <EmbedCodeSection embedUrl={embedUrl} storeName={store.name} />
    </SettingsPageShell>
  );
}
