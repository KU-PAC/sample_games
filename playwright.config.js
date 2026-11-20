import { defineConfig } from '@playwright/test';
export default defineConfig({
  testMatch: '**/*.browser.spec.js', timeout: 45000, workers: 1,
  reporter: 'list', use: { headless: true, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  webServer: [
    { command: 'npx vite gomoku --host 127.0.0.1 --port 3100 --strictPort', url: 'http://127.0.0.1:3100', reuseExistingServer: false },
    { command: 'npx vite shooter --host 127.0.0.1 --port 3101 --strictPort', url: 'http://127.0.0.1:3101', reuseExistingServer: false },
    { command: 'npx vite survivor --host 127.0.0.1 --port 3102 --strictPort', url: 'http://127.0.0.1:3102', reuseExistingServer: false },
  ],
});
