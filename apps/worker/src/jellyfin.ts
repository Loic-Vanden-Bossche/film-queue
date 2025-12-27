import { JELLYFIN_API_KEY, JELLYFIN_URL } from "./config";
import logger from "./logger";

export async function triggerLibraryScan() {
  if (!JELLYFIN_API_KEY) {
    logger.info("Jellyfin API key not set, skipping library refresh");
    return;
  }

  const endpoint = `${JELLYFIN_URL.replace(/\/$/, "")}/Library/Refresh?api_key=${JELLYFIN_API_KEY}`;

  try {
    const response = await fetch(endpoint, { method: "POST" });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.warn(
        { status: response.status, body: text },
        "Jellyfin library refresh failed",
      );
      return;
    }
    logger.info("Jellyfin library refresh triggered");
  } catch (error) {
    logger.warn({ err: error }, "Jellyfin library refresh failed");
  }
}
