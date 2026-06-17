// Swap Prisma client based on env for E2E (SQLite) vs default (Postgres)
import { PrismaClient as PgPrismaClient } from '../generated/prisma';
import { PrismaClient as SqlitePrismaClient } from '../generated/prisma-e2e';

// Configuración optimizada para producción
const globalForPrisma = globalThis as unknown as {
  prisma: PgPrismaClient | undefined;
};

const UseSqlite =
  process.env.E2E_SQLITE === '1' ||
  process.env.E2E_SQLITE === 'true' ||
  (process.env.DATABASE_URL?.startsWith('file:') ?? false);

// Create new Prisma client instance
const createPrismaClient = () => (UseSqlite 
  ? new SqlitePrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // For the SQLite e2e client, rely on its schema datasource env (E2E_SQLITE_URL)
    }) as unknown as PgPrismaClient
  : new PgPrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      // Solo configurar datasources si no estamos en build
      ...(process.env.DATABASE_URL && {
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
      }),
    }));

// Check if existing instance has required models, otherwise create new one
const existingPrisma = globalForPrisma.prisma;
const prismaInstance = existingPrisma && 
  'webhook' in existingPrisma && 
  'eventLog' in existingPrisma && 
  'apiToken' in existingPrisma &&
  'importJob' in existingPrisma
  ? existingPrisma
  : createPrismaClient();

export const prisma = prismaInstance;

// Solo conectar en producción y solo si no estamos en build
if (process.env.NODE_ENV === 'production' && process.env.DATABASE_URL && !process.env.NEXT_PHASE) {
  prisma.$connect().then(() => {
    console.log('Database connected successfully');
  }).catch((error) => {
    console.error('Database connection failed:', error);
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

const prismaClient = { prisma };
export default prismaClient;