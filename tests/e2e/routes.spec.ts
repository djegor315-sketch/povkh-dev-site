import { expect, test } from "@playwright/test";
import { configureTestAnalytics } from "./helpers/analytics";

const cases = [
  {
    path: "/",
    language: "en",
    heading: "Websites shaped by the task. Not by a template.",
    equivalent: "/ru/",
    menuLabel: "Open menu",
  },
  {
    path: "/ru/",
    language: "ru",
    heading: "Создаём сайты с характером.",
    equivalent: "/",
    menuLabel: "Открыть меню",
  },
];

for (const { path, language, heading, equivalent, menuLabel } of cases) {
  test(`${path} is a prerendered preview route`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.ok()).toBe(true);
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex, nofollow",
    );
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /skip to content|перейти к содержанию/i }),
    ).toHaveAttribute("href", "#main-content");
    await expect(page.getByTestId("language-switch")).toHaveAttribute("href", equivalent);
    await expect(page.locator('nav[aria-label]').first()).toBeAttached();
  });

  test(`${path} mobile menu is keyboard operable`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const toggle = page.locator("[data-menu-toggle]");
    await expect(toggle).toHaveAccessibleName(menuLabel);
    await toggle.focus();
    await expect(toggle).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("primary-links")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });
}

test("reduced-motion preference is exposed as document state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduced");
});

test("page reflows without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/ru/");
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

const localizedRoutes = [
  ["/", "/ru/"],
  ["/work/", "/ru/work/"],
  ["/work/povkh-lab/", "/ru/work/povkh-lab/"],
  ["/work/endokey/", "/ru/work/endokey/"],
  ["/services/", "/ru/services/"],
  ["/process/", "/ru/process/"],
  ["/studio/", "/ru/studio/"],
  ["/blog/", "/ru/blog/"],
  ["/contact/", "/ru/contact/"],
  ["/privacy/", "/ru/privacy/"],
  ["/cookies/", "/ru/cookies/"],
] as const;

const russianOnlyRoutes = ["/ru/work/kzms/"] as const;

for (const route of russianOnlyRoutes) {
  test(`${route} exposes canonical Russian metadata without inventing an English equivalent`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.ok()).toBe(true);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", route);
    await expect(page.locator('link[rel="alternate"][hreflang="ru"]')).toHaveAttribute("href", route);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveCount(0);
  });
}

for (const [en, ru] of localizedRoutes) {
  test(`${en} and ${ru} expose reciprocal localized metadata`, async ({ page }) => {
    for (const [path, locale, alternate] of [[en, "en", ru], [ru, "ru", en]] as const) {
      const response = await page.goto(path);
      expect(response?.ok()).toBe(true);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", path);
      await expect(page.locator(`link[rel="alternate"][hreflang="${locale}"]`)).toHaveAttribute("href", path);
      await expect(page.locator(`link[rel="alternate"][hreflang="${locale === "en" ? "ru" : "en"}"]`)).toHaveAttribute("href", alternate);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/og\/povkh-dev-og\.png$/);
      await expect(page.locator('script[type="application/ld\+json"]')).toHaveCount(1);
    }
  });
}

test("preview robots denies crawling", async ({ request }) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBe(true);
  expect(await response.text()).toContain("Disallow: /");
});

test("legal routes expose their draft review boundary in preview", async ({ page }) => {
  await page.goto("/privacy/");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByText(/Draft for structure only/)).toBeVisible();
  await page.goto("/ru/cookies/");
  await expect(page.getByRole("heading", { level: 1, name: "Файлы cookie" })).toBeVisible();
  await expect(page.getByText(/Только структурный черновик/)).toBeVisible();
});

test("analytics stays inert before consent and after withdrawal", async ({ page }) => {
  await configureTestAnalytics(page);
  const analyticsRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/event")) analyticsRequests.push(request.url());
  });
  await page.goto("/");
  await expect(page.getByTestId("consent-controls")).toBeVisible();
  expect(analyticsRequests).toEqual([]);
  await page.getByRole("button", { name: "Accept analytics" }).click();
  await page.getByRole("button", { name: "Withdraw analytics consent" }).click();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("povkh:track", { detail: { name: "cta_click", surface: "home" } })));
  expect(analyticsRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem("povkh-consent"))).toBe("denied");
});

test("analytics sends only allowlisted non-PII fields after consent", async ({ page }) => {
  await configureTestAnalytics(page);
  const payloads: Record<string, unknown>[] = [];
  await page.route("**/api/event", async (route) => {
    payloads.push(JSON.parse(route.request().postData() ?? "{}"));
    await route.fulfill({ status: 202, body: "" });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Accept analytics" }).click();
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent("povkh:track", { detail: { name: "cta_click", surface: "home", email: "must-not-leak@example.org", freeText: "must not leak" } }));
    window.dispatchEvent(new CustomEvent("povkh:track", { detail: { name: "invented_event", surface: "home" } }));
  });
  await expect.poll(() => payloads.length).toBe(1);
  expect(payloads[0]).toEqual({ name: "cta_click", surface: "home" });
});

test("unconfigured analytics does not ask visitors for a meaningless consent", async ({ page }) => {
  await page.goto("/ru/");
  await expect(page.getByTestId("consent-controls")).toBeHidden();
});
