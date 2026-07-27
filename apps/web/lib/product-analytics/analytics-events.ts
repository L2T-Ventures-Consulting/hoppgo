export const productAnalyticsEvents = {
  productCreated: 'product_created',
  dashboardReservationCreated: 'dashboard_reservation_created',
  dashboardReservationCreationStarted: 'dashboard_reservation_creation_started',
  dashboardReservationStepValidationFailed:
    'dashboard_reservation_step_validation_failed',
  dashboardReservationCapacityBlocked: 'dashboard_reservation_capacity_blocked',
  dashboardReservationOverbookingConfirmed:
    'dashboard_reservation_overbooking_confirmed',
  dashboardReservationCreationFailed: 'dashboard_reservation_creation_failed',
  checkoutReservationCreated: 'checkout_reservation_created',
  checkoutStepViewed: 'checkout_step_viewed',
  checkoutStepValidationFailed: 'checkout_step_validation_failed',
  checkoutSubmitFailed: 'checkout_submit_failed',
  checkoutCompleted: 'checkout_completed',
  checkoutPaymentStarted: 'checkout_payment_started',
  checkoutPaymentCompleted: 'checkout_payment_completed',
  quoteAccepted: 'quote_accepted',
  quoteDeclined: 'quote_declined',
  onboardingStoreInfoSaved: 'onboarding_store_info_saved',
  onboardingCompleted: 'onboarding_completed',
  onboardingProfileCompleted: 'onboarding_profile_completed',
  onboardingStepViewed: 'onboarding_step_viewed',
  onboardingBrandingSaved: 'onboarding_branding_saved',
  onboardingStripeConnectStarted: 'onboarding_stripe_connect_started',
  onboardingSourceSkipped: 'onboarding_source_skipped',
  onboardingErrorShown: 'onboarding_error_shown',
  acquisitionChannelReported: 'acquisition_channel_reported',
} as const;

export type ProductAnalyticsEvent =
  (typeof productAnalyticsEvents)[keyof typeof productAnalyticsEvents];

export const productAnalyticsBaseProperties = {
  analytics_area: 'core_product',
  analytics_version: 1,
} as const;

// Shared by every onboarding event so funnels can be filtered on one pair of
// properties regardless of whether the event was captured client or server side.
export const onboardingAnalyticsBaseProperties = {
  ...productAnalyticsBaseProperties,
  feature: 'onboarding',
  surface: 'dashboard',
} as const;

export const dashboardReservationAnalyticsBaseProperties = {
  ...productAnalyticsBaseProperties,
  feature: 'reservation_creation',
  surface: 'dashboard',
} as const;

export const checkoutAnalyticsBaseProperties = {
  ...productAnalyticsBaseProperties,
  feature: 'checkout',
  surface: 'storefront',
} as const;
