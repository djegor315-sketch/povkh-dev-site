import { expect, test } from "@playwright/test";

const russianRoutes = [
  "/ru/",
  "/ru/services/",
  "/ru/process/",
  "/ru/work/",
  "/ru/studio/",
  "/ru/blog/",
  "/ru/contact/",
  "/ru/privacy/",
  "/ru/cookies/",
  "/ru/404/",
] as const;

for (const route of russianRoutes) {
  test(`${route} renders one shared light editorial backdrop without overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "load" });
    const backdrop = page.locator("[data-aurora-backdrop]");
    await expect(backdrop).toHaveCount(1);
    await expect(backdrop).toHaveAttribute("aria-hidden", "true");
    const geometry = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(geometry.scrollWidth).toBe(geometry.clientWidth);
  });
}

for (const route of ["/", "/services/", "/work/", "/contact/"] as const) {
  test(`${route} does not render the RU light editorial backdrop`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    await expect(page.locator("[data-aurora-backdrop]")).toHaveCount(0);
  });
}

test("Light editorial backdrop uses two slow transform-only motion layers", async ({ page }) => {
  await page.goto("/ru/", { waitUntil: "load" });
  const motion = await page.locator("[data-aurora-backdrop]").evaluate((node) => {
    const fields = [...node.querySelectorAll<HTMLElement>("[data-aurora-field]")];
    return fields.map((field) => {
      const style = getComputedStyle(field);
      return {
        animationName: style.animationName,
        animationDuration: style.animationDuration,
        transitionProperty: style.transitionProperty,
      };
    });
  });
  expect(motion).toHaveLength(2);
  expect(motion.map(({ animationName }) => animationName)).toEqual(["auroraRoseDrift", "auroraVioletDrift"]);
  expect(motion.map(({ animationDuration }) => animationDuration)).toEqual(["26s", "32s"]);
});

test("Light editorial backdrop becomes fully static for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ru/", { waitUntil: "load" });
  const animations = await page.locator("[data-aurora-field]").evaluateAll((fields) =>
    fields.map((field) => getComputedStyle(field).animationName),
  );
  expect(animations).toEqual(["none", "none"]);
});
