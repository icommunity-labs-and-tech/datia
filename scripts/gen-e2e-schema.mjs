#!/usr/bin/env node
/**
 * Mirrors prisma/schema.prisma into prisma/schema.e2e.prisma for the SQLite
 * e2e harness, so the two never drift apart by hand.
 *
 * SQLite differences handled here:
 *  - provider/url/output swapped for the e2e client
 *  - scalar lists (`String[]`) are not supported → stored as a JSON string
 *
 * Run with: node scripts/gen-e2e-schema.mjs
 */
import fs from 'node:fs';

const SOURCE = 'prisma/schema.prisma';
const TARGET = 'prisma/schema.e2e.prisma';

const header = `// GENERATED FILE — do not edit by hand.
// Mirror of ${SOURCE} for the SQLite e2e harness.
// Regenerate with: node scripts/gen-e2e-schema.mjs
`;

let schema = fs.readFileSync(SOURCE, 'utf8');

schema = schema
  .replace(/generator client \{[\s\S]*?\n\}/, `generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma-e2e"
}`)
  .replace(/datasource db \{[\s\S]*?\n\}/, `datasource db {
  provider = "sqlite"
  url      = env("E2E_SQLITE_URL")
}`)
  // SQLite has no scalar lists — keep the column as a JSON-encoded string.
  // Only scalars: relation lists (`Item Item[]`) must stay lists.
  .replace(
    /^(\s+\w+\s+)(String|Int|Float|Boolean|DateTime|Json|Bytes|BigInt|Decimal)\[\](\s*)$/gm,
    '$1String?$3'
  )
  // Postgres-only native type attributes, if any are ever added.
  .replace(/\s@db\.\w+(\([^)]*\))?/g, '');

fs.writeFileSync(TARGET, header + '\n' + schema);
console.log(`Wrote ${TARGET} from ${SOURCE}`);
