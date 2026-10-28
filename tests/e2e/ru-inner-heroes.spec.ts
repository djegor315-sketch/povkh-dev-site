import { expect, test } from "@playwright/test";

const routes = [
  { route: "/ru/services/", hero: '[data-editorial-hero="services"]' },
  { route: "/ru/process/", hero: '[data-editorial-hero="process"]' },
  { route: "/ru/work/", hero: '[data-editorial-hero="work"]' },
  { route: "/ru/studio/", hero: '[data-editorial-image="studio"]' },
  { route: "/ru/blog/", hero: '[data-editorial-image="blog"]' },
  { route: "/ru/contact/", hero: ".contact-next", minHeight: 80 },
  { route: "/ru/privacy/", hero: "[data-inner-hero-signal]" },
  { route: "/ru/cookies/", hero: "[data-inner-hero-signal]" },
  { route: "/ru/404/", hero: "[data-inner-hero-signal]" },
] as const;

for (const entry of routes) {
  const { route, hero } = entry;
  test(`${route} has a composed route-specific first screen`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(route, { waitUntil: "load" });
    const heroVisual = page.locator(hero).first();
    await expect(heroVisual).toBeVisible();
    const bounds = await heroVisual.boundingBox();
    expect(bounds?.height ?? 0).toBeGreaterThan("minHeight" in entry ? entry.minHeight : 180);
    expect(bounds?.y ?? 1000).toBeLessThan(650);
  });
}
