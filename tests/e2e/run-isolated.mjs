#!/usr/bin/env node
/**
 * Isolated test runner that ensures clean state between test suites
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const testSuites = [
  'tests/e2e/admin.exports.spec.ts',
  'tests/e2e/admin.items.spec.ts',
  'tests/e2e/admin.kpis.spec.ts',
  'tests/e2e/admin.profile.spec.ts',
  'tests/e2e/admin.states.spec.ts',
  'tests/e2e/admin.users.spec.ts',
  'tests/e2e/auth-separated.spec.ts',
  'tests/e2e/auth.spec.ts',
  'tests/e2e/authenticated.spec.ts',
  'tests/e2e/basic.spec.ts',
  'tests/e2e/customer.passport.spec.ts',
  'tests/e2e/dashboard.spec.ts',
  'tests/e2e/profile.spec.ts',
  'tests/e2e/shared.a11y.spec.ts',
  'tests/e2e/shared.responsive.spec.ts',
  'tests/e2e/simple.spec.ts',
  'tests/e2e/ux-journeys.spec.ts',
];

function runTestSuite(suite) {
  console.log(`\n🧪 Running test suite: ${suite}`);
  console.log('='.repeat(50));
  
  try {
    execSync(`npx playwright test ${suite} --project=chromium --reporter=line`, {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: {
        ...process.env,
        E2E_SQLITE: '1',
        DATABASE_URL: 'file:./playwright-e2e.db',
        E2E_SQLITE_URL: 'file:./playwright-e2e.db',
      }
    });
    console.log(`✅ ${suite} passed`);
    return true;
  } catch (error) {
    console.log(`❌ ${suite} failed`);
    return false;
  }
}

function cleanupBetweenSuites() {
  console.log('\n🧹 Cleaning up between test suites...');
  
  // Clean up SQLite database
  // Prisma resolves the relative file: URL against prisma/, not the working directory.
  const dbPath = path.join(process.cwd(), 'prisma', 'playwright-e2e.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  
  // Reset database
  try {
    execSync('E2E_SQLITE_RESET=1 E2E_SQLITE=1 DATABASE_URL=file:./playwright-e2e.db E2E_SQLITE_URL=file:./playwright-e2e.db node tests/e2e/global-setup.ts', {
      stdio: 'inherit'
    });
  } catch (error) {
    console.warn('Warning: Could not reset database:', error.message);
  }
  
  // Wait a bit for cleanup
  return new Promise(resolve => setTimeout(resolve, 2000));
}

async function main() {
  console.log('🚀 Starting isolated E2E test run...');
  console.log(`📋 Running ${testSuites.length} test suites sequentially`);
  
  let passed = 0;
  let failed = 0;
  
  for (const suite of testSuites) {
    const success = runTestSuite(suite);
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
    
    // Clean up between suites to ensure isolation
    if (suite !== testSuites[testSuites.length - 1]) {
      await cleanupBetweenSuites();
    }
  }
  
  console.log('\n📊 Final Results:');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);


