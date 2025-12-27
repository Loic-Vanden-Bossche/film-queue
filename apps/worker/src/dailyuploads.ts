import fs from "node:fs";
import path from "node:path";
import { setTimeout } from "node:timers/promises";

import puppeteer from "puppeteer";

import {
  DAILYUPLOADS_COOKIE_PATH,
  DAILYUPLOADS_LOGIN_URL,
  DAILYUPLOADS_PASS,
  DAILYUPLOADS_USER,
  DEFAULT_USER_AGENT,
  PUPPETEER_EXECUTABLE_PATH,
  PUPPETEER_HEADLESS,
  PUPPETEER_TIMEOUT,
} from "./config";
import logger from "./logger";

export type StoredCookie = {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: string;
};

function ensureSessionDir() {
  const dir = path.dirname(DAILYUPLOADS_COOKIE_PATH);
  fs.mkdirSync(dir, { recursive: true });
}

function loadCookiesFromDisk(): StoredCookie[] | null {
  if (!fs.existsSync(DAILYUPLOADS_COOKIE_PATH)) return null;
  try {
    const raw = fs.readFileSync(DAILYUPLOADS_COOKIE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredCookie[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveCookiesToDisk(cookies: StoredCookie[]) {
  ensureSessionDir();
  fs.writeFileSync(DAILYUPLOADS_COOKIE_PATH, JSON.stringify(cookies, null, 2));
}

function cookiesExpired(cookies: StoredCookie[]) {
  const now = Date.now();
  return cookies.some((cookie) => {
    if (!cookie.expires || cookie.expires <= 0) return false;
    return cookie.expires * 1000 < now;
  });
}

function domainMatches(hostname: string, domain?: string) {
  if (!domain) return false;
  const normalized = domain.startsWith(".") ? domain.slice(1) : domain;
  return hostname === normalized || hostname.endsWith(`.${normalized}`);
}

function pathMatches(pathname: string, cookiePath?: string) {
  if (!cookiePath) return true;
  return pathname.startsWith(cookiePath);
}

export function cookieHeaderForUrl(urlString: string, cookies: StoredCookie[]) {
  const url = new URL(urlString);
  const valid = cookies.filter((cookie) => {
    if (
      cookie.expires &&
      cookie.expires > 0 &&
      cookie.expires * 1000 < Date.now()
    ) {
      return false;
    }
    return (
      domainMatches(url.hostname, cookie.domain) &&
      pathMatches(url.pathname, cookie.path)
    );
  });
  if (!valid.length) return null;
  return valid.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

async function applyCookies(page: puppeteer.Page, cookies: StoredCookie[]) {
  if (!cookies.length) return;
  await page.setCookie(
    ...(cookies.map((cookie) => ({
      name: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite as puppeteer.Protocol.Network.CookieSameSite,
    })) as puppeteer.Protocol.Network.CookieParam[]),
  );
}

async function loginDailyuploads(page: puppeteer.Page) {
  if (!DAILYUPLOADS_USER || !DAILYUPLOADS_PASS) {
    throw new Error("Missing DAILYUPLOADS_USER or DAILYUPLOADS_PASS");
  }

  await page.goto(DAILYUPLOADS_LOGIN_URL, { waitUntil: "domcontentloaded" });

  const userSelectors = [
    "input[name='email']",
    "input[name='username']",
    "input[name='login']",
    "input[type='email']",
    "input[type='text']",
  ];
  const passSelectors = ["input[name='password']", "input[type='password']"];

  for (const selector of userSelectors) {
    const field = await page.$(selector);
    if (field) {
      await page.focus(selector).catch(() => undefined);
      await page.evaluate(
        (value, sel) => {
          const input = document.querySelector<HTMLInputElement>(sel);
          if (input) {
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
        DAILYUPLOADS_USER,
        selector,
      );
      break;
    }
  }

  for (const selector of passSelectors) {
    const passField = await page.$(selector);
    if (passField) {
      await page.focus(selector).catch(() => undefined);
      await page.evaluate(
        (value, sel) => {
          const input = document.querySelector<HTMLInputElement>(sel);
          if (input) {
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        },
        DAILYUPLOADS_PASS,
        selector,
      );
      break;
    }
  }

  await page.keyboard.press("Enter");
  await page
    .waitForNavigation({
      waitUntil: "domcontentloaded",
      timeout: PUPPETEER_TIMEOUT,
    })
    .catch(() => undefined);

  const stillLogin = (await page.$("input[type='password']")) !== null;
  if (stillLogin) {
    throw new Error("Login failed for dailyuploads.net");
  }

  const cookies = await page.cookies("https://dailyuploads.net");
  saveCookiesToDisk(cookies as StoredCookie[]);
  logger.info("Saved dailyuploads.net cookies");
}

export async function resolveDailyuploadsUrl(
  urlString: string,
  isCancelled: () => boolean,
) {
  logger.info({ url: urlString }, "Launching browser for dailyuploads.net");
  const browser = await puppeteer.launch({
    headless: PUPPETEER_HEADLESS ? "new" : false,
    executablePath: PUPPETEER_EXECUTABLE_PATH,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(PUPPETEER_TIMEOUT);
    page.setDefaultNavigationTimeout(PUPPETEER_TIMEOUT);

    const safeGoto = async (target: string) => {
      try {
        await page.goto(target, { waitUntil: "domcontentloaded" });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("ERR_ABORTED")) {
          throw error;
        }
        logger.warn({ url: target }, "Navigation aborted, continuing");
      }
    };

    let directDownloadUrl: string | null = null;
    const userAgent = DEFAULT_USER_AGENT;
    await page.setUserAgent(userAgent);

    page.on("response", (response) => {
      const headers = response.headers();
      const disposition = headers["content-disposition"] || "";
      const contentType = headers["content-type"] || "";
      if (
        disposition.toLowerCase().includes("attachment") ||
        contentType.toLowerCase().includes("application/octet-stream")
      ) {
        directDownloadUrl = response.url();
      }
    });

    const storedCookies = loadCookiesFromDisk() || [];
    if (storedCookies.length) {
      logger.info({ count: storedCookies.length }, "Loaded stored cookies");
      await applyCookies(page, storedCookies);
    }

    await safeGoto(urlString);

    const needsLogin =
      page.url().includes("/login") ||
      (await page.$("input[type='password']")) !== null ||
      storedCookies.length === 0 ||
      cookiesExpired(storedCookies);

    if (needsLogin) {
      if (isCancelled()) {
        throw new Error("Cancelled");
      }
      logger.info("Refreshing dailyuploads.net login session");
      await loginDailyuploads(page);
      await safeGoto(urlString);
    }

    const start = Date.now();
    let lastUrl = page.url();

    while (Date.now() - start < PUPPETEER_TIMEOUT) {
      await setTimeout(1000);
      if (isCancelled()) {
        throw new Error("Cancelled");
      }
      if (directDownloadUrl) {
        const cookies = (await page.cookies(
          "https://dailyuploads.net",
        )) as StoredCookie[];
        saveCookiesToDisk(cookies);
        return {
          resolvedUrl: directDownloadUrl,
          cookies,
          userAgent,
          referer: page.url(),
        };
      }
      const currentUrl = page.url();
      if (currentUrl !== lastUrl && !currentUrl.includes("dailyuploads.net")) {
        logger.info(
          { resolvedUrl: currentUrl },
          "Resolved direct download URL",
        );
        const cookies = (await page.cookies(
          "https://dailyuploads.net",
        )) as StoredCookie[];
        saveCookiesToDisk(cookies);
        return {
          resolvedUrl: currentUrl,
          cookies,
          userAgent,
          referer: page.url(),
        };
      }
      lastUrl = currentUrl;

      const candidate = await page.evaluate(() => {
        const anchors = Array.from(
          document.querySelectorAll<HTMLAnchorElement>("a[href]"),
        );
        const match = anchors.find((anchor) => {
          const href = anchor.href;
          return href && !href.includes("dailyuploads.net");
        });
        return match?.href || null;
      });

      if (candidate) {
        logger.info({ resolvedUrl: candidate }, "Resolved anchor download URL");
        const cookies = (await page.cookies(
          "https://dailyuploads.net",
        )) as StoredCookie[];
        saveCookiesToDisk(cookies);
        return {
          resolvedUrl: candidate,
          cookies,
          userAgent,
          referer: page.url(),
        };
      }
    }

    const cookies = (await page.cookies(
      "https://dailyuploads.net",
    )) as StoredCookie[];
    saveCookiesToDisk(cookies);
    return { resolvedUrl: urlString, cookies, userAgent, referer: page.url() };
  } finally {
    await browser.close();
  }
}
