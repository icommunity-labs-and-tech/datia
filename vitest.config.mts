import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    css: true,
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'src/test/**',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        'src/generated/**',
        'coverage/**',
        'playwright-report/**',
        'test-results/**',
        'tests/e2e/**',
        // CLI seed/dev utilities, run by hand or in e2e setup — not app code,
        // and without this they drag the figure down with nothing to test (#38).
        'scripts/**',
      ],
      // A floor at today's real coverage (#38), not the 60/60/50/60 goal that
      // nothing enforced: CI ran `vitest run` without `--coverage`, so that
      // number was never actually checked. This one is, and only moves up as
      // more tests land — never down to fit whatever a PR happens to add.
      //
      // Measured with `@vitest/coverage-v8` matched to vitest's own version —
      // mismatched (3.2.4 vs vitest's 3.2.7) silently produces wrong numbers,
      // which is what the first pass at this threshold was built on.
      thresholds: {
        lines: 15,
        functions: 60,
        branches: 70,
        statements: 15
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'server-only': path.resolve(__dirname, './src/test/mocks/server-only.ts'),
    },
  },
});
