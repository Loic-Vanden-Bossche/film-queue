import fs from "node:fs";
import path from "node:path";

import checkDiskSpace from "check-disk-space";

import { downloadsDir, FOLDER_STATS_KEY } from "./config";
import logger from "./logger";
import { connection } from "./redis";

export type FolderStats = {
  name: string;
  path: string;
  sizeBytes: number;
  freeBytes: number;
  totalBytes: number;
  updatedAt: number;
};

async function getDirectorySize(dirPath: string) {
  let total = 0;
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        total += await getDirectorySize(entryPath);
      } else if (entry.isSymbolicLink()) {
        const realPath = await fs.promises.realpath(entryPath);
        const stat = await fs.promises.stat(realPath);
        if (stat.isDirectory()) {
          total += await getDirectorySize(realPath);
        } else {
          total += stat.size;
        }
      } else if (entry.isFile()) {
        const stat = await fs.promises.stat(entryPath);
        total += stat.size;
      }
    } catch {
      // Skip entries that cannot be read.
    }
  }
  return total;
}

async function loadFolderStats() {
  const entries = await fs.promises.readdir(downloadsDir, {
    withFileTypes: true,
  });
  const folders: Array<{ name: string; path: string }> = [];
  for (const entry of entries) {
    const entryPath = path.join(downloadsDir, entry.name);
    if (entry.isDirectory()) {
      folders.push({ name: entry.name, path: entryPath });
      continue;
    }
    if (entry.isSymbolicLink()) {
      try {
        const realPath = await fs.promises.realpath(entryPath);
        const stat = await fs.promises.stat(realPath);
        if (stat.isDirectory()) {
          folders.push({ name: entry.name, path: realPath });
        }
      } catch {
        // Ignore invalid symlinks.
      }
    }
  }
  const results: FolderStats[] = [];
  const now = Date.now();

  for (const folder of folders) {
    const disk = await checkDiskSpace(folder.path);
    const sizeBytes = await getDirectorySize(folder.path);
    results.push({
      name: folder.name,
      path: folder.path,
      sizeBytes,
      freeBytes: disk.free,
      totalBytes: disk.size,
      updatedAt: now,
    });
  }

  return results;
}

export async function refreshFolderStats() {
  try {
    const stats = await loadFolderStats();
    await connection.set(FOLDER_STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    logger.warn({ err: error }, "Failed to refresh folder stats");
  }
}

function isSafeFolderName(name: string) {
  return (
    name.length > 0 &&
    !name.includes("..") &&
    !name.includes("/") &&
    !name.includes("\\")
  );
}

export async function resolveFolderPath(folderName?: string | null) {
  if (!folderName) {
    return { folderName: null, folderPath: downloadsDir };
  }
  if (!isSafeFolderName(folderName)) {
    throw new Error("Invalid folder name");
  }
  const folderPath = path.join(downloadsDir, folderName);
  if (!folderPath.startsWith(downloadsDir)) {
    throw new Error("Invalid folder path");
  }
  const stat = await fs.promises.stat(folderPath);
  if (!stat.isDirectory()) {
    throw new Error("Folder is not a directory");
  }
  return { folderName, folderPath };
}
