import { PrismaClient } from '@prisma/client';
import { resetToCanonicalSeed } from '../src/services/seedService';

const prisma = new PrismaClient();

export async function seed(prismaClient: PrismaClient) {
  return resetToCanonicalSeed(prismaClient);
}

if (process.env.NODE_ENV !== 'test') {
  resetToCanonicalSeed(prisma)
    .then(() => console.log('✅ Canonical database seeded successfully.'))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
