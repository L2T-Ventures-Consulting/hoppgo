import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { getCurrentStore } from "@/lib/store-context";
import { BusinessHoursForm } from "./business-hours-form";

export default async function HoursPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");

  return (
    <SettingsPageShell title={t("hours")} description={t("businessHours.description")} width="wide">
      <BusinessHoursForm store={store} />
    </SettingsPageShell>
  );
}
