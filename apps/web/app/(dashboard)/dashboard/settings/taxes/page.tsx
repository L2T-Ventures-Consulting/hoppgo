import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { TaxSettingsForm } from "./tax-settings-form";

export default async function TaxSettingsPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell title={t("taxes.title")} description={t("taxes.description")}>
      <TaxSettingsForm store={store} />
    </SettingsPageShell>
  );
}
