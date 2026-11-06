import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 60000,
  expect: { timeout: 15000 },
  testDir: './src/tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: 'node --import tsx src/tests/fixtures/supabase.ts',
      url: 'http://127.0.0.1:54328/health',
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --hostname 127.0.0.1 --port 3100',
      url: 'http://127.0.0.1:3100/login',
      reuseExistingServer: false,
      timeout: 120000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54328',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'sb_publishable_local_fixture',
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
});
