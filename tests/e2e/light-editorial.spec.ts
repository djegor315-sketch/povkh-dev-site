import { expect, test } from "@playwright/test";

const coreRoutes = ["/ru/", "/ru/services/", "/ru/process/", "/ru/work/", "/ru/studio/", "/ru/blog/", "/ru/contact/"] as const;

test("selected Russian direction uses paper, ink and pastel editorial fields", async ({ page }) => {
  for (const route of coreRoutes) {
    await page.goto(route, { waitUntil: "load" });
    const palette = await page.evaluate(() => {
      const body = getComputedStyle(document.body);
      const backdrop = getComputedStyle(document.querySelector<HTMLElement>("[data-aurora-backdrop]")!);
      return { color: body.color, backdrop: backdrop.backgroundImage, backdropColor: backdrop.backgroundColor };
    });
    expect(palette.color).toBe("rgb(23, 21, 24)");
    expect(palette.backdrop).toContain("linear-gradient");
    expect(palette.backdropColor).toBe("rgb(244, 239, 232)");
  }
});

test("homepage hero is a flat blush and powder-blue split", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/ru/", { waitUntil: "load" });
  const hero = await page.locator(".hero").evaluate((node) => {
    const style = getComputedStyle(node);
    const copy = getComputedStyle(node.querySelector<HTMLElement>(".hero-copy")!);
    const art = getComputedStyle(node.querySelector<HTMLElement>(".hero-art")!);
    return {
      copyBackground: copy.backgroundColor,
      artBackground: art.backgroundColor,
      radius: style.borderTopLeftRadius,
    };
  });
  expect(hero.copyBackground).toBe("rgb(243, 209, 220)");
  expect(hero.artBackground).toBe("rgb(201, 222, 235)");
  expect(Number.parseFloat(hero.radius)).toBeLessThanOrEqual(1);
});

test("dense module groups use readable alternating editorial colors", async ({ page }) => {
  await page.goto("/ru/services/", { waitUntil: "load" });
  const cards = await page.locator(".service-card").evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    const heading = getComputedStyle(node.querySelector("h2")!);
    return { background: style.backgroundColor, color: heading.color };
  }));
  expect(new Set(cards.map(({ background }) => background)).size).toBeGreaterThanOrEqual(3);
  expect(cards.every(({ color }) => color === "rgb(23, 21, 24)")).toBe(true);
});

test("contact brief is the intentional black utility panel with light controls", async ({ page }) => {
  await page.goto("/ru/contact/", { waitUntil: "load" });
  await expect(page.locator(".brief-shell-ru")).toHaveCSS("background-color", "rgb(20, 19, 22)");
  await expect(page.locator(".brief-shell-ru textarea")).toHaveCSS("background-color", "rgb(250, 245, 239)");
  await expect(page.locator(".brief-shell-ru textarea")).toHaveCSS("color", "rgb(23, 21, 24)");
});

test("light editorial motion is removed for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/ru/", { waitUntil: "load" });
  await expect(page.locator("[data-aurora-field]").first()).toHaveCSS("animation-name", "none");
});
