import { expect, test } from "@playwright/test";

const expectedSignalFields: Record<string, number> = {
  "/ru/services/": 0,
  "/ru/process/": 0,
  "/ru/work/": 0,
  "/ru/studio/": 0,
  "/ru/blog/": 0,
};

for (const [route, expected] of Object.entries(expectedSignalFields)) {
  test(`${route} keeps its approved body media count without overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("[data-signal-field]")).toHaveCount(expected);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  });
}

test("process stages use distinct photographic fields instead of repeated signal diagrams", async ({ page }) => {
  await page.goto("/ru/process/");
  await expect(page.locator("[data-process-stage-image]")).toHaveCount(5);
});

test("studio, blog and services use distinct editorial photography", async ({ page }) => {
  await page.goto("/ru/studio/");
  await expect(page.locator('[data-editorial-image="studio"]')).toHaveCount(1);
  await page.goto("/ru/blog/");
  await expect(page.locator('[data-editorial-image="blog"]')).toHaveCount(1);
  await page.goto("/ru/services/");
  await expect(page.locator('[data-editorial-image="service"]')).toHaveCount(3);
});

test("process principles and work cards use distinct meaningful imagery", async ({ page }) => {
  await page.goto("/ru/process/");
  const principleSources = await page.locator("[data-principle-image] img").evaluateAll((images) =>
    images.map((image) => new URL((image as HTMLImageElement).src).pathname),
  );
  expect(principleSources).toHaveLength(3);
  expect(new Set(principleSources).size).toBe(3);

  await page.goto("/ru/work/");
  const caseSources = await page.locator("[data-case-preview-media] img").evaluateAll((images) =>
    images.map((image) => new URL((image as HTMLImageElement).src).pathname),
  );
  expect(caseSources).toHaveLength(4);
  expect(new Set(caseSources).size).toBe(4);
});
