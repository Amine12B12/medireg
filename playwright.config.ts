import { defineConfig } from '@playwright/test'

// Tests de bout en bout : Supabase est entièrement simulé (e2e/faux-supabase.ts),
// aucune requête ne part vers la vraie base.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3001',
    locale: 'fr-FR',
  },
  webServer: {
    command: 'npm run dev -- -p 3001',
    url: 'http://localhost:3001/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
