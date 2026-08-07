/**
 * Renders every customer-facing email template to static HTML for visual
 * review in a browser — no mail server, no react-email preview app.
 *
 *   pnpm --filter @louez/web exec tsx scripts/preview-emails.ts [locale]
 *
 * Output: apps/web/.email-previews/<store>/<template>.html (gitignored).
 * Two fixture stores: one with a logo, one falling back to the wordmark with
 * a deliberately loud primary color — if a template looks right under both,
 * it looks right.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { render } from '@react-email/render'

import type { EmailLocale } from '../lib/email/i18n'
import { ContractEmail } from '../lib/email/templates/contract'
import { CustomMessageEmail } from '../lib/email/templates/custom-message'
import { DepositAuthorizationRequestEmail } from '../lib/email/templates/deposit-authorization-request'
import { InstantAccessEmail } from '../lib/email/templates/instant-access'
import { PaymentConfirmationEmail } from '../lib/email/templates/payment-confirmation'
import { PaymentFailedEmail } from '../lib/email/templates/payment-failed'
import { PaymentRequestEmail } from '../lib/email/templates/payment-request'
import { QuoteSentEmail } from '../lib/email/templates/quote-sent'
import { ReminderPickupEmail } from '../lib/email/templates/reminder-pickup'
import { ReminderReturnEmail } from '../lib/email/templates/reminder-return'
import { RequestAcceptedEmail } from '../lib/email/templates/request-accepted'
import { RequestReceivedEmail } from '../lib/email/templates/request-received'
import { RequestRejectedEmail } from '../lib/email/templates/request-rejected'
import { ReservationCancelledEmail } from '../lib/email/templates/reservation-cancelled'
import { ReservationCompletedEmail } from '../lib/email/templates/reservation-completed'
import { ReservationConfirmationEmail } from '../lib/email/templates/reservation-confirmation'
import { ReservationModifiedEmail } from '../lib/email/templates/reservation-modified'
import { RewardUnlockedEmail } from '../lib/email/templates/reward-unlocked'
import { ThankYouReviewEmail } from '../lib/email/templates/thank-you-review'
import { VerificationCodeEmail } from '../lib/email/templates/verification-code'

const locale = (process.argv[2] as EmailLocale) || 'fr'

async function main() {
const stores = [
  {
    slug: 'with-logo',
    storeName: 'Ar Mor Location',
    logoUrl: 'https://placehold.co/160x40/png?text=Ar+Mor',
    primaryColor: '#0e7490',
  },
  {
    slug: 'wordmark-loud',
    storeName: 'Vélo Ribine',
    logoUrl: null,
    primaryColor: '#16a34a',
  },
]

const startDate = new Date('2026-08-06T07:00:00.000Z')
const endDate = new Date('2026-08-09T16:00:00.000Z')
const items = [
  { name: 'Paddle géant', quantity: 2, unitPrice: 229, totalPrice: 458 },
  { name: 'Combinaison enfant', quantity: 1, unitPrice: 700, totalPrice: 700 },
]
const url = 'https://example.com/preview-link'

for (const store of stores) {
  const base = {
    storeName: store.storeName,
    logoUrl: store.logoUrl,
    primaryColor: store.primaryColor,
    storeEmail: 'contact@armor.example',
    storePhone: '+33 2 98 00 00 00',
    storeAddress: '2 quai du Port, 29900 Concarneau',
    storeTimezone: 'Europe/Paris',
    storeCountry: 'FR',
    customerFirstName: 'Tanguy',
    reservationNumber: '2026-0365',
    locale,
    currency: 'EUR',
  }

  const templates: Record<string, React.ReactElement> = {
    'reservation-confirmation': ReservationConfirmationEmail({
      ...base,
      startDate,
      endDate,
      items,
      subtotal: 1158,
      deposit: 100,
      total: 1258,
      reservationUrl: url,
    }),
    'request-received': RequestReceivedEmail({ ...base, startDate, endDate }),
    'request-accepted': RequestAcceptedEmail({
      ...base,
      startDate,
      endDate,
      items,
      total: 1158,
      deposit: 100,
      reservationUrl: url,
      contractUrl: url,
      termsUrl: url,
      paymentUrl: url,
    }),
    'request-rejected': RequestRejectedEmail({ ...base, reason: 'Matériel indisponible sur ces dates.' }),
    'quote-sent': QuoteSentEmail({
      ...base,
      startDate,
      endDate,
      items,
      total: 1158,
      reservationUrl: url,
    }),
    'reservation-modified': ReservationModifiedEmail({
      ...base,
      previousStartDate: new Date('2026-08-05T07:00:00.000Z'),
      previousEndDate: new Date('2026-08-08T16:00:00.000Z'),
      startDate,
      endDate,
      reservationUrl: url,
    }),
    'reservation-cancelled': ReservationCancelledEmail({
      ...base,
      startDate,
      endDate,
      reason: 'Annulation demandée par le client.',
      storefrontUrl: url,
    }),
    'reservation-completed': ReservationCompletedEmail({
      ...base,
      startDate,
      endDate,
      depositAmount: 100,
      depositReturned: true,
      storefrontUrl: url,
    }),
    'reminder-pickup': ReminderPickupEmail({
      ...base,
      startDate,
      reservationUrl: url,
      additionalMessage: 'Pensez à prévoir un coupe-vent, la brise se lève souvent.',
    }),
    'reminder-return': ReminderReturnEmail({ ...base, endDate }),
    'instant-access': InstantAccessEmail({
      ...base,
      startDate,
      endDate,
      items,
      totalAmount: 1258,
      accessUrl: url,
      showPaymentCta: true,
      additionalMessage: 'Demo message du loueur.',
    }),
    contract: ContractEmail({ ...base, contractUrl: url, additionalMessage: 'Signature avant vendredi svp.' }),
    'custom-message': CustomMessageEmail({
      ...base,
      message: 'Bonjour,\n\nvoici un petit mot personnalisé.\nÀ très vite !',
      reservationUrl: url,
    }),
    'payment-request-stripe': PaymentRequestEmail({
      ...base,
      amount: 1258,
      description: 'Solde de la réservation',
      paymentUrl: url,
      customMessage: 'Merci de régler avant le retrait.',
    }),
    'payment-request-manual': PaymentRequestEmail({
      ...base,
      amount: 1258,
      variant: 'manual',
      paymentUrl: url,
      customMessage: 'Merci de régler avant le retrait.',
    }),
    'payment-confirmation': PaymentConfirmationEmail({
      ...base,
      paymentAmount: 1258,
      paymentDate: startDate,
      paymentMethod: 'card',
      reservationUrl: url,
    }),
    'payment-failed': PaymentFailedEmail({
      ...base,
      paymentAmount: 1258,
      errorMessage: 'Carte expirée',
      paymentUrl: url,
    }),
    'deposit-authorization-request': DepositAuthorizationRequestEmail({
      ...base,
      depositAmount: 100,
      authorizationUrl: url,
      customMessage: 'Empreinte à faire avant jeudi.',
    }),
    'verification-code': VerificationCodeEmail({ ...base, code: '482913' }),
    'thank-you-review': ThankYouReviewEmail({ ...base, startDate, endDate, reviewUrl: url }),
    'reward-unlocked': RewardUnlockedEmail({
      ...base,
      storeLogoUrl: store.logoUrl,
      referredStoreName: 'Kayak & Co',
      kind: 'free_reservations',
      freeReservations: 5,
      rewardValue: '49€',
      ctaUrl: url,
    }),
  }

  // Run from apps/web (pnpm --filter @louez/web exec tsx scripts/preview-emails.ts)
  const outDir = join(process.cwd(), '.email-previews', store.slug)
  mkdirSync(outDir, { recursive: true })

  for (const [name, element] of Object.entries(templates)) {
    const html = await render(element)
    writeFileSync(join(outDir, `${name}.html`), html)
  }

  console.log(`${store.slug}: ${Object.keys(templates).length} templates → ${outDir}`)
}
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
