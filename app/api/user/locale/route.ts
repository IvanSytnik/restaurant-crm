import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { locales } from '@/i18n/config'

const BodySchema = z.object({
  locale: z.enum(locales),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { locale } = BodySchema.parse(await req.json())

    await prisma.user.update({
      where: { id: session.user.id },
      data: { locale },
    })

    const response = NextResponse.json({ ok: true, locale })
    // Дублируем в cookie на случай, если пользователь выйдет — следующий заход
    // покажет ту же локаль ещё до логина.
    response.cookies.set('NEXT_LOCALE', locale, {
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      sameSite: 'lax',
    })
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 422 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
