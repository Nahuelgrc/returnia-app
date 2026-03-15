import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Successfully connected to database.');

    const userCount = await prisma.user.count();
    console.log(`User count: ${userCount}`);
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
