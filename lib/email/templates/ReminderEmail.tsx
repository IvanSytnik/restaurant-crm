import { Hr, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './EmailLayout'
import { emailStrings, type EmailLocale } from '../i18n'

export type ReminderProps = {
  locale: EmailLocale
  guestName: string
  date: string
  time: string
  guests: number
  tableName: string
  restaurantName?: string | null
  restaurantAddress?: string | null
  restaurantPhone?: string | null
  restaurantEmail?: string | null
  restaurantWebsite?: string | null
}

export function ReminderEmail(props: ReminderProps) {
  const t = emailStrings.reminder[props.locale]

  return (
    <EmailLayout
      preview={t.preview}
      restaurantName={props.restaurantName}
      restaurantAddress={props.restaurantAddress}
      restaurantPhone={props.restaurantPhone}
      restaurantEmail={props.restaurantEmail}
      restaurantWebsite={props.restaurantWebsite}
    >
      <Text style={styles.h1}>{t.heading}</Text>
      <Text style={styles.greeting}>{t.greeting.replace('{name}', props.guestName)}</Text>
      <Text style={styles.intro}>{t.intro}</Text>

      <div style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>{t.detailsTitle}</Text>
        <Text style={styles.detailsRow}>
          <span style={styles.detailsLabel}>{t.labelDate}</span>{' '}
          <span style={styles.detailsValue}>{props.date}</span>
        </Text>
        <Text style={styles.detailsRow}>
          <span style={styles.detailsLabel}>{t.labelTime}</span>{' '}
          <span style={styles.detailsValue}>{props.time}</span>
        </Text>
        <Text style={styles.detailsRow}>
          <span style={styles.detailsLabel}>{t.labelGuests}</span>{' '}
          <span style={styles.detailsValue}>
            {props.guests} {t.guests}
          </span>
        </Text>
        <Text style={styles.detailsRow}>
          <span style={styles.detailsLabel}>{t.labelTable}</span>{' '}
          <span style={styles.detailsValue}>{props.tableName}</span>
        </Text>
      </div>

      <Hr style={styles.hr} />

      <Text style={styles.noteTitle}>{t.cantMakeItTitle}</Text>
      <Text style={styles.noteBody}>{t.cantMakeItBody}</Text>

      <Text style={styles.thanks}>{t.footerThanks}</Text>
    </EmailLayout>
  )
}

export default ReminderEmail
