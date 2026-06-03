import { prisma } from '@/lib/prisma'

/**
 * Returns true if the given userId is the only active OWNER in the system.
 * Used to prevent removing or deactivating the last OWNER.
 */
export async function isLastActiveOwner(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, isActive: true },
  })
  if (!user || user.role !== 'OWNER' || !user.isActive) return false

  const activeOwnerCount = await prisma.user.count({
    where: { role: 'OWNER', isActive: true },
  })
  return activeOwnerCount <= 1
}
