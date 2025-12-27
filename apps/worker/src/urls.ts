import path from "node:path";

export function guessFilename(urlObj: URL, id: string) {
  const base = path.basename(urlObj.pathname || "");
  if (!base || base === "/" || base === ".") {
    return `download-${id}`;
  }
  return base;
}

export function isProtectedUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.hostname.endsWith("dl-protect.link");
  } catch {
    return false;
  }
}

export function isDailyuploadsUrl(urlString: string) {
  try {
    const url = new URL(urlString);
    return url.hostname.endsWith("dailyuploads.net");
  } catch {
    return false;
  }
}
