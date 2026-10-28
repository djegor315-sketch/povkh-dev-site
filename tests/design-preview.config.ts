import { defineConfig } from "@playwright/test";
import base from "../playwright.config";

// Exercise the actively edited preview without interrupting the comparison server.
export default defineConfig({
  ...base,
  testDir: "./e2e",
  testIgnore: "**/visual.spec.ts",
  outputDir: "../artifacts/website-build/P-044/test-results",
  reporter: [["line"], ["json", { outputFile: "../artifacts/website-build/P-044/e2e-results.json" }]],
  workers: 3,
  use: { ...base.use, baseURL: "http://127.0.0.1:4322" },
  webServer: [],
});
