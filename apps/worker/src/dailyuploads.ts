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

const DAILYUPLOADS_ORIGIN = "https://dailyuploads.net/";
const DEBUG_DU = process.env.DEBUG_DAILYUPLOADS === "1";

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

function normalizeSameSite(
  v?: string,
): puppeteer.Protocol.Network.CookieSameSite | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  if (s === "lax") return "Lax";
  if (s === "strict") return "Strict";
  if (s === "none") return "None";
  return undefined;
}

async function applyCookies(page: puppeteer.Page, cookies: StoredCookie[]) {
  if (!cookies.length) return;

  // Use `url` to avoid “about:blank” / domain scoping weirdness
  // and to make Chromium accept them consistently.
  const params = cookies.map((cookie) => ({
    url: DAILYUPLOADS_ORIGIN,
    name: cookie.name,
    value: cookie.value,
    domain: cookie.domain,
    path: cookie.path,
    expires: cookie.expires,
    httpOnly: cookie.httpOnly,
    secure: cookie.secure,
    sameSite: normalizeSameSite(cookie.sameSite),
  }));

  // Filter out any cookie missing required values
  const safeParams = params.filter(
    (c) => c.name && typeof c.value === "string",
  );
  if (!safeParams.length) return;

  await page.setCookie(
    ...(safeParams as puppeteer.Protocol.Network.CookieParam[]),
  );
}

async function debugDump(page: puppeteer.Page, label: string) {
  if (!DEBUG_DU) return;
  try {
    ensureSessionDir();
    const ts = Date.now();
    const base = path.join(
      path.dirname(DAILYUPLOADS_COOKIE_PATH),
      `du-${label}-${ts}`,
    );
    await page.screenshot({ path: `${base}.png`, fullPage: true });
    const html = await page.content();
    fs.writeFileSync(`${base}.html`, html);
    logger.info(
      { fileBase: base, url: page.url(), title: await page.title() },
      "Debug dump saved",
    );
  } catch (e) {
    logger.warn({ err: String(e) }, "Debug dump failed");
  }
}

async function looksLikeChallenge(page: puppeteer.Page) {
  const title = (await page.title().catch(() => "")) || "";
  if (title.toLowerCase().includes("just a moment")) return true;

  // Common cloudflare/anti-bot phrases
  const bodyText = await page.evaluate(
    () => document.body?.innerText?.slice(0, 2000) || "",
  );
  const t = bodyText.toLowerCase();
  return (
    t.includes("checking your browser") ||
    t.includes("verify you are human") ||
    t.includes("cloudflare") ||
    t.includes("attention required") ||
    t.includes("turnstile")
  );
}

async function waitForLoginForm(page: puppeteer.Page) {
  // Wait for either a password field or something that indicates a challenge
  await Promise.race([
    page.waitForSelector("input[type='password']", { timeout: 15000 }),
    page.waitForFunction(
      () => {
        const t = (document.title || "").toLowerCase();
        const b = (document.body?.innerText || "").toLowerCase();
        return (
          t.includes("just a moment") ||
          b.includes("checking your browser") ||
          b.includes("verify you are human") ||
          b.includes("turnstile")
        );
      },
      { timeout: 15000 },
    ),
  ]).catch(() => undefined);
}

async function loginDailyuploads(page: puppeteer.Page) {
  if (!DAILYUPLOADS_USER || !DAILYUPLOADS_PASS) {
    throw new Error("Missing DAILYUPLOADS_USER or DAILYUPLOADS_PASS");
  }

  // Ensure we are on the right origin before doing anything with cookies/forms
  await page
    .goto(DAILYUPLOADS_ORIGIN, { waitUntil: "domcontentloaded" })
    .catch(() => undefined);

  await page.goto(DAILYUPLOADS_LOGIN_URL, { waitUntil: "domcontentloaded" });

  await waitForLoginForm(page);
  await debugDump(page, "login-page");

  if (await looksLikeChallenge(page)) {
    throw new Error(
      "Blocked by anti-bot/challenge on dailyuploads.net (challenge page detected). " +
        "Enable DEBUG_DAILYUPLOADS=1 to save screenshot/html and verify.",
    );
  }

  const userSelectors = [
    "input[name='email']",
    "input[name='username']",
    "input[name='login']",
    "input[type='email']",
    "input[type='text']",
  ];
  const passSelectors = ["input[name='password']", "input[type='password']"];

  let userSel: string | null = null;
  for (const selector of userSelectors) {
    const field = await page.$(selector);
    if (field) {
      userSel = selector;
      break;
    }
  }

  let passSel: string | null = null;
  for (const selector of passSelectors) {
    const field = await page.$(selector);
    if (field) {
      passSel = selector;
      break;
    }
  }

  if (!userSel || !passSel) {
    await debugDump(page, "login-missing-fields");
    throw new Error("Login form fields not found on dailyuploads.net");
  }

  // Use real typing (more sites detect direct value assignment)
  await page.click(userSel, { clickCount: 3 }).catch(() => undefined);
  await page.type(userSel, DAILYUPLOADS_USER, { delay: 20 });

  await page.click(passSel, { clickCount: 3 }).catch(() => undefined);
  await page.type(passSel, DAILYUPLOADS_PASS, { delay: 20 });

  await page.keyboard.press("Enter");

  await page
    .waitForNavigation({
      waitUntil: "domcontentloaded",
      timeout: PUPPETEER_TIMEOUT,
    })
    .catch(() => undefined);

  await debugDump(page, "login-after-submit");

  if (await looksLikeChallenge(page)) {
    throw new Error(
      "Login blocked by anti-bot/challenge after submit (challenge detected). " +
        "Enable DEBUG_DAILYUPLOADS=1 to inspect screenshot/html.",
    );
  }

  // Still on login if password field is still present
  const stillLogin =
    (await page.$("input[type='password']")) !== null ||
    page.url().includes("/login");
  if (stillLogin) {
    throw new Error("Login failed for dailyuploads.net (still on login page)");
  }

  const cookies = await page.cookies(DAILYUPLOADS_ORIGIN);
  saveCookiesToDisk(cookies as StoredCookie[]);
  logger.info("Saved dailyuploads.net cookies");
}

export async function resolveDailyuploadsUrl(
  urlString: string,
  isCancelled: () => boolean,
) {
  logger.info({ url: urlString }, "Launching browser for dailyuploads.net");

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: PUPPETEER_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(PUPPETEER_TIMEOUT);
    page.setDefaultNavigationTimeout(PUPPETEER_TIMEOUT);

    // IMPORTANT: set UA + viewport BEFORE any navigation
    const userAgent = DEFAULT_USER_AGENT;
    await page.setUserAgent(userAgent);
    await page.setViewport({ width: 1366, height: 768 });

    const safeGoto = async (
      target: string,
      waitUntil: puppeteer.PuppeteerLifeCycleEvent = "domcontentloaded",
    ) => {
      try {
        await page.goto(target, { waitUntil, timeout: PUPPETEER_TIMEOUT });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes("ERR_ABORTED")) {
          throw error;
        }
        logger.warn({ url: target }, "Navigation aborted, continuing");
      }
    };

    let directDownloadUrl: string | null = null;

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

    // Establish origin before applying cookies (avoids about:blank issues)
    await safeGoto(DAILYUPLOADS_ORIGIN, "domcontentloaded");

    const storedCookies = loadCookiesFromDisk() || [];
    if (storedCookies.length) {
      logger.info({ count: storedCookies.length }, "Loaded stored cookies");
      await applyCookies(page, storedCookies);
    }

    // Now go to target page; networkidle2 can be useful for JS-generated links
    await safeGoto(urlString, "networkidle2");
    await debugDump(page, "target-after-first-goto");

    // Better login decision: expired/empty cookies OR redirected to login OR password field visible
    const needsLogin =
      storedCookies.length === 0 ||
      cookiesExpired(storedCookies) ||
      page.url().includes("/login") ||
      (await page.$("input[type='password']")) !== null;

    if (needsLogin) {
      if (isCancelled()) throw new Error("Cancelled");
      logger.info("Refreshing dailyuploads.net login session");
      await loginDailyuploads(page);

      // Try again after login
      await safeGoto(urlString, "networkidle2");
      await debugDump(page, "target-after-login");
    }

    if (await looksLikeChallenge(page)) {
      await debugDump(page, "target-challenge");
      throw new Error(
        "Blocked by anti-bot/challenge on target page. " +
          "Enable DEBUG_DAILYUPLOADS=1 to inspect screenshot/html.",
      );
    }

    const start = Date.now();
    let lastUrl = page.url();

    while (Date.now() - start < PUPPETEER_TIMEOUT) {
      await setTimeout(1000);
      if (isCancelled()) throw new Error("Cancelled");

      if (directDownloadUrl) {
        const cookies = (await page.cookies(
          DAILYUPLOADS_ORIGIN,
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
          DAILYUPLOADS_ORIGIN,
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
          DAILYUPLOADS_ORIGIN,
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

    const cookies = (await page.cookies(DAILYUPLOADS_ORIGIN)) as StoredCookie[];
    saveCookiesToDisk(cookies);
    return { resolvedUrl: urlString, cookies, userAgent, referer: page.url() };
  } finally {
    await browser.close();
  }
}
