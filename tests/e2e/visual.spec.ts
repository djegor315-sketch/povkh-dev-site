import { expect, test, type Page } from "@playwright/test";

const revealEditorialSections = async (page: Page) => {
  await page.addStyleTag({ content: ".editorial-homepage [data-section] { content-visibility: visible !important; }" });
  await page.locator("img").evaluateAll(async (images) => {
    const pageImages = images as HTMLImageElement[];
    for (const image of pageImages) image.loading = "eager";
    await Promise.all(pageImages.map((image) => image.complete
      ? Promise.resolve()
      : new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })));
  });
  await page.evaluate(() => document.fonts.ready);
};

test.beforeEach(async ({ page }, testInfo) => {
  testInfo.setTimeout(60_000);
  test.skip(testInfo.project.name !== "chromium", "one deterministic Chromium baseline");
  await page.addInitScript(() => localStorage.setItem("povkh-consent", "denied"));
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("EN homepage desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveScreenshot("home-en-desktop.png", { fullPage: true, animations: "disabled", timeout: 30_000 });
});

test("RU editorial homepage desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ru/");
  await expect(page).toHaveScreenshot("home-ru-editorial-desktop.png", { animations: "disabled", mask: [page.locator("[data-local-time]")], timeout: 30_000 });
});

test("RU homepage mobile with menu open", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/");
  await page.locator("[data-menu-toggle]").click();
  await page.locator(".site-nav").evaluate((element) => element.classList.add("is-compact"));
  await expect(page).toHaveScreenshot("home-ru-mobile-menu.png", { animations: "disabled", mask: [page.locator("[data-local-time]")], timeout: 30_000 });
});

test("RU problem cards preserve their visual grid on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ru/");
  await revealEditorialSections(page);
  await page.addStyleTag({ content: ".skip-link, .site-nav, .page-progress { display: none !important; }" });
  await expect(page.locator("#problems")).toHaveScreenshot("home-ru-problems-desktop.png", { animations: "disabled", timeout: 30_000 });
});

test("RU problem cards preserve their visual grid on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/");
  await revealEditorialSections(page);
  await page.addStyleTag({ content: ".skip-link, .site-nav, .page-progress { display: none !important; }" });
  await expect(page.locator("#problems")).toHaveScreenshot("home-ru-problems-mobile.png", { animations: "disabled", timeout: 30_000 });
});

test("RU editorial method at the desktop-to-tablet boundary", async ({ page }) => {
  await page.setViewportSize({ width: 897, height: 900 });
  await page.goto("/ru/");
  await revealEditorialSections(page);
  await page.locator(".skip-link").evaluate((element) => { (element as HTMLElement).style.display = "none"; });
  const processSystem = page.locator(".process-system");
  await processSystem.scrollIntoViewIfNeeded();
  await page.locator(".site-nav").evaluate((element) => element.classList.add("is-compact"));
  await expect(processSystem).toHaveScreenshot("home-ru-process-system-897.png", { animations: "disabled", timeout: 30_000 });
});

test("POVKH LAB X-ray internal state", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/work/povkh-lab/");
  await page.getByRole("button", { name: "System view" }).click();
  await page.addStyleTag({ content: ".skip-link { display: none !important; }" });
  await expect(page).toHaveScreenshot("povkh-lab-xray.png", { fullPage: true, animations: "disabled", mask: [page.locator("[data-local-time]")], timeout: 30_000 });
});

test("ENDOkey case desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ru/work/endokey/");
  await expect(page).toHaveScreenshot("endokey-ru-desktop.png", { fullPage: true, animations: "disabled", timeout: 30_000 });
});

test("ENDOkey case mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/work/endokey/");
  await expect(page).toHaveScreenshot("endokey-ru-mobile.png", { fullPage: true, animations: "disabled", timeout: 30_000 });
});

test("contact validation state mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/contact/");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(250);
  await expect(page).toHaveScreenshot("contact-validation-mobile.png", { fullPage: true, animations: "disabled", timeout: 30_000, maxDiffPixelRatio: 0.015 });
});

test("localized RU 404", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/visual-miss/");
  await expect(page).toHaveScreenshot("404-ru-mobile.png", { fullPage: true, animations: "disabled" });
});
