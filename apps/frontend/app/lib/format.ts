export function formatBytes(bytes: number) {
  if (!bytes) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  if (mins < 1) return `${secs}s`;
  const hours = Math.floor(mins / 60);
  if (hours < 1) return `${mins}m ${secs}s`;
  return `${hours}h ${mins % 60}m`;
}

export function formatRate(bytesPerSecond: number) {
  if (!Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return "--";
  return `${formatBytes(bytesPerSecond)}/s`;
}

export function formatPercent(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(0)}%`;
}
