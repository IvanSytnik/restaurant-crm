import { Hr, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLayout, styles } from './EmailLayout'
import { emailStrings, type EmailLocale } from '../i18n'

export type CancellationProps = {
  locale: EmailLocale
  guestName: string
  date: string
  time: string
  guests: number
  restaurantName?: string | null
  restaurantAddress?: string | null
  restaurantPhone?: string | null
  restaurantEmail?: string | null
  restaurantWebsite?: string | null
}

export function CancellationEmail(props: CancellationProps) {
  const t = emailStrings.cancellation[props.locale]

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
      </div>

      <Hr style={styles.hr} />

      <Text style={styles.noteTitle}>{t.rebookTitle}</Text>
      <Text style={styles.noteBody}>{t.rebookBody}</Text>

      <Text style={styles.thanks}>{t.footerThanks}</Text>
    </EmailLayout>
  )
}

export default CancellationEmail
