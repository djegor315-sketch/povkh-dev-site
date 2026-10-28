import { expect, test } from "@playwright/test";

test.describe("Russian light editorial homepage", () => {
  test.describe.configure({ timeout: 90_000 });

  test("keeps the approved narrative and four evidence-backed cases", async ({ page }) => {
    await page.goto("/ru/", { waitUntil: "load" });
    await expect(page.locator(".process-system")).toBeAttached();

    await expect(page.getByRole("heading", {
      level: 1,
      name: "Создаём сайты с характером.",
    })).toBeVisible();

    const order = await page.locator("[data-section]").evaluateAll((sections) =>
      sections.map((section) => section.getAttribute("data-section")),
    );
    expect(order).toEqual(["problems", "proof", "method", "result", "final-cta"]);

    const proof = page.locator('[data-section="proof"]');
    await expect(proof.locator("[data-case-card]")).toHaveCount(4);
    await expect(proof.getByRole("link", { name: "Открыть кейс КЗМС" })).toHaveAttribute("href", "/ru/work/kzms/");
    await expect(proof.getByRole("link", { name: "Открыть кейс ENDOkey" })).toHaveAttribute("href", "/ru/work/endokey/");
    await expect(proof.getByRole("link", { name: "Открыть кейс POVKH LAB" })).toHaveAttribute("href", "/ru/work/povkh-lab/");
    await expect(proof.getByRole("link", { name: "Смотреть живой сайт" })).toHaveAttribute("href", "https://giuliapovkh.ru");
    await expect(page.locator("main")).toContainText("Giulia Povkh");
  });

  test("uses a restrained background without a decorative grid", async ({ page }) => {
    await page.goto("/ru/", { waitUntil: "load" });
    await expect(page.locator(".process-system")).toBeAttached();
    const decorations = await page.evaluate(() => ({
      ambient: getComputedStyle(document.querySelector(".ambient-field")!, "::after").display,
      hero: getComputedStyle(document.querySelector(".hero")!, "::after").display,
      proofGrid: getComputedStyle(document.querySelector(".proof")!, "::before").display,
      proofOrbit: getComputedStyle(document.querySelector(".proof")!, "::after").display,
      methodGrid: getComputedStyle(document.querySelector(".method")!, "::before").display,
      processGrid: getComputedStyle(document.querySelector(".process-system")!, "::before").display,
      resultLine: getComputedStyle(document.querySelector("#result")!, "::before").display,
    }));
    expect(decorations).toEqual({
      ambient: "none",
      hero: "none",
      proofGrid: "none",
      proofOrbit: "none",
      methodGrid: "none",
      processGrid: "none",
      resultLine: "none",
    });
  });

  test("uses real website proof and restrained technical geometry", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/ru/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const presentation = await page.evaluate(() => {
      const atlas = document.querySelector<HTMLElement>(".site-atlas")!;
      const proofImages = [...atlas.querySelectorAll<HTMLImageElement>(".atlas-shot img")];
      const nav = document.querySelector<HTMLElement>(".site-nav")!;
      const button = document.querySelector<HTMLElement>(".hero .button")!;
      const card = document.querySelector<HTMLElement>(".problem")!;
      const navCenter = document.querySelector<HTMLElement>(".nav-center")!;
      const menu = document.querySelector<HTMLElement>(".menu-toggle")!;
      const atlasRect = atlas.getBoundingClientRect();
      return {
        atlasAspect: atlasRect.width / atlasRect.height,
        proofCount: proofImages.length,
        proofLoaded: proofImages.every((image) => image.complete && image.naturalWidth > 0),
        navRadius: Number.parseFloat(getComputedStyle(nav).borderTopLeftRadius),
        navBackdrop: getComputedStyle(nav).backdropFilter,
        buttonHeight: button.getBoundingClientRect().height,
        buttonRadius: Number.parseFloat(getComputedStyle(button).borderTopLeftRadius),
        cardRadius: Number.parseFloat(getComputedStyle(card).borderTopLeftRadius),
        navDivider: getComputedStyle(navCenter).borderLeftWidth,
        logoFragment: getComputedStyle(document.querySelector(".logo")!, "::after").display,
        menuFont: getComputedStyle(menu).fontFamily,
      };
    });

    expect(presentation.atlasAspect).toBeGreaterThan(0.7);
    expect(presentation.atlasAspect).toBeLessThan(1.2);
    expect(presentation.proofCount).toBe(3);
    expect(presentation.proofLoaded).toBe(true);
    expect(presentation.navRadius).toBeLessThanOrEqual(1);
    expect(presentation.navBackdrop).toBe("none");
    expect(presentation.buttonHeight).toBeGreaterThanOrEqual(36);
    expect(presentation.buttonRadius).toBeLessThanOrEqual(24);
    expect(presentation.cardRadius).toBeLessThanOrEqual(1);
    expect(presentation.navDivider).toBe("0px");
    expect(presentation.logoFragment).toBe("none");
    expect(presentation.menuFont).toContain("IBM Plex Sans");

    for (const selector of [
      ".hero-scan", ".orbit-note", ".orbit-index", ".nav-status", ".problem-no",
      ".case-divider", ".case-sequence", ".process-counter", ".process-foot", ".result-state",
    ]) {
      await expect(page.locator(selector).first()).toBeHidden();
    }

    for (const [selector, pseudo] of [
      [".endokey", "::before"], [".proof-bridge-section", "::before"], [".final", "::before"],
      [".process-artifact", "::before"], [".research-line", "::before"],
    ] as const) {
      const display = await page.locator(selector).first().evaluate((element, target) => getComputedStyle(element, target).display, pseudo);
      expect(display).toBe("none");
    }
  });

  test("contains no prototype controls or placeholder links", async ({ page }) => {
    await page.goto("/ru/", { waitUntil: "networkidle" });

    await expect(page.getByRole("button", { name: "Направление подходит" })).toHaveCount(0);
    await expect(page.locator('a[href="#"]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Разобрать задачу", exact: true }).last())
      .toHaveAttribute("href", /\/ru\/contact\//);
  });

  test("fits narrow mobile and exposes operable process controls", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto("/ru/");

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);

    const heroFlow = await page.evaluate(() => {
      const copy = document.querySelector<HTMLElement>(".hero-copy")!.getBoundingClientRect();
      const art = document.querySelector<HTMLElement>(".hero-art")!.getBoundingClientRect();
      return { copyWidth: copy.width, copyBottom: copy.bottom, artTop: art.top };
    });
    expect(heroFlow.copyWidth).toBeGreaterThanOrEqual(dimensions.viewport - 40);
    expect(heroFlow.artTop).toBeGreaterThanOrEqual(heroFlow.copyBottom - 1);

    const process = page.locator('[data-section="method"]');
    const focus = process.getByRole("button", { name: /Фокус/ });
    await focus.click();
    await expect(focus).toHaveAttribute("aria-pressed", "true");
    await expect(process).toContainText("Определяем аудиторию, задачу, оффер и главное действие");
  });

  test("keeps stacked panels separated and uses flat case surfaces", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/ru/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => {
        const bounds = document.querySelector<HTMLElement>(selector)!.getBoundingClientRect();
        return { top: bounds.top, bottom: bounds.bottom };
      };
      const radius = (selector: string) => Number.parseFloat(
        getComputedStyle(document.querySelector<HTMLElement>(selector)!).borderTopLeftRadius,
      );
      return {
        lastProblem: rect(".problem:nth-child(4)"),
        signal: rect(".signal-strip"),
        caseIndex: rect(".case-index"),
        firstCase: rect("#case-kzms"),
        radii: [
          radius("#case-kzms .case-info"),
          radius("#case-kzms .compare"),
          radius("#case-endokey .endokey-copy"),
          radius("#case-endokey .endokey-image"),
        ],
        endokeyTitleFits: (() => {
          const title = document.querySelector<HTMLElement>("#case-endokey h3")!;
          const range = document.createRange();
          range.selectNodeContents(title);
          const ink = range.getBoundingClientRect();
          const copy = document.querySelector<HTMLElement>("#case-endokey .endokey-copy")!.getBoundingClientRect();
          return ink.right <= copy.right - 20;
        })(),
      };
    });

    expect(layout.signal.top).toBeLessThanOrEqual(layout.lastProblem.bottom);
    expect(layout.firstCase.top - layout.caseIndex.bottom).toBeGreaterThanOrEqual(24);
    expect(layout.radii.every((value) => value <= 1)).toBe(true);
    expect(layout.endokeyTitleFits).toBe(true);
  });

  test("uses one aligned display type system across the navigation controls", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/ru/", { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);

    const navigation = await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>(".site-nav")!.getBoundingClientRect();
      const controls = [".logo", ".nav-links a", ".menu-toggle", ".nav-cta"].map((selector) => {
        const element = document.querySelector<HTMLElement>(selector)!;
        const bounds = element.getBoundingClientRect();
        return {
          font: getComputedStyle(element).fontFamily,
          center: bounds.top + bounds.height / 2,
          height: bounds.height,
        };
      }).filter(({ height }) => height > 0);
      return { navCenter: nav.top + nav.height / 2, controls };
    });

    for (const control of navigation.controls) {
      expect(control.font.length).toBeGreaterThan(0);
      expect(Math.abs(control.center - navigation.navCenter)).toBeLessThanOrEqual(3);
    }
    expect(navigation.controls.length).toBeGreaterThanOrEqual(3);
  });

  test("does not upscale the before-and-after case captures on wide screens", async ({ page }) => {
    await page.setViewportSize({ width: 2048, height: 1100 });
    await page.goto("/ru/", { waitUntil: "load" });
    const giulia = page.locator("#case-giulia");
    await expect(giulia.locator(".site-scroll img")).toHaveCount(6);
    await giulia.scrollIntoViewIfNeeded();
    await giulia.locator(".site-scroll img").evaluateAll((images) => {
      for (const image of images as HTMLImageElement[]) image.loading = "eager";
    });
    for (const image of await giulia.locator(".site-scroll img").all()) {
      await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
        .toBeGreaterThan(0);
    }

    const captures = await giulia.locator(".site-scroll img").evaluateAll((images) => {
      const captures = images as HTMLImageElement[];
      return captures.map((image) => ({
        naturalWidth: image.naturalWidth,
        renderedWidth: image.getBoundingClientRect().width,
        source: image.currentSrc,
      }));
    });

    for (const capture of captures) {
      expect(capture.naturalWidth).toBeGreaterThanOrEqual(capture.renderedWidth);
      expect(capture.source).not.toContain("q=68");
    }
  });

  test("makes process artifacts interactive and keeps result modules unornamented", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/ru/", { waitUntil: "load" });

    const method = page.locator('[data-section="method"]');
    await method.scrollIntoViewIfNeeded();
    await expect(method).toHaveAttribute("data-motion-state", "visible");
    const researchLayer = method.getByRole("button", { name: "Продукт что выбирают" });
    await researchLayer.click();
    await expect(researchLayer).toHaveAttribute("aria-pressed", "true");
    await expect(method.locator("[data-research-output]")).toHaveText("Продукт — что выбирают");

    const focus = method.getByRole("button", { name: /Фокус/ });
    await focus.click();
    const activeScene = method.locator(".process-scene.is-active");
    await expect(activeScene).toContainText("Выбираем фокус");
    expect(await activeScene.evaluate((scene) => scene.getAnimations({ subtree: true }).length)).toBeGreaterThan(0);

    const markerDisplays = await page.locator(".result-item").evaluateAll((items) =>
      items.map((item) => getComputedStyle(item, "::before").display),
    );
    expect(markerDisplays.every((display) => display === "none")).toBe(true);
  });

  test("gives every problem a distinct semantic visual scene", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/ru/", { waitUntil: "load" });
    const section = page.locator("#problems");
    await section.scrollIntoViewIfNeeded();

    const cards = section.locator(".problem");
    const visuals = section.locator(".problem-visual");
    await expect(cards).toHaveCount(4);
    await expect(visuals).toHaveCount(4);

    const geometry = await cards.evaluateAll((nodes) => nodes.map((node) => {
      const card = node.getBoundingClientRect();
      const visual = node.querySelector<HTMLElement>(".problem-visual")!.getBoundingClientRect();
      const style = getComputedStyle(node);
      return {
        left: card.left,
        right: card.right,
        top: card.top,
        bottom: card.bottom,
        radius: Number.parseFloat(style.borderTopLeftRadius),
        visual: { left: visual.left, right: visual.right, top: visual.top, bottom: visual.bottom },
      };
    }));

    const widths = geometry.map(({ left, right }) => right - left);
    expect(Math.abs(widths[0] - widths[3])).toBeLessThanOrEqual(1);
    expect(Math.abs(widths[1] - widths[2])).toBeLessThanOrEqual(1);
    expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
    expect(geometry.every(({ radius }) => radius <= 18)).toBe(true);
    expect(geometry.every(({ left, right, top, bottom, visual }) => (
      visual.left >= left && visual.right <= right && visual.top >= top && visual.bottom <= bottom
    ))).toBe(true);

    for (const visual of await visuals.all()) await expect(visual).toBeVisible();
    const visualKinds = await visuals.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-visual")));
    expect(visualKinds).toEqual(["translation", "route", "alignment", "launch"]);
    await expect(section.locator(".problem-visual .channel")).toHaveCount(4);
    expect(await section.evaluate((node) => getComputedStyle(node, "::before").display)).toBe("none");
    expect(await page.locator(".page-progress").evaluate((node) => getComputedStyle(node).display)).toBe("none");
    expect(await page.locator(".result-grid").evaluate((node) => getComputedStyle(node, "::after").display)).toBe("none");
  });

  test("keeps result headings and explanations separated throughout hover", async ({ page }) => {
    await page.setViewportSize({ width: 1092, height: 680 });
    await page.goto("/ru/", { waitUntil: "load" });
    const rows = page.locator(".result-item");
    await rows.first().scrollIntoViewIfNeeded();

    for (const row of await rows.all()) {
      await row.hover();
      await page.waitForTimeout(550);
      const geometry = await row.evaluate((node) => {
        const heading = node.querySelector<HTMLElement>("h3")!.getBoundingClientRect();
        const copy = node.querySelector<HTMLElement>("p:not(.result-state)")!.getBoundingClientRect();
        return { headingBottom: heading.bottom, copyTop: copy.top };
      });
      expect(geometry.headingBottom).toBeLessThanOrEqual(geometry.copyTop - 12);
    }
  });
});
