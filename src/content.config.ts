import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { founderAuthorityApproved, workRightsApproved } from "./lib/release-gates.mjs";

const localizedItem = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
});

const site = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/site" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    languageName: z.string(),
    routes: z.array(z.string()).min(11),
    meta: z.object({ title: z.string(), description: z.string() }),
    nav: z.array(z.object({ id: z.string(), label: z.string(), href: z.string() })),
    hero: z.object({
      eyebrow: z.string(),
      title: z.string(),
      lead: z.string().optional(),
      primaryCta: z.string(),
      metaFact: z.string(),
      workLabel: z.string(),
    }),
    finalCta: z.object({ title: z.string(), body: z.string(), action: z.string() }),
    previewNotice: z.string(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/services" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    intro: z.string(),
    items: z.array(
      localizedItem.extend({
        situation: z.string(),
        outcome: z.string(),
        includes: z.array(z.string()).min(3),
        boundary: z.string(),
        cta: z.string(),
      }),
    ).length(3),
  }),
});

const processCollection = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/process" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    intro: z.string(),
    items: z.array(localizedItem.extend({ summary: z.string(), output: z.string() })).length(5),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/team" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    intro: z.string(),
    productionReady: z.boolean(),
    gateNotice: z.string(),
    items: z.array(
      z.object({
        id: z.string(),
        publicName: z.string().nullable(),
        role: z.string().nullable(),
        biography: z.string().nullable(),
        portrait: z.string().nullable(),
        links: z.array(z.string()),
      }),
    ).length(2),
  }).superRefine((entry, context) => {
    if (process.env.POVKH_SITE_MODE === "production" && !founderAuthorityApproved(entry)) {
      context.addIssue({ code: "custom", message: "Two complete founder records and approved portraits are required for production" });
    }
  }),
});

const faq = defineCollection({
  loader: glob({ pattern: "*.json", base: "./src/content/faq" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    items: z.array(localizedItem.extend({ answer: z.string() })).min(3),
  }),
});

const work = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/work" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    caseSlug: z.string(),
    title: z.string(),
    summary: z.string(),
    context: z.string(),
    scope: z.array(z.string()),
    featuredScope: z.string(),
    relationship: z.enum(["founder-led", "client"]),
    order: z.number().int().positive(),
    featured: z.boolean(),
    disclosure: z.string().min(20),
    evidenceDate: z.coerce.date(),
    sourceRoot: z.url(),
    publicSource: z.string().min(1),
    rightsStatus: z.enum(["owner-confirmation-required", "approved"]),
    liveSite: z.url(),
  }).superRefine((entry, context) => {
    if (process.env.POVKH_SITE_MODE === "production" && !workRightsApproved(entry)) {
      context.addIssue({ code: "custom", message: `${entry.caseSlug} asset rights must be approved for production` });
    }
  }),
});

const legal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/legal" }),
  schema: z.object({
    locale: z.enum(["en", "ru"]),
    kind: z.enum(["privacy", "cookies"]),
    title: z.string(),
    status: z.enum(["draft", "approved"]),
    reviewNotice: z.string(),
  }).superRefine((entry, context) => {
    if (process.env.POVKH_SITE_MODE === "production" && entry.status !== "approved") {
      context.addIssue({
        code: "custom",
        message: `${entry.kind} legal copy must be approved for production`,
      });
    }
  }),
});

export const collections = {
  site,
  services,
  process: processCollection,
  team,
  faq,
  work,
  legal,
};
