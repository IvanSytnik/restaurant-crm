'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { GeneralTab } from './GeneralTab'
import { LegalTab } from './LegalTab'
import { WorkingHoursTab } from './WorkingHoursTab'
import { BookingTab } from './BookingTab'
import type { ContactsMap } from '@/lib/contacts'

type WorkingHourRow = {
  dayOfWeek: number
  isOpen: boolean
  openTime: string
  closeTime: string
  lastBookingTime: string
}

type BookingMap = {
  duration_1_2: number
  duration_3_4: number
  duration_5_plus: number
  buffer_minutes: number
  booking_horizon: number
  min_guests: number
  max_guests: number
}

type Tab = 'general' | 'legal' | 'hours' | 'booking'

export function SettingsClient({
  initialContacts,
  initialWorkingHours,
  initialBooking,
}: {
  initialContacts: ContactsMap
  initialWorkingHours: WorkingHourRow[]
  initialBooking: BookingMap
}) {
  const t = useTranslations('settings')
  const [tab, setTab] = useState<Tab>('general')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'general', label: t('tabs.general') },
    { key: 'legal', label: t('tabs.legal') },
    { key: 'hours', label: t('tabs.hours') },
    { key: 'booking', label: t('tabs.booking') },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('subtitle')}</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-1 sm:gap-4">
          {tabs.map((tb) => {
            const active = tab === tb.key
            return (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`whitespace-nowrap border-b-2 px-2 py-3 text-sm font-medium transition-colors ${
                  active
                    ? 'border-gray-900 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tb.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div>
        {tab === 'general' && <GeneralTab initial={initialContacts} />}
        {tab === 'legal' && <LegalTab initial={initialContacts} />}
        {tab === 'hours' && <WorkingHoursTab initial={initialWorkingHours} />}
        {tab === 'booking' && <BookingTab initial={initialBooking} />}
      </div>
    </div>
  )
}
