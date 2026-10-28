import { expect, test } from "@playwright/test";

const localizedCases = [
  {
    locale: "en",
    heading: "Services",
    processHeading: "Process",
    studioHeading: "Studio",
    notFoundHeading: "Page not found",
    home: "/",
    services: "/services/",
    process: "/process/",
    studio: "/studio/",
    missing: "/this-page-does-not-exist/",
    contact: "/contact/",
    brand: "Brand",
    web: "Web",
    connect: "Connect",
    outputs: ["A shared brief", "An approved direction", "ready for review", "A working test release", "Quality-check results"],
    gate: "Production publishing is blocked",
  },
  {
    locale: "ru",
    heading: "Услуги",
    processHeading: "Процесс",
    studioHeading: "Студия",
    notFoundHeading: "Страница не найдена",
    home: "/ru/",
    services: "/ru/services/",
    process: "/ru/process/",
    studio: "/ru/studio/",
    missing: "/ru/this-page-does-not-exist/",
    contact: "/ru/contact/",
    brand: "Бренд",
    web: "Сайт",
    connect: "Интеграции",
    outputs: ["Общий бриф", "Согласованное направление", "Проверяемая визуальная", "Рабочая тестовая версия", "Результаты проверки качества"],
    gate: "Публикация production заблокирована",
  },
];

const blogCases = [
  { path: "/blog/", locale: "en", heading: "Notes on brands, websites and connected systems", nav: "Blog" },
  { path: "/ru/blog/", locale: "ru", heading: "Заметки о брендах, сайтах и связанных системах", nav: "Блог" },
];

for (const blog of blogCases) {
  test(`${blog.locale} blog is a useful, stable destination`, async ({ page }) => {
    await page.goto(blog.path);
    await expect(page.locator("html")).toHaveAttribute("lang", blog.locale);
    await expect(page.getByRole("heading", { level: 1, name: blog.heading })).toBeVisible();
    await expect(page.locator(`[data-primary-links] a[href="${blog.path}"]`)).toHaveAttribute("aria-current", "page");
    await expect(page.locator("[data-blog-note]")).toHaveCount(3);
    if (blog.locale === "ru") await expect(page.locator('[data-editorial-image="blog"]')).toBeVisible();
  });
}

for (const pageCase of localizedCases) {
  test(`${pageCase.locale} services page shows bounded catalogue`, async ({ page }) => {
    await page.goto(pageCase.services);
    await expect(page.locator("html")).toHaveAttribute("lang", pageCase.locale);
    await expect(page.getByRole("heading", { level: 1, name: pageCase.heading })).toBeVisible();
    for (const service of [pageCase.brand, pageCase.web, pageCase.connect]) {
      await expect(page.getByRole("heading", { level: 2, name: service, exact: true })).toBeVisible();
    }
    await expect(page.getByText(/Discovery|Исследование/).first()).toBeVisible();
    await expect(page.getByText(/Evolution|Развитие/).first()).toBeVisible();
    await expect(page.getByText(/not included automatically|не включаются автоматически/i).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Discuss (?:your |a )?project|(?:Обсудить|Разобрать) (?:задачу|проект)/i }).first()).toHaveAttribute("href", pageCase.contact);
    if (pageCase.locale === "ru") await expect(page.locator('[data-editorial-image="service"]')).toHaveCount(3);
  });

  test(`${pageCase.locale} process exposes five stage outputs`, async ({ page }) => {
    await page.goto(pageCase.process);
    await expect(page.getByRole("heading", { level: 1, name: pageCase.processHeading })).toBeVisible();
    for (const output of pageCase.outputs) {
      await expect(page.getByText(output, { exact: false })).toBeVisible();
    }
    await expect(page.locator("ol").getByRole("listitem")).toHaveCount(5);
    await expect(page.getByRole("link", { name: /Discuss (?:your |a )?project|(?:Обсудить|Разобрать) (?:задачу|проект)/i }).first()).toHaveAttribute("href", pageCase.contact);
  });

  test(`${pageCase.locale} studio publishes bounded team information`, async ({ page }) => {
    await page.goto(pageCase.studio);
    await expect(page.getByRole("heading", { level: 1, name: pageCase.studioHeading })).toBeVisible();
    await expect(page.locator("main")).not.toContainText(/two-person studio|two people|два человека|двух человек/i);
    if (pageCase.locale === "ru") {
      await expect(page.locator('[data-editorial-image="studio"]')).toBeVisible();
      await expect(page.locator("[data-team-role]")).toHaveCount(6);
      await expect(page.getByText(/Яндексе, Магните, Burger King и Adrenaline Rush/)).toBeVisible();
    } else {
      await expect(page.getByRole("heading", { name: "Alessandro Povkh" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Egor Vereshagin" })).toBeVisible();
    }
    await expect(page.getByRole("link", { name: /Discuss (?:your |a )?project|(?:Обсудить|Разобрать) (?:задачу|проект)/i }).first()).toHaveAttribute("href", pageCase.contact);
  });

  test(`${pageCase.locale} information pages reflow long content without horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(pageCase.services);
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await page.goto(pageCase.process);
    await expect(page.locator(".stage-list > li")).toHaveCount(5);
  });

  test(`${pageCase.locale} missing route preserves localized recovery`, async ({ page }) => {
    const response = await page.goto(pageCase.missing);
    expect(response?.status()).toBe(404);
    await expect(page.locator("html")).toHaveAttribute("lang", pageCase.locale);
    await expect(page.getByRole("heading", { level: 1, name: pageCase.notFoundHeading })).toBeVisible();
    await expect(page.getByRole("link", { name: /home|главн/i }).first()).toHaveAttribute("href", pageCase.home);
    await expect(page.getByRole("link", { name: /services|услуг/i }).first()).toHaveAttribute("href", pageCase.services);
    await expect(page.getByRole("link", { name: /Discuss (?:your |a )?project|(?:Обсудить|Разобрать) (?:задачу|проект)/i }).first()).toHaveAttribute("href", pageCase.contact);
  });
}
