/**
 * API routes answer errors as `{ error: CODE, params?: {...} }` where CODE is
 * a stable SCREAMING_SNAKE identifier. The client translates CODE through the
 * `apiErrors` namespace in messages/*.json, so wording never comes from the
 * server and all three admin languages stay in sync.
 */
export type ApiErrorBody = {
  error?: unknown
  params?: Record<string, string | number>
}

export type ApiError = { code: string; params: Record<string, string | number> }

/** Reads `{ error, params }` from a failed response without ever throwing. */
export async function readApiError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as ApiErrorBody
    if (typeof data?.error === 'string') {
      return { code: data.error, params: data.params ?? {} }
    }
  } catch {
    // non-JSON body (HTML error page, empty 405) — fall through
  }
  return { code: 'INTERNAL', params: {} }
}

type Translator = {
  (key: string, values?: Record<string, string | number>): string
  has: (key: string) => boolean
}

/** Message for an API error, falling back to the generic text for unknown codes. */
export function apiErrorMessage(t: Translator, err: ApiError): string {
  return t.has(err.code) ? t(err.code, err.params) : t('INTERNAL')
}
