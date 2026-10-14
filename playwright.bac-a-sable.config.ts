import { defineConfig } from '@playwright/test'

// Bac à sable manuel (voir bac-a-sable/bac-a-sable.spec.ts) : pas un test automatique
export default defineConfig({
  testDir: './bac-a-sable',
  timeout: 0,
  workers: 1,
  reporter: [['line']],
  webServer: {
    command: 'npm run dev -- -p 3001',
    url: 'http://localhost:3001/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
