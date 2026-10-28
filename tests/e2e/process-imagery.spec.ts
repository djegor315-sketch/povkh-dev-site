import { expect, test } from "@playwright/test";

test("Russian process stages use five distinct local photographic assets", async ({ page }) => {
  await page.goto("/ru/process/");
  const images = page.locator("[data-process-stage-image]");
  await expect(images).toHaveCount(5);

  const sources = await images.evaluateAll((nodes) => nodes.map((node) => (node as HTMLImageElement).getAttribute("src") ?? ""));
  expect(new Set(sources).size).toBe(5);
  expect(sources.every((source) => source.includes("/assets/process/"))).toBe(true);

  for (const image of await images.all()) {
    await expect(image).toHaveAttribute("alt", "");
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThanOrEqual(1200);
  }
});

test("process photography keeps the stage text readable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/ru/process/");
  await expect(page.locator(".stage-item")).toHaveCount(5);
  await expect(page.locator("[data-process-stage-image]")).toHaveCount(5);

  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
});
