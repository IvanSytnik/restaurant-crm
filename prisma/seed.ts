import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ── Owner ─────────────────────────────────────
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@restaurant.at'
  const ownerPassword = process.env.OWNER_PASSWORD || 'changeme123'
  const passwordHash = await bcrypt.hash(ownerPassword, 10)

  await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      name: 'Owner',
      password: passwordHash,
      role: 'OWNER',
      isActive: true,
    },
  })
  console.log(`✓ Owner создан: ${ownerEmail}`)

  // ── Столы ─────────────────────────────────────
  const tables = [
    { name: 'T1', capacity: 2, minCapacity: 1, zone: 'INDOOR' as const, posX: 20, posY: 30 },
    { name: 'T2', capacity: 3, minCapacity: 2, zone: 'INDOOR' as const, posX: 40, posY: 30 },
    { name: 'T3', capacity: 3, minCapacity: 2, zone: 'INDOOR' as const, posX: 60, posY: 30 },
    { name: 'T4', capacity: 4, minCapacity: 2, zone: 'INDOOR' as const, posX: 30, posY: 60 },
    { name: 'T5', capacity: 4, minCapacity: 2, zone: 'INDOOR' as const, posX: 60, posY: 60 },
  ]

  for (const t of tables) {
    await prisma.table.upsert({
      where: { name: t.name },
      update: {},
      create: t,
    })
  }
  console.log('✓ 5 столов созданы')

  // ── Рабочие часы 11:30–20:00 ──────────────────
  for (let day = 0; day <= 6; day++) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: day },
      update: {},
      create: {
        dayOfWeek: day,
        isOpen: true,
        openTime: '11:30',
        closeTime: '20:00',
        lastBookingTime: '18:45',
      },
    })
  }
  console.log('✓ Рабочие часы установлены')

  // ── Настройки ─────────────────────────────────
  const settings = [
    { key: 'duration_1_2',    value: '60'  },
    { key: 'duration_3_4',    value: '90'  },
    { key: 'duration_5_plus', value: '120' },
    { key: 'buffer_minutes',  value: '15'  },
    { key: 'booking_horizon', value: '60'  },
    { key: 'min_guests',      value: '1'   },
    { key: 'max_guests',      value: '4'   },
  ]
  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    })
  }
  console.log('✓ Настройки сохранены')

  console.log('\n✅ Seed завершён успешно')
  console.log(`   Войти: ${ownerEmail} / ${ownerPassword}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
