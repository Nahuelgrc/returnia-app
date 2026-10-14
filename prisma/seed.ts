import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const seedPassword = process.env.SEED_PASSWORD
  if (!seedPassword || seedPassword.length < 10) {
    throw new Error('Set SEED_PASSWORD (minimum 10 characters) to run the seed')
  }
  const user = await prisma.user.upsert({
    where: { email: 'test@returnia.com' },
    update: {},
    create: {
      email: 'test@returnia.com',
      passwordHash: await bcrypt.hash(seedPassword, 12),
    },
  })
  
  console.log({ user })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
