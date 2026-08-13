import { Section, Text } from '@react-email/components'
import { BaseLayout } from './base-layout'
import { EmailHeading, EmailText, FooterNote, emailTheme, styles } from './components'
import { getEmailTranslations, type EmailLocale } from '../i18n'

interface VerificationCodeEmailProps {
  storeName: string
  logoUrl?: string | null
  primaryColor?: string
  storeEmail?: string | null
  storePhone?: string | null
  code: string
  locale?: EmailLocale
}

export function VerificationCodeEmail({
  storeName,
  logoUrl,
  primaryColor,
  storeEmail,
  storePhone,
  code,
  locale = 'fr',
}: VerificationCodeEmailProps) {
  const t = getEmailTranslations(locale)
  const messages = t.verificationCode

  return (
    <BaseLayout
      preview={messages.subject.replace('{code}', code)}
      storeName={storeName}
      logoUrl={logoUrl}
      primaryColor={primaryColor}
      storeEmail={storeEmail}
      storePhone={storePhone}
      locale={locale}
    >
      <EmailHeading>{messages.title}</EmailHeading>

      <EmailText>{messages.body.replace('{storeName}', storeName)}</EmailText>

      <Section style={{ ...styles.card, textAlign: 'center' as const }}>
        <Text style={codeText}>{code}</Text>
      </Section>

      <FooterNote>{messages.expiry}</FooterNote>
    </BaseLayout>
  )
}

const codeText = {
  fontSize: '26px',
  fontWeight: '700',
  letterSpacing: '6px',
  fontFamily: "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace",
  color: emailTheme.colors.ink,
  margin: '0',
}

export default VerificationCodeEmail
