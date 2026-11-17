import { defineConfig, devices } from "@playwright/test";

// E2E tests need the local Supabase stack (`npx supabase start`) with the
// demo seed, and run against a production build.
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3100", locale: "he-IL", trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /purchase/ },
  ],
  webServer: {
    // A clean build: cached catalog entries from an earlier database must not leak in.
    command: "rm -rf .next && npm run build && npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 240_000,
  },
});
