import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'test@returnia.com' },
    update: {},
    create: {
      email: 'test@returnia.com',
      image: 'https://github.com/shadcn.png',
      // passwordHash: ... (if using credentials, we need a hash here. For now leaving null as if OAuth or incomplete profile)
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
