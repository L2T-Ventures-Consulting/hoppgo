import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import { SettingsPageShell } from "@/components/dashboard/settings-page-shell";
import { isStripeConfigured } from "@/lib/plans";
import { getCurrentStore } from "@/lib/store-context";
import { PaymentsContent } from "./payments-content";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function PaymentsSettingsPage() {
  const store = await getCurrentStore();

  if (!store) {
    redirect("/onboarding");
  }

  const t = await getTranslations("dashboard.settings");
  const reservationMode = store.settings?.reservationMode ?? "request";

  return (
    <SettingsPageShell title={t("payments.title")} description={t("payments.description")}>
      <PaymentsContent
        stripeAccountId={store.stripeAccountId}
        stripeChargesEnabled={store.stripeChargesEnabled ?? false}
        stripeOnboardingComplete={store.stripeOnboardingComplete ?? false}
        reservationMode={reservationMode}
        stripeConfigured={isStripeConfigured()}
      />
    </SettingsPageShell>
  );
}
