import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { InspectionSettingsForm } from "./inspection-settings-form";

export default async function InspectionSettingsPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell title={t("inspection.title")} description={t("inspection.description")}>
      <InspectionSettingsForm store={store} />
    </SettingsPageShell>
  );
}
