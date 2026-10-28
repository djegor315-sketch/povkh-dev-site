import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";
import { join } from "node:path";
import { founderAuthorityApproved, workRightsApproved } from "../../src/lib/release-gates.mjs";

const contentRoot = new URL("../../src/content/", import.meta.url);
const expectedRoutes = [
  "/",
  "/work/",
  "/work/endokey/",
  "/work/povkh-lab/",
  "/services/",
  "/process/",
  "/studio/",
  "/blog/",
  "/contact/",
  "/privacy/",
  "/cookies/",
];

async function json(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, contentRoot), "utf8"));
}

async function filenames(relativeDirectory, extension) {
  const directory = new URL(relativeDirectory, contentRoot);
  return (await readdir(directory))
    .filter((name) => name.endsWith(extension))
    .sort();
}

const unsupportedOutcomePatterns = [
  /\b(?:double[ds]?|triple[ds]?|increase[ds]?|grew|improve[ds]?|boost(?:ed|s)?|raise[ds]?)\s+(?:qualified\s+)?(?:leads?|enquiries|inquiries|sales|revenue|conversions?|conversion rate|orders?)\b/iu,
  /\bguarantee(?:d|s)?\s+(?:more\s+)?(?:leads?|enquiries|inquiries|sales|revenue|conversions?|orders?)\b/iu,
  /\b(?:improve[ds]?|increase[ds]?|guarantee(?:d|s)?|boost(?:ed|s)?)\s+(?:clinical\s+)?(?:disinfection|healing|medical outcomes?|survival|success rates?|treatment efficacy)\b/iu,
  /(?:удвоил[аи]?|утроил[аи]?|увеличил[аи]?|повысил[аи]?|улучшил[аи]?|выросл[аи]?|выросли)\s+(?:число\s+)?(?:заявк(?:и|у|ам|ов)|лидов|продаж|выручк[аиуы]?|конверс(?:ии|ию)|заказов)/iu,
  /(?<!не\s)гарантир(?:ует|уем|уют|овал[аи]?|ованный?)\s+(?:рост\s+)?(?:заявк(?:и|у|ам|ов)|лидов|продаж|выручки|конверс(?:ии|ию)|заказов)/iu,
  /(?:улучш(?:ает|ают|ил[аи]?)|повыш(?:ает|ают|ил[аи]?)|гарантир(?:ует|уем|уют|овал[аи]?))\s+(?:клиническ(?:ий|ие)\s+)?(?:дезинфекцию|заживление|медицинские исходы|выживаемость|успех лечения|эффективность лечения)/iu,
];

function hasUnsupportedOutcomeClaim(source) {
  return unsupportedOutcomePatterns.some((pattern) => pattern.test(source));
}

test("unsupported outcome detector rejects commercial and medical claim mutations", () => {
  const positiveMutations = [
    "The redesign doubled sales.",
    "Our website guarantees conversions.",
    "The product improves disinfection.",
    "Редизайн удвоил продажи.",
    "Сайт гарантирует заявки.",
    "Продукт улучшает дезинфекцию.",
  ];
  const allowedBoundaries = [
    "The case does not claim sales or medical outcomes.",
    "Кейс не заявляет показатели продаж или медицинские результаты.",
  ];
  for (const mutation of positiveMutations) assert.equal(hasUnsupportedOutcomeClaim(mutation), true, mutation);
  for (const boundary of allowedBoundaries) assert.equal(hasUnsupportedOutcomeClaim(boundary), false, boundary);
});

test("EN and RU site authorities declare exact equivalent public routes", async () => {
  const [en, ru] = await Promise.all([json("site/en.json"), json("site/ru.json")]);
  assert.deepEqual(en.routes, expectedRoutes);
  assert.deepEqual(
    [...ru.routes].sort(),
    [
      ...expectedRoutes.map((route) => (route === "/" ? "/ru/" : `/ru${route}`)),
      "/ru/work/kzms/",
    ].sort(),
  );
  assert.equal(en.locale, "en");
  assert.equal(ru.locale, "ru");
});

test("Blog is a first-class navigation destination in both locales", async () => {
  const [en, ru] = await Promise.all([json("site/en.json"), json("site/ru.json")]);
  assert.deepEqual(en.nav.find(({ id }) => id === "blog"), {
    id: "blog",
    label: "Blog",
    href: "/blog/",
  });
  assert.deepEqual(ru.nav.find(({ id }) => id === "blog"), {
    id: "blog",
    label: "Блог",
    href: "/ru/blog/",
  });
});

test("contact introduction follows the configured delivery mode", async () => {
  for (const path of ["../../src/pages/contact.astro", "../../src/pages/ru/contact.astro"]) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.match(source, /__POVKH_SITE_MODE__/);
    assert.match(source, /demoMode\s*\?/);
  }
});

test("shared structured collections keep locale parity", async () => {
  for (const collection of ["services", "process", "team", "faq"]) {
    const [en, ru] = await Promise.all([
      json(`${collection}/en.json`),
      json(`${collection}/ru.json`),
    ]);
    assert.deepEqual(
      en.items.map(({ id }) => id),
      ru.items.map(({ id }) => id),
      `${collection} locale parity`,
    );
  }

  assert.deepEqual(await filenames("work/en/", ".md"), ["endokey.md", "povkh-lab.md"]);
  assert.deepEqual(await filenames("work/ru/", ".md"), ["endokey.md", "kzms.md", "povkh-lab.md"]);
  assert.deepEqual(
    await filenames("legal/en/", ".md"),
    await filenames("legal/ru/", ".md"),
    "legal locale parity",
  );
});

test("service authority exposes Brand, Web and Connect without silent expansion", async () => {
  const en = await json("services/en.json");
  assert.deepEqual(en.items.map(({ id }) => id), ["brand", "web", "connect"]);
  for (const service of en.items) {
    assert.ok(service.boundary.length > 20, `${service.id} needs an explicit boundary`);
  }
});

test("POVKH LAB is disclosed as founder-led in both locales", async () => {
  const negativeClientClaim = {
    en: /not an external client engagement/i,
    ru: /не внешний клиентский контракт/i,
  };
  for (const locale of ["en", "ru"]) {
    const source = await readFile(
      new URL(`work/${locale}/povkh-lab.md`, contentRoot),
      "utf8",
    );
    assert.match(source, /^relationship:\s*founder-led$/m);
    assert.match(source, new RegExp(`^order:\\s*${locale === "ru" ? 3 : 2}$`, "m"));
    assert.match(source, new RegExp(`^featured:\\s*${locale === "ru" ? "false" : "true"}$`, "m"));
    assert.match(source, /^disclosure:\s*.+$/m);
    if (locale === "en") assert.match(source, negativeClientClaim[locale]);
    assert.match(source, /^rightsStatus:\s*approved$/m);
    assert.match(source, /^liveSite:\s*https:\/\/alessandropovkh\.github\.io\/POVKH-LAB\/$/m);
    assert.doesNotMatch(source, /\/Users\//, `${locale} public case must not expose local paths`);
  }
});

test("work authority publishes deterministic localized client and founder-led cases", async () => {
  for (const locale of ["en", "ru"]) {
    const endokey = await readFile(new URL(`work/${locale}/endokey.md`, contentRoot), "utf8");
    assert.match(endokey, /^caseSlug:\s*endokey$/m);
    assert.match(endokey, /^relationship:\s*client$/m);
    assert.match(endokey, new RegExp(`^order:\\s*${locale === "ru" ? 2 : 1}$`, "m"));
    assert.match(endokey, /^featured:\s*true$/m);
    assert.match(endokey, /^rightsStatus:\s*approved$/m);
    assert.match(endokey, /^liveSite:\s*https:\/\/endokey\.ru\/$/m);
    assert.match(endokey, /positioning|позиционирован/i);
    assert.match(endokey, /identity|айдентик/i);
    assert.match(endokey, /copy|текст/i);
    assert.match(endokey, /website|сайт/i);
    assert.equal(hasUnsupportedOutcomeClaim(endokey), false, `${locale} ENDOkey case contains a positive outcome claim`);
  }
});

test("Russian authority leads with the approved task-shaped website offer and real proof", async () => {
  const [site, kzms, endokey, lab] = await Promise.all([
    json("site/ru.json"),
    readFile(new URL("work/ru/kzms.md", contentRoot), "utf8"),
    readFile(new URL("work/ru/endokey.md", contentRoot), "utf8"),
    readFile(new URL("work/ru/povkh-lab.md", contentRoot), "utf8"),
  ]);
  assert.equal(site.hero.title, "Создаём сайты с характером.");
  assert.match(site.hero.lead, /бизнеса, предпринимателей и авторских проектов/i);
  assert.equal(site.hero.primaryCta, "Разобрать задачу");
  assert.equal(site.finalCta.action, site.hero.primaryCta);
  assert.match(kzms, /^caseSlug:\s*kzms$/m);
  assert.match(kzms, /^order:\s*1$/m);
  assert.match(kzms, /^featured:\s*true$/m);
  assert.match(kzms, /^liveSite:\s*https:\/\/rosset-kzms\.ru\/catalog-preview-v5\/$/m);
  assert.match(kzms, /Переработка каталога промышленных сеток КЗМС/);
  assert.match(kzms, /400 карточек непрофильных товаров/);
  assert.match(kzms, /вёдра, болты, шурупы/);
  assert.match(endokey, /^order:\s*2$/m);
  assert.match(endokey, /^featured:\s*true$/m);
  assert.match(endokey, /^title:\s*Бренд и сайт эндодонтического продукта$/m);
  assert.match(lab, /^order:\s*3$/m);
  assert.match(lab, /^featured:\s*false$/m);
  const publicKzmsCopy = kzms.replace(/^liveSite:\s*.+$/m, "");
  assert.doesNotMatch(publicKzmsCopy, /предварительн|превью|preview|пакет|ворктри|локальн/iu);
  assert.equal(hasUnsupportedOutcomeClaim(kzms), false);
});

test("demo publishes the two approved founder names without inventing profiles", async () => {
  for (const locale of ["en", "ru"]) {
    const team = await json(`team/${locale}.json`);
    assert.deepEqual(team.items.map(({ publicName }) => publicName), [
      "Alessandro Povkh",
      "Egor Vereshagin",
    ]);
    assert.equal(team.productionReady, false);
  }
});

test("public team copy removes the legacy two-person claim and keeps new experience bounded", async () => {
  const sourceRefs = [
    "../../src/pages/index.astro",
    "../../src/pages/studio.astro",
    "../../src/pages/ru/studio.astro",
    "../../src/content/team/en.json",
    "../../src/content/team/ru.json",
  ];
  const sources = await Promise.all(sourceRefs.map((ref) => readFile(new URL(ref, import.meta.url), "utf8")));
  const joined = sources.join("\n");
  assert.doesNotMatch(joined, /two-person|two people|два человека|двух человек/iu);

  const ruStudio = sources[2];
  for (const role of ["SEO-специалист", "Дизайнеры ×2", "Продуктовый менеджер", "UX/UI-дизайнер", "Веб-дизайнер", "Frontend-разработчики"]) {
    assert.match(ruStudio, new RegExp(role.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "u"));
  }
  for (const company of ["Яндексе", "Магните", "Burger King", "Adrenaline Rush"]) assert.match(ruStudio, new RegExp(company, "u"));
  assert.doesNotMatch(ruStudio, /клиент(?:ы|ами)?\s+(?:Яндекс|Магнит|Burger King|Adrenaline Rush)/iu);
});

test("GitHub Pages publishes the static preview artifact", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/pages.yml", import.meta.url),
    "utf8",
  );
  assert.match(workflow, /POVKH_SITE_MODE:\s*preview/);
  assert.match(workflow, /path:\s*dist\/client/);
  assert.doesNotMatch(workflow, /POVKH_SITE_MODE:\s*production/);
  assert.doesNotMatch(workflow, /POVKH_SITE_ORIGIN/);
});

test("content contains no marketing placeholders or invented metrics", async () => {
  const files = [
    "site/en.json",
    "site/ru.json",
    "services/en.json",
    "services/ru.json",
    "process/en.json",
    "process/ru.json",
    "team/en.json",
    "team/ru.json",
    "faq/en.json",
    "faq/ru.json",
  ];
  const workFiles = (await Promise.all(["en", "ru"].map(async (locale) =>
    Promise.all((await filenames(`work/${locale}/`, ".md")).map((name) =>
      readFile(new URL(`work/${locale}/${name}`, contentRoot), "utf8"),
    )),
  ))).flat();
  const source = [
    ...(await Promise.all(files.map((file) => readFile(new URL(file, contentRoot), "utf8")))),
    ...workFiles,
  ].join("\n");
  assert.doesNotMatch(source, /lorem ipsum|tbd|coming soon|\d+%|#1|award-winning/iu);
  assert.equal(hasUnsupportedOutcomeClaim(source), false, "public content contains a positive commercial or medical outcome claim");
});

test("production accepts only approved legal entries", async () => {
  if (process.env.POVKH_SITE_MODE !== "production") return;
  for (const locale of ["en", "ru"]) {
    for (const name of await filenames(`legal/${locale}/`, ".md")) {
      const source = await readFile(
        new URL(join("legal", locale, name), contentRoot),
        "utf8",
      );
      assert.match(source, /^status:\s*approved$/m, `${locale}/${name}`);
    }
  }
});

test("production authority gates reject current pending records and accept complete fixtures", async () => {
  const team = await json("team/en.json");
  assert.equal(founderAuthorityApproved(team), false);
  assert.equal(workRightsApproved({ rightsStatus: "owner-confirmation-required" }), false);

  const completeFounder = {
    publicName: "Approved Name",
    role: "Approved Role",
    biography: "Approved public biography.",
    portrait: "/approved-portrait.webp",
    links: ["https://povkh.dev/approved-profile"],
  };
  assert.equal(founderAuthorityApproved({ productionReady: true, items: [completeFounder, completeFounder] }), true);
  assert.equal(workRightsApproved({ rightsStatus: "approved" }), true);
});

test("light editorial system keeps the approved mark and uses real website proof in the hero", async () => {
  const [header, mark, glyph, homepage, hero, interior, referenceEditorial, complexCase, seoHead, favicon, endokeyHero] = await Promise.all([
    readFile(new URL("../../src/components/Header.astro", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/BrandMark.astro", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/home/GlyphField.astro", import.meta.url), "utf8"),
    readFile(new URL("../../src/pages/ru/index.astro", import.meta.url), "utf8"),
    readFile(new URL("../../src/lib/studio-hero.ts", import.meta.url), "utf8"),
    readFile(new URL("../../src/styles/editorial-interior.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/styles/reference-editorial.css", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/work/ComplexProductCase.astro", import.meta.url), "utf8"),
    readFile(new URL("../../src/components/SeoHead.astro", import.meta.url), "utf8"),
    readFile(new URL("../../public/favicon.svg", import.meta.url), "utf8"),
    readFile(new URL("../../public/assets/work/endokey/site-home.jpg", import.meta.url)),
  ]);
  assert.match(header, /<BrandMark/);
  assert.match(mark, /data-brand-mark/);
  assert.equal((mark.match(/data-signal-stroke/g) ?? []).length, 3);
  assert.match(glyph, /<canvas/);
  assert.match(glyph, /tabindex="0"/);
  assert.match(glyph, /pointerdown/);
  assert.match(glyph, /keydown/);
  assert.match(glyph, /prefers-reduced-motion/);
  assert.match(glyph, /reducedMotion\.matches/);
  assert.doesNotMatch(glyph, /FIELD DEPTH|\bLOCK\b|\bglow\b/iu);
  assert.match(hero, /class="site-atlas"/);
  assert.match(hero, /atlas-kzms\.webp/);
  assert.match(hero, /atlas-endokey\.webp/);
  assert.match(hero, /atlas-povkh-lab\.webp/);
  assert.match(homepage, /data-home-hero-media/);
  assert.ok(endokeyHero.byteLength > 100_000);
  assert.match(homepage, /@media \(max-width: 640px\)[\s\S]*\[data-section\][^}]*content-visibility:\s*visible/);
  assert.match(interior, /--povkh-pink:\s*#ff2f92/);
  assert.match(interior, /--paper:\s*#f4efe8/);
  assert.match(referenceEditorial, /--ref-blush:\s*#f3d1dc/);
  assert.match(referenceEditorial, /--ref-display:/);
  assert.match(interior, /\.editorial-interior \.case-list-item \.case-preview[^}]*#f7d3dd/s);
  assert.match(interior, /\.editorial-interior \.brief-shell-ru[^}]*background:\s*#171518\s*!important/s);
  assert.match(interior, /\.editorial-interior \.brief-shell-ru :where\(input, textarea, select\)[^}]*background:\s*#faf5ef\s*!important/s);
  assert.match(complexCase, /\.related-case\s*\{/);
  assert.match(seoHead, /locale === "ru" \? "#f4efe8"/);
  assert.match(favicon, /data-brand-mark/);
  assert.match(favicon, /#ff2f92/);
});
