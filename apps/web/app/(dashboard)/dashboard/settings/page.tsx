import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { StoreSettingsForm } from "./store-settings-form";

export default async function SettingsPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell title={t("store")} description={t("storeSettings.description")}>
      <StoreSettingsForm store={store} stripeChargesEnabled={store.stripeChargesEnabled ?? false} />
    </SettingsPageShell>
  );
}
