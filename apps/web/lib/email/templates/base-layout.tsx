import {
  Body,
  Container,
  Head,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
  Link,
} from '@react-email/components'
import { getEmailTranslations, type EmailLocale } from '../i18n'
import { DEFAULT_PRIMARY_COLOR, emailTheme } from './components/theme'

interface BaseLayoutProps {
  preview: string
  storeName: string
  logoUrl?: string | null
  primaryColor?: string
  storeEmail?: string | null
  storePhone?: string | null
  storeAddress?: string | null
  locale?: EmailLocale
  children: React.ReactNode
}

/**
 * The shared shell of every store-branded email: white card, store logo (or
 * wordmark) over a primary-color hairline, content, slim footer. The postal
 * address deliberately stays out of the footer — it appears in the body of the
 * emails where the customer actually needs it (pickup information).
 */
export function BaseLayout({
  preview,
  storeName,
  logoUrl,
  primaryColor = DEFAULT_PRIMARY_COLOR,
  storeEmail,
  storePhone,
  locale = 'fr',
  children,
}: BaseLayoutProps) {
  const t = getEmailTranslations(locale)
  const baseLayout = t.baseLayout

  const contactParts = [
    storeEmail && (
      <Link key="email" href={`mailto:${storeEmail}`} style={footerLink}>
        {storeEmail}
      </Link>
    ),
    storePhone && (
      <Link key="phone" href={`tel:${storePhone}`} style={footerLink}>
        {storePhone}
      </Link>
    ),
  ].filter(Boolean)

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header: the store's mark over its one accent line */}
          <Section
            style={{
              ...header,
              borderBottom: `3px solid ${primaryColor}`,
            }}
          >
            {logoUrl ? (
              <Img
                src={logoUrl}
                alt={storeName}
                height={40}
                style={{ display: 'block', margin: '0 auto' }}
              />
            ) : (
              <Text style={{ ...logoText, color: primaryColor }}>{storeName}</Text>
            )}
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerStoreName}>{storeName}</Text>

            {contactParts.length > 0 && (
              <Text style={footerContactText}>
                {contactParts.map((part, index) => (
                  <span key={index}>
                    {index > 0 && ' · '}
                    {part}
                  </span>
                ))}
              </Text>
            )}

            <Hr style={hr} />

            <Text style={footerText}>{baseLayout.sentBy.replace('{storeName}', storeName)}</Text>
            <Text style={footerText}>{baseLayout.ignoreIfNotYou}</Text>

            <Text style={poweredBy}>
              {baseLayout.poweredBy}{' '}
              <Link href="https://louez.io" style={poweredByLink}>
                Louez.io
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: emailTheme.colors.bgPage,
  fontFamily: emailTheme.fontFamily,
}

const container = {
  backgroundColor: emailTheme.colors.card,
  margin: '0 auto',
  marginTop: '40px',
  marginBottom: '40px',
  maxWidth: '600px',
  borderRadius: '8px',
  overflow: 'hidden' as const,
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
}

const header = {
  padding: '28px 48px 24px',
  backgroundColor: emailTheme.colors.card,
  textAlign: 'center' as const,
}

const logoText = {
  fontSize: '20px',
  fontWeight: '600' as const,
  margin: '0',
  textAlign: 'center' as const,
}

const content = {
  padding: '36px 48px',
}

const footer = {
  padding: '24px 48px',
  backgroundColor: emailTheme.colors.bgFooter,
  borderTop: `1px solid ${emailTheme.colors.border}`,
}

const footerStoreName = {
  fontSize: '13px',
  fontWeight: '600' as const,
  color: emailTheme.colors.ink,
  margin: '0 0 4px 0',
  textAlign: 'center' as const,
}

const footerContactText = {
  fontSize: '12px',
  color: emailTheme.colors.muted,
  margin: '0',
  textAlign: 'center' as const,
}

const footerLink = {
  color: emailTheme.colors.muted,
  textDecoration: 'none' as const,
}

const hr = {
  borderColor: emailTheme.colors.border,
  margin: '16px 0',
}

const footerText = {
  fontSize: '11px',
  color: emailTheme.colors.faint,
  margin: '0 0 4px 0',
  textAlign: 'center' as const,
}

const poweredBy = {
  fontSize: '11px',
  color: emailTheme.colors.faint,
  margin: '12px 0 0 0',
  textAlign: 'center' as const,
}

const poweredByLink = {
  color: emailTheme.colors.muted,
  textDecoration: 'none' as const,
  fontWeight: '600' as const,
}
