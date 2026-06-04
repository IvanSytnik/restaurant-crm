import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('[email] RESEND_API_KEY is not set — emails will not be sent')
}

export const resend = apiKey ? new Resend(apiKey) : null

export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

export function isEmailEnabled(): boolean {
  return resend !== null
}
