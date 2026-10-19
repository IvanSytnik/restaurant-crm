import { revalidatePath } from 'next/cache'

/**
 * Public pages (menu, gallery, promotions, landing, legal) are cached with
 * ISR (`revalidate = 300`). Admin routes that change what those pages show
 * call this after a successful write, so edits appear immediately instead of
 * after the revalidation window. Coarse on purpose: the whole public layout
 * is invalidated, which is cheap for a single restaurant.
 */
export function revalidatePublicSite(): void {
  revalidatePath('/[locale]', 'layout')
}
