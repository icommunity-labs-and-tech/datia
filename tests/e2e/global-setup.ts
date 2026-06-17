import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export default async function globalSetup() {
  const dbUrl = process.env.E2E_SQLITE_URL || process.env.DATABASE_URL || '';
  const isSqlite = !!process.env.E2E_SQLITE || dbUrl.startsWith('file:');
  const shouldReset = process.env.E2E_SQLITE_RESET === '1' || process.env.E2E_SQLITE_RESET === 'true';

  if (isSqlite && shouldReset) {
    try {
      // Remove existing sqlite file if present to force a clean start
      const dbPath = (process.env.E2E_SQLITE_URL || '').replace('file:', '') || 'playwright-e2e.db';
      const abs = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);
      if (fs.existsSync(abs)) {
        fs.unlinkSync(abs);
      }
      // Push schema for SQLite before running e2e using e2e prisma schema
      execSync('npx prisma db push --schema prisma/schema.e2e.prisma', { stdio: 'inherit' });
      
      // Bootstrap E2E users after schema is ready
      execSync('node scripts/bootstrap-e2e-users.mjs', { stdio: 'inherit' });
    } catch (err) {
      console.error('Failed to reset SQLite DB before E2E:', err);
      throw err;
    }
  }
}


