import { setTimeout } from "node:timers/promises";

import puppeteer from "puppeteer";

import {
  PUPPETEER_EXECUTABLE_PATH,
  PUPPETEER_HEADLESS,
  PUPPETEER_TIMEOUT,
} from "./config";
import logger from "./logger";
import { isProtectedUrl } from "./urls";

export async function resolveProtectedUrl(urlString: string) {
  const browser = await puppeteer.launch({
    headless: PUPPETEER_HEADLESS ? "new" : false,
    executablePath: PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(PUPPETEER_TIMEOUT);
    page.setDefaultNavigationTimeout(PUPPETEER_TIMEOUT);

    logger.info(
      { url: urlString },
      "Waiting for manual captcha solve in browser",
    );
    await page.goto(urlString, { waitUntil: "domcontentloaded" });

    const start = Date.now();
    let lastUrl = page.url();

    while (Date.now() - start < PUPPETEER_TIMEOUT) {
      await setTimeout(3000);
      const currentUrl = page.url();
      if (currentUrl !== lastUrl && !isProtectedUrl(currentUrl)) {
        return currentUrl;
      }
      lastUrl = currentUrl;

      const candidate = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("a[href]"),
        );
        const match = anchors.find((anchor) => {
          const href = anchor.href;
          const rel = (anchor.getAttribute("rel") || "").toLowerCase();
          return (
            href &&
            !href.includes("dl-protect.link") &&
            rel.includes("external") &&
            rel.includes("nofollow")
          );
        });
        return match?.href || null;
      });

      if (candidate) {
        return candidate;
      }
    }
  } finally {
    await browser.close();
  }

  return urlString;
}
