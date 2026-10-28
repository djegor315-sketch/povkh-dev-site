import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

async function caseEvidence(locale: "en" | "ru") {
  const source = await readFile(
    new URL(`../../src/content/work/${locale}/povkh-lab.md`, import.meta.url),
    "utf8",
  );
  const dateValue = source.match(/^evidenceDate:\s*(.+)$/m)?.[1]?.trim();
  const publicSource = source.match(/^publicSource:\s*(.+)$/m)?.[1]?.trim();
  if (!dateValue || !publicSource) throw new Error(`Missing evidence metadata for ${locale}`);
  return {
    date: new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(new Date(dateValue)),
    publicSource,
  };
}

test.describe("localized work cases", () => {
  test("publishes client and founder-led work with case-specific links", async ({ page }) => {
    for (const route of ["/work/", "/ru/work/"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        route.startsWith("/ru") ? "ru" : "en",
      );
      await expect(page.locator("main").getByRole("heading", { level: 1 })).toContainText(
        route.startsWith("/ru") ? "Работы со сложными продуктами" : "Built",
      );
      await expect(page.locator(".case-list-item")).toHaveCount(route.startsWith("/ru") ? 4 : 2);
      await expect(page.getByText(/client work|клиентский проект/i).first()).toBeVisible();
      await expect(page.getByText(/founder-led|основател/i).first()).toBeVisible();
      await expect(page.locator("main")).not.toContainText("/Users/");
      const links = page.locator(".case-preview .button");
      await expect(links).toHaveCount(route.startsWith("/ru") ? 4 : 2);
      if (route.startsWith("/ru")) {
        await expect(links.nth(0)).toHaveAccessibleName("Открыть кейс Переработка каталога промышленных сеток КЗМС");
        await expect(links.nth(0)).toHaveAttribute("href", "/ru/work/kzms/");
        await expect(links.nth(1)).toHaveAccessibleName("Открыть кейс Бренд и сайт эндодонтического продукта");
        await expect(links.nth(1)).toHaveAttribute("href", "/ru/work/endokey/");
        await expect(links.nth(2)).toHaveAttribute("href", "/ru/work/povkh-lab/");
        await expect(links.nth(3)).toHaveAccessibleName("Смотреть сайт Giulia Povkh");
        await expect(links.nth(3)).toHaveAttribute("href", "https://giuliapovkh.ru");
        await expect(page.getByRole("img", { name: "Новая главная страница портфолио Giulia Povkh" })).toBeVisible();
      } else {
        await expect(links.nth(0)).toHaveAccessibleName("Read the ENDOkey case");
        await expect(links.nth(1)).toHaveAccessibleName("Read the POVKH LAB case");
      }
    }
  });

  test("ENDOkey route states the delivered scope without invented outcomes", async ({ page }) => {
    for (const route of ["/work/endokey/", "/ru/work/endokey/"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: route.startsWith("/ru") ? "ENDOkey: бренд и сайт для врачей" : "ENDOkey" })).toBeVisible();
      await expect(page.getByText(/client work|клиентский проект/i).first()).toBeVisible();
      await expect(page.getByRole("link", { name: /Visit ENDOkey|Открыть сайт ENDOkey/i }).first()).toHaveAttribute("href", "https://endokey.ru/");
      await expect(page.locator("main")).toContainText(/Positioning|Позиционирование/i);
      await expect(page.locator("main")).toContainText(/Identity|Айдентика/i);
      await expect(page.locator("main")).toContainText(/Copy|Тексты/i);
      await expect(page.locator("main")).toContainText(/Website|Сайт/i);
      await expect(page.locator("main")).not.toContainText(/\d+%|guarantee(?:d|s)? (?:leads|sales)|(?:increased|grew|improved) (?:leads|sales|conversion)|рост (?:лидов|продаж|конверсии) (?:на|составил)/i);
      await expect(page.getByTestId("language-switch")).toHaveAttribute("href", route.startsWith("/ru") ? "/work/endokey/" : "/ru/work/endokey/");
    }
  });

  test("KZMS route explains the industrial catalogue and links to the published result", async ({ page }) => {
    await page.goto("/ru/work/kzms/");
    await expect(page.getByRole("heading", { level: 1, name: "Переработка каталога промышленных сеток КЗМС" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Открыть каталог КЗМС" }).first()).toHaveAttribute(
      "href",
      "https://rosset-kzms.ru/catalog-preview-v5/",
    );
    await expect(page.locator("main")).toContainText("Вход через отрасль и задачу");
    await expect(page.locator("main")).toContainText("Запрос на подбор");
    await expect(page.locator("main")).not.toContainText(/предварительн|превью|preview|пакет|ворктри|локальн/i);
    await expect(page.locator("main")).not.toContainText(/источник кейса|подтверждённом владельцем|проверено/i);
  });

  test("KZMS case proves the catalogue change with a visible before and after", async ({ page }) => {
    await page.goto("/ru/work/kzms/");
    const comparison = page.locator("[data-case-comparison]");
    await expect(comparison.getByRole("heading", { name: "Было: товары вперемешку" })).toBeVisible();
    await expect(comparison.getByRole("heading", { name: "Стало: сетки по задачам производства" })).toBeVisible();
    await expect(comparison).toContainText("Товары для дачи и дома");
    await expect(comparison).toContainText("400 непрофильных карточек");
    await expect(comparison).toContainText("Отрасль → задача оборудования → параметры → запрос на подбор");
    await expect(comparison.getByRole("link", { name: "Посмотреть прежний каталог" })).toHaveAttribute("href", "https://rosset-kzms.ru/catalog/");
    await expect(comparison.getByRole("link", { name: "Посмотреть переработанный каталог" })).toHaveAttribute("href", "https://rosset-kzms.ru/catalog-preview-v5/");
    const assets = comparison.locator("img[data-case-asset]");
    await expect(assets).toHaveCount(2);
    expect(await assets.evaluateAll((images) => images.every((image) => {
      const asset = image as HTMLImageElement;
      return asset.complete && asset.naturalWidth > 0 && new URL(asset.src).pathname.startsWith("/assets/work/kzms/");
    }))).toBe(true);
  });

  test("Russian ENDOkey case leads with the product and shows the full website separately", async ({ page }) => {
    await page.goto("/ru/work/endokey/");
    const proof = page.locator("[data-case-proof]");
    const productImage = proof.getByRole("img", { name: /инструменты ENDOkey/i });
    await expect(productImage).toBeVisible();
    expect(await productImage.evaluate((element) => {
      const asset = element as HTMLImageElement;
      return asset.complete && asset.naturalWidth > 0 && new URL(asset.src).pathname === "/assets/work/endokey/product-hero.jpg";
    })).toBe(true);
    await expect(proof).toContainText("Логотип, упаковка и визуальная система ENDOkey");

    const siteEvidence = page.locator("[data-site-evidence]");
    await expect(siteEvidence.getByRole("heading", { name: "Сайт ведёт от назначения продукта к покупке" })).toBeVisible();
    const siteImage = siteEvidence.getByRole("img", { name: /главная страница сайта ENDOkey/i });
    await expect(siteImage).toBeVisible();
    await expect(siteImage).toHaveAttribute("src", "/assets/work/endokey/site-home.jpg");
    await expect(siteEvidence).toContainText("Назначение → принцип работы → материалы → покупка");
    await expect(page.locator("main")).not.toContainText("Путь на сайте");
    await expect(page.locator("main")).not.toContainText("Понять\n");
  });

  test("Russian work index keeps governance evidence out of public copy", async ({ page }) => {
    await page.goto("/ru/work/");
    await expect(page.locator("main")).not.toContainText(/источник кейса|подтверждение владельца|проверено/i);
  });

  test("KZMS case does not overflow a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ru/work/kzms/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("Russian work index does not overflow a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ru/work/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("ENDOkey case does not overflow a narrow mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/ru/work/endokey/");
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });

  test("case route exposes disclosure, dated evidence, and result boundary", async ({ page }) => {
    for (const route of ["/work/povkh-lab/", "/ru/work/povkh-lab/"]) {
      const locale = route.startsWith("/ru") ? "ru" : "en";
      const expectedEvidence = await caseEvidence(locale);
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1, name: "POVKH LAB" })).toBeVisible();
      await expect(page.getByRole("link", { name: /Visit POVKH LAB|Открыть сайт POVKH LAB/i })).toHaveAttribute(
        "href",
        "https://alessandropovkh.github.io/POVKH-LAB/",
      );
      await expect(page.getByText(/founder-led|проект основателей/i).first()).toBeVisible();
      await expect(page.getByText(/not an external client engagement|не внешний клиентский контракт/i).first()).toBeVisible();
      await expect(page.locator("[data-case-evidence]").first()).toContainText(expectedEvidence.date);
      await expect(page.locator("[data-case-evidence]").first()).toContainText(expectedEvidence.publicSource);
      await expect(page.locator("main")).not.toContainText("/Users/");
      await expect(page.getByText(/does not claim|не заявляет|не содержит заявлений/i).first()).toBeVisible();
      await expect(page.getByRole("heading", { name: /catalog|каталог/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /quality|качеств|qa/i })).toBeVisible();
    }
  });

  test("X-ray is operable with two buttons and a static text equivalent", async ({ page }) => {
    await page.goto("/work/povkh-lab/");
    const xray = page.locator("[data-xray]");
    const audienceButton = xray.getByRole("button", { name: "Audience view" });
    const systemButton = xray.getByRole("button", { name: "System view" });
    await expect(audienceButton).toHaveAttribute("aria-pressed", "true");
    await expect(systemButton).toHaveAttribute("aria-pressed", "false");
    await expect(audienceButton).toHaveAttribute("aria-controls", "xray-audience-panel");
    await expect(systemButton).toHaveAttribute("aria-controls", "xray-system-panel");
    await expect(xray.locator('[data-xray-panel="audience"]')).toBeVisible();
    await systemButton.click();
    await expect(systemButton).toHaveAttribute("aria-pressed", "true");
    await expect(audienceButton).toHaveAttribute("aria-pressed", "false");
    await expect(xray.locator('[data-xray-panel="system"]')).toBeVisible();
    await expect(xray.locator("[data-xray-static]")).toBeVisible();
    await expect(xray.locator("[data-xray-static]")).toContainText("Audience view");
    await expect(xray.locator("[data-xray-static]")).toContainText("System view");
  });

  test("case assets are local and load successfully", async ({ page, request }) => {
    await page.goto("/work/povkh-lab/");
    const assets = await page.locator("img[data-case-asset]").evaluateAll((images) =>
      images.map((image) => ({ src: (image as HTMLImageElement).src, alt: image.getAttribute("alt") })),
    );
    expect(assets.length).toBeGreaterThanOrEqual(3);
    for (const asset of assets) {
      expect(new URL(asset.src).pathname).toMatch(/^\/assets\/work\/povkh-lab\//);
      expect(asset.alt).toBeTruthy();
      const response = await request.get(asset.src);
      expect(response.ok()).toBe(true);
    }
  });

  test("case remains readable without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/work/povkh-lab/");
    await expect(page.getByRole("heading", { level: 1, name: "POVKH LAB" })).toBeVisible();
    await expect(page.locator("[data-xray-static]")).toBeVisible();
    await expect(page.getByText(/founder-led/i).first()).toBeVisible();
    await context.close();
  });

  test("ENDOkey case remains readable without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto("/work/endokey/");
    await expect(page.getByRole("heading", { level: 1, name: "ENDOkey" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Visit ENDOkey/i })).toHaveAttribute("href", "https://endokey.ru/");
    await context.close();
  });
});
