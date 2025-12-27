import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { Worker } from "bullmq";

import {
  CANCEL_PREFIX,
  FOLDER_STATS_INTERVAL_MS,
  MAX_CONCURRENT,
  QUEUE_PAUSE_KEY,
} from "./config";
import type { StoredCookie } from "./dailyuploads";
import { cookieHeaderForUrl, resolveDailyuploadsUrl } from "./dailyuploads";
import { downloadToFile } from "./download";
import { publishEvent } from "./events";
import { refreshFolderStats, resolveFolderPath } from "./folders";
import { triggerLibraryScan } from "./jellyfin";
import logger from "./logger";
import { resolveProtectedUrl } from "./protected";
import { connection } from "./redis";
import { guessFilename, isDailyuploadsUrl, isProtectedUrl } from "./urls";

type DownloadJob = {
  url: string;
  folder?: string | null;
};

export function startWorker() {
  refreshFolderStats();
  setInterval(refreshFolderStats, FOLDER_STATS_INTERVAL_MS);

  return new Worker<DownloadJob>(
    "download-queue",
    async (job) => {
      const cancelKey = `${CANCEL_PREFIX}${job.id}`;
      let cancelled = false;
      let paused = false;
      logger.info({ jobId: job.id, url: job.data.url }, "Job received");

      const pollCancel = setInterval(() => {
        connection
          .get(cancelKey)
          .then((flag) => {
            cancelled = flag === "1";
            if (cancelled) {
              logger.info({ jobId: job.id }, "Cancel flag detected");
            }
          })
          .catch(() => undefined);
      }, 1000);

      const pollPause = setInterval(() => {
        connection
          .get(QUEUE_PAUSE_KEY)
          .then((flag) => {
            const nextPaused = flag === "1";
            if (nextPaused !== paused) {
              paused = nextPaused;
              logger.info(
                { jobId: job.id, paused },
                paused ? "Queue paused for job" : "Queue resumed for job",
              );
            }
          })
          .catch(() => undefined);
      }, 1000);

      let resolvedUrl = job.data.url;
      let requestHeaders: Record<string, string> | null = null;

      const resolvedFolder = await resolveFolderPath(job.data.folder);

      if (isDailyuploadsUrl(resolvedUrl)) {
        logger.info(
          { jobId: job.id, url: resolvedUrl },
          "Resolving dailyuploads.net URL",
        );
        try {
          const resolved = await resolveDailyuploadsUrl(
            resolvedUrl,
            () => cancelled,
          );
          resolvedUrl = resolved.resolvedUrl;
          const cookieHeader = cookieHeaderForUrl(
            resolvedUrl,
            (resolved.cookies || []) as StoredCookie[],
          );
          if (cookieHeader) {
            logger.info({ jobId: job.id }, "Applied dailyuploads cookies");
            requestHeaders = { Cookie: cookieHeader };
          }
          if (resolved.userAgent) {
            requestHeaders = {
              ...(requestHeaders || {}),
              "User-Agent": resolved.userAgent,
            };
          }
          if (resolved.referer) {
            requestHeaders = {
              ...(requestHeaders || {}),
              Referer: resolved.referer,
              Origin: new URL(resolved.referer).origin,
            };
          }
        } catch (error) {
          logger.error(
            { jobId: job.id, url: resolvedUrl, err: error },
            "Failed to resolve dailyuploads.net URL",
          );
        }
      }

      if (isProtectedUrl(resolvedUrl)) {
        logger.info(
          { jobId: job.id, url: resolvedUrl },
          "Resolving protected URL",
        );
        try {
          resolvedUrl = await resolveProtectedUrl(resolvedUrl);
          logger.info(
            { jobId: job.id, url: job.data.url, resolvedUrl },
            "Resolved protected URL",
          );
        } catch (error) {
          logger.error(
            { jobId: job.id, url: job.data.url, err: error },
            "Failed to resolve protected URL",
          );
        }
      }

      const urlObj = new URL(resolvedUrl);
      const filename = guessFilename(urlObj, job.id || randomUUID());
      const safeName = filename;
      const targetPath = path.join(resolvedFolder.folderPath, safeName);
      logger.info(
        {
          jobId: job.id,
          resolvedUrl,
          targetPath,
          folder: resolvedFolder.folderName,
        },
        "Starting download",
      );

      let bytes = 0;
      let lastReported = 0;
      let totalBytes: number | null = null;

      await publishEvent({
        type: "started",
        jobId: job.id,
        url: job.data.url,
        folder: resolvedFolder.folderName,
      });

      let jobError: Error | null = null;
      try {
        const initialCancel = await connection.get(cancelKey);
        if (initialCancel === "1") {
          cancelled = true;
          throw new Error("Cancelled");
        }

        while (paused) {
          if (cancelled) {
            throw new Error("Cancelled");
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        await downloadToFile(
          resolvedUrl,
          targetPath,
          (chunkSize) => {
            bytes += chunkSize;
            if (bytes - lastReported >= 256 * 1024) {
              lastReported = bytes;
              job.updateProgress({ bytes, totalBytes });
              publishEvent({
                type: "progress",
                jobId: job.id,
                url: resolvedUrl,
                bytes,
                totalBytes,
              }).catch(() => undefined);
            }
          },
          (metaTotal) => {
            totalBytes = metaTotal;
            logger.info(
              { jobId: job.id, totalBytes },
              "Received download size",
            );
            job.updateProgress({ bytes, totalBytes });
            publishEvent({
              type: "metadata",
              jobId: job.id,
              url: resolvedUrl,
              totalBytes,
            }).catch(() => undefined);
          },
          () => cancelled,
          () => paused,
          requestHeaders,
        );
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Download failed");
        jobError = err;
        if (err.message === "Cancelled") {
          cancelled = true;
        }
      } finally {
        clearInterval(pollCancel);
        clearInterval(pollPause);
      }

      job.updateProgress({ bytes, totalBytes });
      if (cancelled) {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
        await publishEvent({
          type: "cancelled",
          jobId: job.id,
          url: resolvedUrl,
        });
        logger.info({ jobId: job.id, url: job.data.url }, "Download cancelled");
        throw new Error("Cancelled");
      }

      if (jobError) {
        logger.error(
          { jobId: job.id, url: job.data.url, err: jobError },
          "Download failed",
        );
        throw jobError;
      }

      await publishEvent({
        type: "completed",
        jobId: job.id,
        url: resolvedUrl,
        bytes,
        totalBytes,
        filename,
      });

      await connection.del(cancelKey);

      await triggerLibraryScan();

      logger.info(
        {
          jobId: job.id,
          url: resolvedUrl,
          bytes,
          totalBytes,
        filename,
        },
        "Download completed",
      );

      return { filename, bytes, totalBytes };
    },
    { connection, concurrency: MAX_CONCURRENT },
  );
}
