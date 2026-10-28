import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(({}, testInfo) => testInfo.setTimeout(90_000));

for (const path of ["/", "/ru/", "/work/endokey/", "/work/povkh-lab/", "/services/", "/contact/", "/ru/contact/", "/ru/missing/"]) {
  test(`${path} shell has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: "load" });
    await page.waitForTimeout(300);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("focus indicator changes the primary CTA outline", async ({ page }) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: "Discuss your project" }).first();
  await cta.focus();
  const outline = await cta.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
});

test("opened menu and signature state remain axe-clean", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("[data-menu-toggle]").click();
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Connect" }).click();
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Russian editorial menu and process state remain axe-clean", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/", { waitUntil: "load" });
  await page.locator("[data-menu-toggle]").click();
  const menuLinks = page.locator("#menu-panel .menu-list a[href]");
  await expect(menuLinks.first()).toBeFocused();
  await menuLinks.last().focus();
  await page.keyboard.press("Tab");
  await expect(menuLinks.first()).toBeFocused();
  await expect(page.locator("#main-content")).toHaveAttribute("inert", "");
  let results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Фокус/ }).click();
  await page.waitForTimeout(500);
  results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("Russian skip link bypasses the immersive navigation", async ({ page }) => {
  await page.goto("/ru/", { waitUntil: "load" });
  await page.locator(".skip-link").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await expect(page).toHaveURL(/#main-content$/);
});
