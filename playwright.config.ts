import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, retries: 0,
  // Reduced motion keeps E2E deterministic; tests/e2e/motion.spec.ts opts back in to check animations.
  use: { baseURL: 'http://127.0.0.1:3000', trace: 'retain-on-failure', reducedMotion: 'reduce' },
  webServer: { cwd: fileURLToPath(new URL('.', import.meta.url)), command: 'node tests/support/run-e2e-stack.mjs', url: 'http://127.0.0.1:3000', reuseExistingServer: false, timeout: 60000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
