import { expect, test } from "@playwright/test";

const locales = [
  {
    path: "/",
    title: "Websites shaped by the task. Not by a template.",
    primary: "Discuss your project",
    contact: "/contact/",
    cases: [["ENDOkey", "/work/endokey/"], ["POVKH LAB", "/work/povkh-lab/"]],
  },
  {
    path: "/ru/",
    title: "Создаём сайты с характером.",
    primary: "Разобрать задачу",
    contact: "/ru/contact/",
    cases: [["КЗМС", "/ru/work/kzms/"], ["ENDOkey", "/ru/work/endokey/"]],
  },
];

for (const locale of locales) {
  test(`${locale.path} communicates offer, proof and action in order`, async ({ page }) => {
    await page.goto(locale.path);
    await expect(page.getByRole("heading", { level: 1, name: locale.title })).toBeVisible();
    await expect(page.getByRole("link", { name: locale.primary }).first()).toHaveAttribute("href", locale.contact);
    const selectedWork = locale.path === "/ru/"
      ? page.locator('[data-section="proof"]')
      : page.getByTestId("hero-selected-work");
    await expect(selectedWork.locator("[data-case-card], .atlas-shot")).toHaveCount(locale.path === "/ru/" ? 4 : 3);
    for (const [name, href] of locale.cases) {
      await expect(selectedWork.getByRole("link", { name: new RegExp(name, "i") }).last()).toHaveAttribute("href", href);
    }
    await expect(page.getByTestId("hero-explorer")).toHaveCount(0);
    await expect(page.getByTestId("proof-strip")).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText(/Public founder profiles will appear|Публичные профили появятся/);

    const order = await page.locator("[data-section]").evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("data-section")),
    );
    expect(order).toEqual(locale.path === "/ru/"
      ? ["problems", "proof", "method", "result", "final-cta"]
      : expect.arrayContaining(["signature", "process", "studio-summary", "final-cta"]));
  });
}

test("signature options expose keyboard-selectable state and contextual result", async ({ page }) => {
  await page.goto("/");
  const signature = page.getByTestId("signature");
  const launch = signature.getByRole("button", { name: "Launch" });
  const reframe = signature.getByRole("button", { name: "Reframe" });
  const connect = signature.getByRole("button", { name: "Connect" });

  await expect(launch).toHaveAttribute("aria-pressed", "true");
  await connect.click();
  await expect(connect).toHaveAttribute("aria-pressed", "true");
  await expect(launch).toHaveAttribute("aria-pressed", "false");
  await expect(signature.getByTestId("signature-active")).toContainText("Connect selected");
  await expect(signature.getByTestId("signature-result")).toContainText(/website/i);
  await expect(signature.getByTestId("signature-cta")).toHaveAttribute("href", "/contact/?goal=connect");

  await reframe.focus();
  await page.keyboard.press("Space");
  await expect(reframe).toHaveAttribute("aria-pressed", "true");
  await expect(signature.getByTestId("signature-active")).toContainText("Reframe selected");
});

test("homepage remains complete without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  const selectedWork = page.getByTestId("hero-selected-work");
  await expect(selectedWork.getByRole("link", { name: /ENDOkey/i })).toHaveAttribute("href", "/work/endokey/");
  await expect(selectedWork.getByRole("link", { name: /POVKH LAB/i })).toHaveAttribute("href", "/work/povkh-lab/");
  for (const name of ["Brand", "Web", "Connect"]) {
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByTestId("process-list")).toContainText("Verify & Handover");
  await expect(page.getByTestId("studio-summary")).toContainText("independent studio");
  await expect(page.getByTestId("studio-summary")).not.toContainText("two-person studio");
  await expect(page.getByRole("link", { name: "Discuss your project" }).first()).toHaveAttribute("href", "/contact/");
  await context.close();
});

test("mobile homepage is linear and does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/ru/");
  await expect(page.getByRole("heading", { name: "Сначала находим, где теряется продажа" })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});

test("Russian hero offers a primary contact action and a link to the work", async ({ page }) => {
  await page.goto("/ru/");
  const hero = page.locator(".hero");
  const heroCopy = hero.locator(".hero-copy");
  await expect(heroCopy.getByRole("link", { name: "Разобрать задачу" })).toHaveCount(1);
  await expect(heroCopy.getByRole("link", { name: /Посмотреть работы/ })).toHaveAttribute("href", "#proof");
  await expect(heroCopy.getByRole("link")).toHaveCount(2);
  await expect(hero.locator(".site-atlas").getByRole("link")).toHaveCount(3);
  await expect(hero.locator("details, summary")).toHaveCount(0);
});

test("Russian homepage explains the approach and offer", async ({ page }) => {
  await page.goto("/ru/");
  await expect(page.getByRole("heading", { name: "С чем к нам приходят" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Сначала находим, где теряется продажа" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Собираем путь от поиска до заявки" })).toBeVisible();
  await expect(page.locator(".problems .problem")).toHaveCount(4);
  await expect(page.locator(".process-rail .process-tab")).toHaveCount(4);
  await expect(page.locator(".result-grid .result-item")).toHaveCount(4);
});

test("Russian homepage repeats one low-commitment conversion action", async ({ page }, testInfo) => {
  await page.goto("/ru/");
  await expect(page.locator("main")).not.toContainText(/\bCTA\b/);
  const conversionLinks = page.getByRole("link", { name: "Разобрать задачу", exact: true });
  const isMobile = testInfo.project.name.startsWith("mobile-");
  await expect(conversionLinks).toHaveCount(isMobile ? 2 : 3);
  for (const link of await conversionLinks.all()) {
    await expect(link).toHaveAttribute("href", /\/ru\/contact\//);
  }
});
