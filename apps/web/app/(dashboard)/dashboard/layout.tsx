import { Suspense } from "react";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { db, users } from "@louez/db";
import type { StoreSettings } from "@louez/types";
import { Separator, SidebarInset, SidebarProvider } from "@louez/ui";

import { DashboardBreadcrumbs } from "@/components/dashboard/dashboard-breadcrumbs";
import { DashboardBreadcrumbsProvider } from "@/components/dashboard/dashboard-breadcrumbs-context";
import { DashboardHeaderActions } from "@/components/dashboard/dashboard-header-actions";
import { DashboardSidebarTrigger } from "@/components/dashboard/dashboard-sidebar-trigger";
import { ReservationPollingProvider } from "@/components/dashboard/reservation-polling-provider";
import { SettingsSearchFocus } from "@/components/dashboard/settings-search-focus";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { WelcomeOverlay } from "@/components/dashboard/welcome-overlay";
import { DashboardSaveShortcut } from "@/components/shared/dashboard-save-shortcut";
import { KeyboardShortcutsProvider } from "@/components/shared/keyboard-shortcuts-provider";
import { WhatsNewProvider } from "@/components/shared/whats-new-provider";

import { isAIChatConfigured } from "@/lib/ai/provider";
import { auth } from "@/lib/auth";
import { parseKeyboardShortcutOverrides } from "@/lib/keyboard-shortcuts";
import { getStoreLimits } from "@/lib/plan-limits";
import { isCurrentUserPlatformAdmin } from "@/lib/platform-admin";
import { getCurrentStore, getUserStores } from "@/lib/store-context";
import { getCurrentPlanSlug } from "@/lib/stripe/subscriptions";
import { parseWhatsNewProgress } from "@/lib/whats-new.progress";

import { StoreProvider } from "@/contexts/store-context";

export default async function DashboardMainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Get all user's stores
  const userStores = await getUserStores();

  // If no stores, redirect to onboarding
  if (userStores.length === 0) {
    redirect("/onboarding");
  }

  // Get current active store
  const store = await getCurrentStore();

  // If no store or onboarding not completed, redirect to onboarding
  if (!store || !store.onboardingCompleted) {
    redirect("/onboarding");
  }

  const settings = (store.settings as StoreSettings) || {};
  const showAIChat = isAIChatConfigured();

  // Get current plan for the store
  const [planSlug, limits, isPlatformAdmin, userPreferences] = await Promise.all([
    getCurrentPlanSlug(store.id),
    getStoreLimits(store.id),
    isCurrentUserPlatformAdmin(),
    db.query.users.findFirst({
      columns: {
        keyboardShortcuts: true,
        whatsNewProgress: true,
      },
      where: eq(users.id, session.user.id),
    }),
  ]);

  return (
    <KeyboardShortcutsProvider
      initialShortcuts={parseKeyboardShortcutOverrides(userPreferences?.keyboardShortcuts)}
    >
      <WhatsNewProvider initialProgress={parseWhatsNewProgress(userPreferences?.whatsNewProgress)}>
        <DashboardSaveShortcut />
        <StoreProvider
          currency={settings.currency || "EUR"}
          storeSlug={store.slug}
          storeName={store.name}
          timezone={settings.timezone}
        >
          <ReservationPollingProvider interval={30000}>
            <div className="dashboard relative h-svh overflow-hidden">
              <SidebarProvider className="h-full min-h-0 overflow-hidden">
                <DashboardBreadcrumbsProvider>
                  <DashboardSidebar
                    planSlug={planSlug}
                    stores={userStores}
                    currentStoreId={store.id}
                    storeSlug={store.slug}
                    userId={session.user.id}
                    userEmail={session.user.email || ""}
                    userImage={session.user.image}
                    isPlatformAdmin={isPlatformAdmin}
                  />
                  <SidebarInset className="min-h-0 min-w-0 overflow-clip">
                    <header className="bg-background/90 supports-backdrop-filter:bg-background/70 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-2.5 backdrop-blur">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <DashboardSidebarTrigger />
                        <Separator orientation="vertical" className="h-4 shrink-0" />
                        <DashboardBreadcrumbs />
                      </div>
                      <DashboardHeaderActions
                        showAIChat={showAIChat}
                        reservationLimits={limits.reservationsThisMonth}
                        planSlug={planSlug}
                        isPlatformAdmin={isPlatformAdmin}
                      />
                    </header>
                    <div
                      data-dashboard-content
                      className="min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain px-4 sm:px-6 lg:px-8"
                    >
                      <div className="min-h-full py-4 md:py-6">{children}</div>
                    </div>
                  </SidebarInset>
                </DashboardBreadcrumbsProvider>
              </SidebarProvider>
              <Suspense fallback={null}>
                <WelcomeOverlay />
                <SettingsSearchFocus />
              </Suspense>
            </div>
          </ReservationPollingProvider>
        </StoreProvider>
      </WhatsNewProvider>
    </KeyboardShortcutsProvider>
  );
}
