import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { AppearanceForm } from "./appearance-form";

export default async function AppearancePage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell
      title={t("appearance")}
      description={t("appearanceSettings.description")}
      width="wide"
    >
      <AppearanceForm store={store} />
    </SettingsPageShell>
  );
}
