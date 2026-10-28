import type { Page } from "@playwright/test";

// Exercise an explicitly configured collector on the local preview only.
export async function configureTestAnalytics(page: Page) {
  await page.route(/http:\/\/127\.0\.0\.1:\d+\/(?:ru\/)?$/, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace("</head>", '<meta name="povkh-analytics-endpoint" content="/api/event"></head>');
    await route.fulfill({ response, body });
  });
}
