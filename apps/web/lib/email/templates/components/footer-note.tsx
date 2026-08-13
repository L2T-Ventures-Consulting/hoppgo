import { Text } from '@react-email/components'
import type { ReactNode } from 'react'
import { emailTheme } from './theme'

/** A single quiet closing line (link validity, secure payment…). */
export function FooterNote({ children }: { children: ReactNode }) {
  return <Text style={footerNote}>{children}</Text>
}

const footerNote = {
  fontSize: '12px',
  lineHeight: '18px',
  color: emailTheme.colors.faint,
  textAlign: 'center' as const,
  margin: '24px 0 0 0',
}
