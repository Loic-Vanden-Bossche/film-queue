import fs from "node:fs";
import http from "node:http";
import https from "node:https";

import { DEFAULT_USER_AGENT, DOWNLOAD_REQUEST_TIMEOUT_MS } from "./config";
import logger from "./logger";

export function downloadToFile(
  urlString: string,
  targetPath: string,
  onBytes: (bytes: number) => void,
  onMeta: (totalBytes: number | null) => void,
  isCancelled: () => boolean,
  isPaused: () => boolean,
  headers: Record<string, string> | null,
  redirectCount = 0,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error("Too many redirects"));
      return;
    }

    let urlObj: URL;
    try {
      urlObj = new URL(urlString);
    } catch {
      reject(new Error("Invalid URL"));
      return;
    }

    const client = urlObj.protocol === "https:" ? https : http;
    let responseRef: http.IncomingMessage | null = null;
    let fileStream: fs.WriteStream | null = null;
    let streamPaused = false;

    const abortDownload = () => {
      const error = new Error("Cancelled");
      if (responseRef) {
        responseRef.destroy(error);
      }
      if (fileStream) {
        fileStream.destroy(error);
      }
      request.destroy(error);
    };

    const finalHeaders: Record<string, string> = {
      "User-Agent": DEFAULT_USER_AGENT,
      ...(headers || {}),
    };

    const request = client.get(
      urlObj,
      { headers: finalHeaders },
      (response) => {
        responseRef = response;
        const statusCode = response.statusCode || 0;
        logger.info(
          { url: urlString, statusCode },
          "Download response received",
        );

        if (
          statusCode >= 300 &&
          statusCode < 400 &&
          response.headers.location
        ) {
          response.resume();
          const nextUrl = new URL(response.headers.location, urlObj).toString();
          downloadToFile(
            nextUrl,
            targetPath,
            onBytes,
            onMeta,
            isCancelled,
            isPaused,
            headers,
            redirectCount + 1,
          )
            .then(resolve)
            .catch(reject);
          return;
        }

        if (statusCode < 200 || statusCode >= 300) {
          response.resume();
          reject(new Error(`HTTP ${statusCode}`));
          return;
        }

        const totalHeader = response.headers["content-length"];
        const totalBytes = totalHeader
          ? Number.parseInt(totalHeader, 10)
          : null;
        onMeta(Number.isFinite(totalBytes ?? NaN) ? totalBytes : null);

        fileStream = fs.createWriteStream(targetPath);
        response.on("data", (chunk: Buffer) => {
          if (isCancelled()) {
            abortDownload();
            return;
          }
          if (isPaused()) {
            response.pause();
            streamPaused = true;
            return;
          }
          onBytes(chunk.length);
        });

        response.pipe(fileStream);

        fileStream.on("finish", () => {
          fileStream?.close(resolve);
        });

        fileStream.on("error", (error) => {
          fs.unlink(targetPath, () => reject(error));
        });
      },
    );

    const cancelTimer = setInterval(() => {
      if (isCancelled()) {
        abortDownload();
      }
    }, 500);

    const pauseTimer = setInterval(() => {
      if (!responseRef) return;
      if (isPaused()) {
        if (!streamPaused) {
          responseRef.pause();
          streamPaused = true;
        }
        return;
      }
      if (streamPaused) {
        responseRef.resume();
        streamPaused = false;
      }
    }, 500);

    const requestTimeoutMs = DOWNLOAD_REQUEST_TIMEOUT_MS;
    request.setTimeout(requestTimeoutMs, () => {
      logger.warn(
        { url: urlString, timeoutMs: requestTimeoutMs },
        "Download request timed out",
      );
      request.destroy(new Error("Request timeout"));
    });

    request.on("socket", (socket) => {
      socket.setTimeout(requestTimeoutMs);
      socket.on("timeout", () => {
        logger.warn({ url: urlString }, "Socket timeout");
      });
    });

    request.on("abort", () => {
      logger.warn({ url: urlString }, "Request aborted");
    });

    request.on("error", (error) => {
      clearInterval(cancelTimer);
      clearInterval(pauseTimer);
      logger.error({ url: urlString, err: error }, "Download request error");
      reject(error);
    });

    request.on("close", () => {
      clearInterval(cancelTimer);
      clearInterval(pauseTimer);
    });
  });
}
