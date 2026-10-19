import type { NextAuthOptions } from 'next-auth'
import type { Adapter } from 'next-auth/adapters'
import { PrismaAdapter } from '@auth/prisma-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import type { UserRole } from '@prisma/client'

// How long a role/isActive lookup is reused within one server instance.
const ACCOUNT_RECHECK_MS = 60_000
const accountCache = new Map<string, { role: UserRole; checkedAt: number }>()

/**
 * Current role of an active user, or null if the account was deactivated or
 * deleted. Cached per instance for ACCOUNT_RECHECK_MS, so deactivating a user
 * or changing their role takes effect within a minute instead of at JWT expiry.
 */
async function currentRole(userId: string): Promise<UserRole | null> {
  const hit = accountCache.get(userId)
  if (hit && Date.now() - hit.checkedAt < ACCOUNT_RECHECK_MS) return hit.role

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  })
  if (!user || !user.isActive) {
    accountCache.delete(userId)
    return null
  }
  accountCache.set(userId, { role: user.role, checkedAt: Date.now() })
  return user.role
}

/** Drop the cached lookup so a role/status change applies on this instance at once. */
export function forgetAccount(userId: string): void {
  accountCache.delete(userId)
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  // A shift-length session: staff devices are shared, so sign-ins should not
  // survive for the NextAuth default of 30 days.
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60 },
  pages: {
    signIn: '/admin/login',
    error: '/admin/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
        })

        if (!user || !user.password || !user.isActive) {
          return null
        }

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    // Runs only in the Node.js runtime (route handlers, server components via
    // getServerSession, /api/auth/*). middleware.ts uses withAuth, which just
    // decodes the cookie and never calls this callback, so the Prisma query
    // below never reaches the edge runtime.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: UserRole }).role
        return token
      }
      if (!token.id) return token

      const role = await currentRole(token.id)
      // Throwing makes NextAuth treat the session as invalid: getServerSession
      // returns null and /api/auth/session clears the cookie.
      if (!role) throw new Error('Account is inactive or no longer exists')
      token.role = role
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    },
  },
}
