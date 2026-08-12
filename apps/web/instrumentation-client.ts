/**
 * PostHog Client-Side Instrumentation
 *
 * This file is executed once on the client when the app loads.
 * It initializes PostHog with a host-aware configuration:
 *
 * - Dashboard (app.{APP_DOMAIN}, localhost): full analytics — cookies,
 *   session replay, autocapture — covered by the merchant relationship.
 * - Storefronts ({slug}.{APP_DOMAIN}) and marketing pages: consent-exempt
 *   audience measurement (CNIL) — nothing is written to the visitor's
 *   device (memory persistence), no replay, no autocapture, no heatmaps,
 *   anonymous events. This keeps merchant storefronts banner-free; widening
 *   any of it requires a consent banner.
 *
 * @see https://posthog.com/docs/libraries/next-js
 */

import posthog from 'posthog-js'

import { env } from '@/env'

const POSTHOG_DISTINCT_ID_FRAGMENT = 'ph_distinct_id'
const POSTHOG_SESSION_ID_FRAGMENT = 'ph_session_id'
const MAX_POSTHOG_ID_LENGTH = 200

type AcquisitionBootstrap = {
  distinctID: string
  isIdentifiedID: false
  sessionID?: string
}

function isValidPostHogId(value: string | null): value is string {
  return Boolean(
    value &&
      value.length <= MAX_POSTHOG_ID_LENGTH &&
      !Array.from(value).some((character) => {
        const codePoint = character.codePointAt(0)
        return codePoint !== undefined && (codePoint <= 31 || codePoint === 127)
      }),
  )
}

function hasPersistedPostHogIdentity(projectKey: string): boolean {
  const persistenceName = `ph_${projectKey}_posthog`

  try {
    if (window.localStorage.getItem(persistenceName)) {
      return true
    }
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }

  return document.cookie
    .split('; ')
    .some((cookie) => cookie.startsWith(`${persistenceName}=`))
}

function readAcquisitionBootstrap({
  isDashboard,
  projectKey,
}: {
  isDashboard: boolean
  projectKey: string
}): AcquisitionBootstrap | undefined {
  if (!isDashboard || hasPersistedPostHogIdentity(projectKey)) {
    return undefined
  }

  const fragment = new URLSearchParams(window.location.hash.slice(1))
  const distinctID = fragment.get(POSTHOG_DISTINCT_ID_FRAGMENT)
  const sessionID = fragment.get(POSTHOG_SESSION_ID_FRAGMENT)

  if (!isValidPostHogId(distinctID)) {
    return undefined
  }

  return {
    distinctID,
    isIdentifiedID: false,
    ...(isValidPostHogId(sessionID) ? { sessionID } : {}),
  }
}

function removeAcquisitionFragment() {
  const url = new URL(window.location.href)
  const fragment = new URLSearchParams(url.hash.slice(1))

  if (
    !fragment.has(POSTHOG_DISTINCT_ID_FRAGMENT) &&
    !fragment.has(POSTHOG_SESSION_ID_FRAGMENT)
  ) {
    return
  }

  fragment.delete(POSTHOG_DISTINCT_ID_FRAGMENT)
  fragment.delete(POSTHOG_SESSION_ID_FRAGMENT)
  url.hash = fragment.toString()
  window.history.replaceState(
    window.history.state,
    '',
    `${url.pathname}${url.search}${url.hash}`,
  )
}

function resolveSurface(): { isDashboard: boolean; storeSlug: string | null } {
  const hostname = window.location.hostname.toLowerCase()
  const baseDomain = (env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000')
    .split(':')[0]
    .toLowerCase()

  // Local development serves the dashboard (or a storefront preview) from
  // localhost; capture is opted out in development anyway.
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { isDashboard: true, storeSlug: null }
  }

  if (hostname === `app.${baseDomain}`) {
    return { isDashboard: true, storeSlug: null }
  }

  // {slug}.{APP_DOMAIN} is a storefront — mirrors the routing in proxy.ts
  if (hostname.endsWith(`.${baseDomain}`)) {
    const subdomain = hostname.slice(0, -(baseDomain.length + 1))
    if (subdomain && subdomain !== 'www') {
      return { isDashboard: false, storeSlug: subdomain }
    }
  }

  // Apex, www, or any other host: marketing/landing pages
  return { isDashboard: false, storeSlug: null }
}

if (typeof window !== 'undefined' && env.NEXT_PUBLIC_POSTHOG_KEY) {
  const { isDashboard, storeSlug } = resolveSurface()
  const acquisitionBootstrap = readAcquisitionBootstrap({
    isDashboard,
    projectKey: env.NEXT_PUBLIC_POSTHOG_KEY,
  })

  posthog.init(env.NEXT_PUBLIC_POSTHOG_KEY, {
    // Route analytics through our reverse proxy to avoid CORS and ad blockers
    // The proxy is configured in next.config.ts rewrites
    api_host: '/ingest',
    ui_host: 'https://eu.posthog.com',
    // Use recommended defaults for new projects (2025-11-30)
    defaults: '2025-11-30',
    // Only load in production to avoid polluting analytics with dev data
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') {
        // Disable in development - uncomment next line to debug locally
        // posthog.debug()
        posthog.opt_out_capturing()
      }
    },
    // Respect user privacy settings
    respect_dnt: true,
    // Disable automatic pageview capture - handled by PostHogProvider
    // for proper SPA navigation tracking in Next.js App Router
    capture_pageview: false,
    // Capture pageleaves for session duration
    capture_pageleave: true,
    ...(acquisitionBootstrap ? { bootstrap: acquisitionBootstrap } : {}),
    ...(isDashboard
      ? {
          // Scope the PostHog cookie to the dashboard host so merchant
          // storefronts on sibling subdomains never receive it
          cross_subdomain_cookie: false,
        }
      : {
          // Consent-exempt configuration: no cookie/localStorage, anonymous
          // events, no replay/autocapture/heatmaps. Changing any of these on
          // the storefront surface requires a consent banner (ePrivacy).
          persistence: 'memory',
          person_profiles: 'identified_only',
          autocapture: false,
          disable_session_recording: true,
          capture_heatmaps: false,
          capture_dead_clicks: false,
          disable_surveys: true,
        }),
  })

  // Surface is intentionally coarse and non-identifying. It keeps pageviews
  // segmentable without adding new storefront persistence or personal data.
  posthog.register({
    surface: isDashboard ? 'dashboard' : storeSlug ? 'storefront' : 'marketing',
    ...(storeSlug ? { store_slug: storeSlug } : {}),
    ...(env.NEXT_PUBLIC_APP_VERSION
      ? { $app_version: env.NEXT_PUBLIC_APP_VERSION }
      : {}),
  })

  removeAcquisitionFragment()
}

export default posthog
