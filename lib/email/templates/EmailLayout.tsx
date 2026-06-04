import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

type Props = {
  preview: string
  children: React.ReactNode
  restaurantName?: string | null
  restaurantAddress?: string | null
  restaurantPhone?: string | null
  restaurantEmail?: string | null
  restaurantWebsite?: string | null
}

const main: React.CSSProperties = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
  margin: 0,
  padding: 0,
}

const container: React.CSSProperties = {
  margin: '0 auto',
  padding: '40px 20px',
  maxWidth: '560px',
}

const card: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  padding: '40px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
}

const footer: React.CSSProperties = {
  textAlign: 'center',
  padding: '24px 16px 8px',
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '18px',
}

const footerStrong: React.CSSProperties = {
  ...footer,
  color: '#6b7280',
  fontWeight: 600,
  fontSize: '13px',
  paddingBottom: '4px',
}

export function EmailLayout({
  preview,
  children,
  restaurantName,
  restaurantAddress,
  restaurantPhone,
  restaurantEmail,
  restaurantWebsite,
}: Props) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={card}>{children}</Section>

          <Section>
            {restaurantName && <Text style={footerStrong}>{restaurantName}</Text>}
            <Text style={footer}>
              {restaurantAddress && <>{restaurantAddress}<br /></>}
              {restaurantPhone && <>{restaurantPhone}{restaurantEmail ? ' · ' : ''}</>}
              {restaurantEmail && <>{restaurantEmail}</>}
              {restaurantWebsite && <><br />{restaurantWebsite}</>}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Shared style tokens for templates
export const styles = {
  h1: {
    color: '#111827',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 16px',
    lineHeight: '32px',
  } as React.CSSProperties,
  greeting: {
    color: '#111827',
    fontSize: '16px',
    margin: '0 0 8px',
  } as React.CSSProperties,
  intro: {
    color: '#374151',
    fontSize: '15px',
    lineHeight: '24px',
    margin: '0 0 24px',
  } as React.CSSProperties,
  detailsCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    padding: '20px',
    margin: '24px 0',
  } as React.CSSProperties,
  detailsTitle: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    margin: '0 0 12px',
  } as React.CSSProperties,
  detailsRow: {
    margin: '0 0 8px',
    fontSize: '15px',
    lineHeight: '22px',
  } as React.CSSProperties,
  detailsLabel: {
    color: '#6b7280',
    display: 'inline-block',
    minWidth: '80px',
  } as React.CSSProperties,
  detailsValue: {
    color: '#111827',
    fontWeight: 600,
  } as React.CSSProperties,
  noteTitle: {
    color: '#111827',
    fontSize: '15px',
    fontWeight: 600,
    margin: '24px 0 4px',
  } as React.CSSProperties,
  noteBody: {
    color: '#6b7280',
    fontSize: '14px',
    lineHeight: '22px',
    margin: '0 0 8px',
  } as React.CSSProperties,
  hr: {
    borderColor: '#e5e7eb',
    margin: '24px 0',
  } as React.CSSProperties,
  thanks: {
    color: '#111827',
    fontSize: '15px',
    fontWeight: 500,
    margin: '24px 0 0',
  } as React.CSSProperties,
}
