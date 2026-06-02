'use client'

import { useState } from 'react'

type Lang = 'de' | 'en' | 'uk'

const LANG_LABELS: Record<Lang, { flag: string; name: string }> = {
  de: { flag: '🇩🇪', name: 'DE' },
  en: { flag: '🇬🇧', name: 'EN' },
  uk: { flag: '🇺🇦', name: 'UK' },
}

interface Props {
  values: { de: string; en: string | null; uk: string | null }
  onChange: (lang: Lang, value: string) => void
  onDEChange?: (value: string) => void  // отдельный callback для DE (например, для slug-генерации)
  label: string
  placeholder?: { de?: string; en?: string; uk?: string }
  multiline?: boolean
  requiredDE?: boolean
  rows?: number
}

/**
 * Языковые табы для редактирования полей вроде имени/описания на трёх языках.
 * DE — основное (обязательное), EN/UK — fallback на DE если пусто.
 */
export function LangTabs({
  values,
  onChange,
  onDEChange,
  label,
  placeholder = {},
  multiline = false,
  requiredDE = true,
  rows = 3,
}: Props) {
  const [active, setActive] = useState<Lang>('de')

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent'

  const handleChange = (value: string) => {
    if (active === 'de' && onDEChange) onDEChange(value)
    else onChange(active, value)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-gray-700">
          {label}{' '}
          {active === 'de' && requiredDE && <span className="text-red-500">*</span>}
          {active !== 'de' && (
            <span className="text-xs text-gray-400 font-normal ml-1">
              (fallback DE)
            </span>
          )}
        </label>

        <div className="flex gap-1">
          {(['de', 'en', 'uk'] as Lang[]).map((lang) => {
            const isActive = active === lang
            const hasValue = !!values[lang]
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setActive(lang)}
                className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : hasValue
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                }`}
              >
                <span>{LANG_LABELS[lang].flag}</span>
                <span>{LANG_LABELS[lang].name}</span>
                {hasValue && !isActive && <span className="w-1 h-1 rounded-full bg-green-500" />}
              </button>
            )
          })}
        </div>
      </div>

      {multiline ? (
        <textarea
          value={values[active] ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder[active]}
          required={active === 'de' && requiredDE}
          rows={rows}
          className={inputClass}
        />
      ) : (
        <input
          value={values[active] ?? ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder[active]}
          required={active === 'de' && requiredDE}
          className={inputClass}
        />
      )}
    </div>
  )
}
