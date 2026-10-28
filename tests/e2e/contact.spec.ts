import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const localeCases = [
  { path: "/contact/", title: "Tell us about your project.", next: "Continue", submit: "Complete demo" },
  { path: "/ru/contact/", title: "Расскажите о проекте.", next: "Продолжить", submit: "Завершить демо" },
];

async function completeBrief(page: Page, labels = localeCases[0]) {
  await page.getByLabel(/Connected website|Сайт с интеграциями/).check();
  await page.getByLabel(/Project context|Контекст проекта/).fill("We need a bilingual site and a reliable lead workflow for our studio.");
  await page.getByRole("button", { name: labels.next }).click();
  await page.getByLabel(/Delivery window|Срок запуска/).selectOption("flexible");
  await page.getByLabel(/Project scope|Формат проекта/).selectOption("undecided");
  await page.getByRole("button", { name: labels.next }).click();
  await page.getByLabel(/Your name|Ваше имя/).fill("Alex Owner");
  await page.getByRole("textbox", { name: /^(Email|Электронная почта)$/ }).fill("alex@example.org");
  await page.getByLabel(/I understand|Я понимаю/).check();
}

test("Russian contact page remains readable at compact desktop widths", async ({ page }) => {
  await page.setViewportSize({ width: 890, height: 900 });
  await page.goto("/ru/contact/");
  const heading = page.getByRole("heading", { level: 1, name: "Расскажите о проекте." });
  await expect(heading).toBeVisible();
  const metrics = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(metrics.content).toBeLessThanOrEqual(metrics.viewport);
  expect((await heading.boundingBox())?.height ?? Infinity).toBeLessThan(240);
});

for (const locale of localeCases) {
  test(`${locale.path} exposes a keyboard-accessible three-step brief`, async ({ page }) => {
    await page.goto(locale.path);
    await expect(page.getByRole("heading", { level: 1, name: locale.title })).toBeVisible();
    await expect(page.getByTestId("brief-progress")).toContainText("1 / 3");
    await completeBrief(page, locale);
    await expect(page.getByTestId("brief-progress")).toContainText("3 / 3");
    await expect(page.getByRole("button", { name: locale.submit })).toBeVisible();
  });
}

test("preview form completes as a demo without sending personal data", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/contact", (route) => {
    requests += 1;
    return route.abort();
  });
  await page.goto("/contact/");
  await completeBrief(page);
  await page.getByRole("button", { name: "Complete demo" }).click();
  await expect(page.getByTestId("brief-success")).toBeVisible();
  await expect(page.getByTestId("brief-success")).toContainText("Demo complete");
  expect(requests).toBe(0);
});

test("rapid duplicate demo submit completes once without a request", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/contact", (route) => { requests += 1; return route.abort(); });
  await page.goto("/contact/");
  await completeBrief(page);
  const submit = page.getByRole("button", { name: "Complete demo" });
  await submit.dblclick();
  await expect(page.getByTestId("brief-success")).toBeVisible();
  expect(requests).toBe(0);
});

test("preview form cannot navigate or expose values without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/contact/");
  await expect(page.getByLabel(/I understand/)).toBeVisible();
  const submit = page.getByRole("button", { name: "Complete demo" });
  await expect(submit).toHaveAttribute("type", "button");
  await submit.click();
  await expect(page).toHaveURL(/\/contact\/$/);
  await context.close();
});

test("service context survives navigation and the visitor can download the completed brief", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/contact", (route) => { requests += 1; return route.abort(); });
  await page.goto("/ru/services/");
  await page.locator("#connect").getByRole("link", { name: "Обсудить интеграцию" }).click();
  await expect(page.getByLabel("Сайт с интеграциями", { exact: true })).toBeChecked();
  await completeBrief(page, localeCases[1]);
  await expect(page.locator("[data-brief-review]")).toContainText("Сайт с интеграциями");
  await page.getByRole("button", { name: "Завершить демо" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Скачать свой бриф" }).click();
  expect((await download).suggestedFilename()).toBe("povkh-project-brief.txt");
  expect(requests).toBe(0);
});

test("unknown URL context is ignored and opening the brief does not steal focus", async ({ page }) => {
  await page.goto("/ru/contact/?service=unknown&goal=unknown");
  await expect(page.locator('input[name="category"]:checked')).toHaveCount(0);
  await expect(page.locator('input[name="category"]').first()).not.toBeFocused();
});
