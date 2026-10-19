import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { z } from 'zod'

/**
 * Turns an exception thrown inside an API route into the standard
 * `{ error: CODE }` response (see lib/api-error.ts). Known validation and
 * Prisma errors become 4xx codes; anything else is logged and returned as a
 * bare INTERNAL, so no Prisma message or stack ever reaches the client.
 *
 * `uniqueCode` names the clash for P2002 (e.g. SLUG_TAKEN).
 */
export function errorResponse(
  error: unknown,
  context: string,
  { uniqueCode = 'CONFLICT' }: { uniqueCode?: string } = {}
): NextResponse {
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: 'VALIDATION_ERROR', details: error.errors }, { status: 422 })
  }
  if (error instanceof SyntaxError) {
    // req.json() on a malformed body
    return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002': // unique constraint
        return NextResponse.json({ error: uniqueCode }, { status: 409 })
      case 'P2025': // record to update/delete not found
        return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
      case 'P2003': // foreign key points nowhere (e.g. unknown categoryId)
        return NextResponse.json({ error: 'VALIDATION_ERROR' }, { status: 422 })
    }
  }
  console.error(`[${context}]`, error)
  return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
}
