import type { CSSProperties } from 'react'

/**
 * Shared design tokens for every store-branded email. The store's primary
 * color is only ever used for the header accent, the wordmark, the CTA button
 * and links — everything else stays neutral so any store palette looks right.
 */
export const DEFAULT_PRIMARY_COLOR = '#0066FF'

export const emailTheme = {
  colors: {
    ink: '#111827',
    body: '#4b5563',
    muted: '#6b7280',
    faint: '#9ca3af',
    border: '#e5e7eb',
    bgSubtle: '#f9fafb',
    bgFooter: '#fafafa',
    bgPage: '#f6f9fc',
    card: '#ffffff',
  },
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
} as const

const { colors } = emailTheme

export const styles = {
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: colors.ink,
    margin: '0 0 20px 0',
  },
  paragraph: {
    fontSize: '14px',
    lineHeight: '22px',
    color: colors.body,
    margin: '0 0 16px 0',
  },
  small: {
    fontSize: '12px',
    lineHeight: '18px',
    color: colors.faint,
    margin: '0 0 8px 0',
  },
  label: {
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: colors.muted,
    margin: '0 0 4px 0',
  },
  value: {
    fontSize: '15px',
    fontWeight: '600',
    color: colors.ink,
    margin: '0',
  },
  amount: {
    fontSize: '20px',
    fontWeight: '700',
    color: colors.ink,
    margin: '0',
  },
  card: {
    backgroundColor: colors.bgSubtle,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '16px 20px',
    margin: '24px 0',
  },
  hr: {
    borderColor: colors.border,
    margin: '16px 0',
  },
} satisfies Record<string, CSSProperties>
