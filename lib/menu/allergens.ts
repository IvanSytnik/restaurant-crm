/**
 * 14 стандартных аллергенов согласно регламенту ЕС 1169/2011.
 * В Австрии маркируются буквами A-P, R на упаковке и в меню.
 */

export const ALLERGEN_CODES = {
  GLUTEN:       'A',
  CRUSTACEANS:  'B',
  EGGS:         'C',
  FISH:         'D',
  PEANUTS:      'E',
  SOYBEANS:     'F',
  MILK:         'G',
  NUTS:         'H',
  CELERY:       'L',
  MUSTARD:      'M',
  SESAME:       'N',
  SULPHITES:    'O',
  LUPIN:        'P',
  MOLLUSCS:     'R',
} as const

export type AllergenKey = keyof typeof ALLERGEN_CODES

export const ALLERGEN_LIST: AllergenKey[] = [
  'GLUTEN', 'CRUSTACEANS', 'EGGS', 'FISH', 'PEANUTS',
  'SOYBEANS', 'MILK', 'NUTS', 'CELERY', 'MUSTARD',
  'SESAME', 'SULPHITES', 'LUPIN', 'MOLLUSCS',
]

/**
 * Возвращает код аллергена (A, B, C...) — одинаковый для всех языков.
 */
export function getAllergenCode(key: AllergenKey): string {
  return ALLERGEN_CODES[key]
}
