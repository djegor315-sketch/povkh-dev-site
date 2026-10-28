module.exports = {
  ci: {
    collect: {
      startServerCommand: "node scripts/performance-runner.mjs serve",
      startServerReadyPattern: "Server listening",
      url: [
        "http://127.0.0.1:4322/",
        "http://127.0.0.1:4322/work/povkh-lab/",
        "http://127.0.0.1:4322/services/",
        "http://127.0.0.1:4322/contact/",
      ],
      numberOfRuns: 1,
      // Use LHCI's supported Puppeteer runner because chrome-launcher's
      // temporary-profile cleanup currently fails on Windows after an audit.
      puppeteerScript: "./scripts/lighthouse-session.cjs",
      puppeteerLaunchOptions: {
        args: ["--no-sandbox"],
      },
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        // Preview builds intentionally emit noindex and relative canonical/hreflang.
        // Production discoverability is enforced separately by verify-build.mjs.
        skipAudits: ["is-crawlable", "canonical", "hreflang"],
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.95 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        "categories:seo": ["error", { minScore: 0.95 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
      },
    },
    upload: { target: "filesystem", outputDir: "./artifacts/lighthouse" },
  },
};
