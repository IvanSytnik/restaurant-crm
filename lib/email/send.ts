import { render } from '@react-email/components'
import { format } from 'date-fns'
import { de as deLocale, enUS as enLocale, uk as ukLocale } from 'date-fns/locale'
import * as React from 'react'

import { prisma } from '@/lib/prisma'
import { getAllContacts } from '@/lib/contacts'
import { resend, FROM_EMAIL, isEmailEnabled } from './client'
import { toEmailLocale, emailStrings, type EmailLocale } from './i18n'

import { ConfirmationEmail } from './templates/ConfirmationEmail'
import { ReminderEmail } from './templates/ReminderEmail'
import { CancellationEmail } from './templates/CancellationEmail'

function fnsLocale(loc: EmailLocale) {
  if (loc === 'en') return enLocale
  if (loc === 'uk') return ukLocale
  return deLocale
}

function formatDate(date: Date, loc: EmailLocale): string {
  return format(date, 'EEEE, d MMMM yyyy', { locale: fnsLocale(loc) })
}

function formatTime(date: Date): string {
  return format(date, 'HH:mm')
}

/**
 * Returns true if guestEmail is a real email worth sending to.
 * The CRM form auto-fills `${phone}@phone.local` when guest didn't share email — skip those.
 */
function isRealGuestEmail(email: string | null | undefined): boolean {
  if (!email) return false
  if (!email.includes('@')) return false
  if (email.endsWith('@phone.local')) return false
  if (email.endsWith('@walkin.local')) return false
  return true
}

async function getRestaurantContext(loc: EmailLocale) {
  const c = await getAllContacts()
  const name =
    (loc === 'de' ? c.name_de : loc === 'en' ? c.name_en : c.name_uk) || c.name_de || 'Restaurant'

  const addressParts = [c.address, [c.postal_code, c.city].filter(Boolean).join(' '), c.country]
    .filter(Boolean)
    .join(', ')

  return {
    name,
    address: addressParts || null,
    phone: c.phone || null,
    email: c.email || null,
    website: process.env.NEXTAUTH_URL || null,
  }
}

// ─────────────────────────────────────────────
// Confirmation
// ─────────────────────────────────────────────

export async function sendConfirmation(reservationId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmailEnabled() || !resend) return { ok: false, reason: 'EMAIL_DISABLED' }

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestCount: true,
      comment: true,
      locale: true,
      date: true,
      startTime: true,
      confirmationSentAt: true,
      source: true,
      status: true,
      table: { select: { name: true } },
    },
  })
  if (!r) return { ok: false, reason: 'NOT_FOUND' }
  if (!isRealGuestEmail(r.guestEmail)) return { ok: false, reason: 'NO_EMAIL' }
  if (r.source === 'WALKIN') return { ok: false, reason: 'WALKIN_SKIP' }
  if (r.status === 'CANCELLED' || r.status === 'NO_SHOW') return { ok: false, reason: 'CANCELLED' }
  if (r.confirmationSentAt) return { ok: false, reason: 'ALREADY_SENT' }

  const loc = toEmailLocale(r.locale)
  const ctx = await getRestaurantContext(loc)
  const t = emailStrings.confirmation[loc]

  const element = React.createElement(ConfirmationEmail, {
    locale: loc,
    guestName: r.guestName,
    date: formatDate(r.date, loc),
    time: formatTime(r.startTime),
    guests: r.guestCount,
    tableName: r.table?.name || '-',
    comment: r.comment,
    restaurantName: ctx.name,
    restaurantAddress: ctx.address,
    restaurantPhone: ctx.phone,
    restaurantEmail: ctx.email,
    restaurantWebsite: ctx.website,
  })

  const html = await render(element)
  const text = await render(element, { plainText: true })

  try {
    const { error } = await resend.emails.send({
      from: `${ctx.name} <${FROM_EMAIL}>`,
      to: r.guestEmail,
      subject: t.subject,
      html,
      text,
    })
    if (error) {
      console.error('[email] confirmation send error', error)
      return { ok: false, reason: 'SEND_FAILED' }
    }

    await prisma.reservation.update({
      where: { id: r.id },
      data: { confirmationSentAt: new Date() },
    })
    return { ok: true }
  } catch (err) {
    console.error('[email] confirmation exception', err)
    return { ok: false, reason: 'EXCEPTION' }
  }
}

// ─────────────────────────────────────────────
// Reminder
// ─────────────────────────────────────────────

export async function sendReminder(reservationId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmailEnabled() || !resend) return { ok: false, reason: 'EMAIL_DISABLED' }

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestCount: true,
      locale: true,
      date: true,
      startTime: true,
      reminderSentAt: true,
      status: true,
      source: true,
      table: { select: { name: true } },
    },
  })
  if (!r) return { ok: false, reason: 'NOT_FOUND' }
  if (!isRealGuestEmail(r.guestEmail)) return { ok: false, reason: 'NO_EMAIL' }
  if (r.source === 'WALKIN') return { ok: false, reason: 'WALKIN_SKIP' }
  if (r.status === 'CANCELLED' || r.status === 'NO_SHOW' || r.status === 'COMPLETED') {
    return { ok: false, reason: 'BAD_STATUS' }
  }
  if (r.reminderSentAt) return { ok: false, reason: 'ALREADY_SENT' }

  const loc = toEmailLocale(r.locale)
  const ctx = await getRestaurantContext(loc)
  const t = emailStrings.reminder[loc]

  const element = React.createElement(ReminderEmail, {
    locale: loc,
    guestName: r.guestName,
    date: formatDate(r.date, loc),
    time: formatTime(r.startTime),
    guests: r.guestCount,
    tableName: r.table?.name || '-',
    restaurantName: ctx.name,
    restaurantAddress: ctx.address,
    restaurantPhone: ctx.phone,
    restaurantEmail: ctx.email,
    restaurantWebsite: ctx.website,
  })

  const html = await render(element)
  const text = await render(element, { plainText: true })

  try {
    const { error } = await resend.emails.send({
      from: `${ctx.name} <${FROM_EMAIL}>`,
      to: r.guestEmail,
      subject: t.subject,
      html,
      text,
    })
    if (error) {
      console.error('[email] reminder send error', error)
      return { ok: false, reason: 'SEND_FAILED' }
    }

    await prisma.reservation.update({
      where: { id: r.id },
      data: { reminderSentAt: new Date() },
    })
    return { ok: true }
  } catch (err) {
    console.error('[email] reminder exception', err)
    return { ok: false, reason: 'EXCEPTION' }
  }
}

// ─────────────────────────────────────────────
// Cancellation
// ─────────────────────────────────────────────

export async function sendCancellation(reservationId: string): Promise<{ ok: boolean; reason?: string }> {
  if (!isEmailEnabled() || !resend) return { ok: false, reason: 'EMAIL_DISABLED' }

  const r = await prisma.reservation.findUnique({
    where: { id: reservationId },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestCount: true,
      locale: true,
      date: true,
      startTime: true,
      source: true,
    },
  })
  if (!r) return { ok: false, reason: 'NOT_FOUND' }
  if (!isRealGuestEmail(r.guestEmail)) return { ok: false, reason: 'NO_EMAIL' }
  if (r.source === 'WALKIN') return { ok: false, reason: 'WALKIN_SKIP' }

  const loc = toEmailLocale(r.locale)
  const ctx = await getRestaurantContext(loc)
  const t = emailStrings.cancellation[loc]

  const element = React.createElement(CancellationEmail, {
    locale: loc,
    guestName: r.guestName,
    date: formatDate(r.date, loc),
    time: formatTime(r.startTime),
    guests: r.guestCount,
    restaurantName: ctx.name,
    restaurantAddress: ctx.address,
    restaurantPhone: ctx.phone,
    restaurantEmail: ctx.email,
    restaurantWebsite: ctx.website,
  })

  const html = await render(element)
  const text = await render(element, { plainText: true })

  try {
    const { error } = await resend.emails.send({
      from: `${ctx.name} <${FROM_EMAIL}>`,
      to: r.guestEmail,
      subject: t.subject,
      html,
      text,
    })
    if (error) {
      console.error('[email] cancellation send error', error)
      return { ok: false, reason: 'SEND_FAILED' }
    }
    return { ok: true }
  } catch (err) {
    console.error('[email] cancellation exception', err)
    return { ok: false, reason: 'EXCEPTION' }
  }
}
