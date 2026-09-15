import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test",
  testMatch: "webview.spec.ts",
  use: { headless: true, viewport: { width: 1040, height: 820 } },
});
