export function parseTimestampSeconds(value?: string | null): bigint | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    try {
      return BigInt(trimmed);
    } catch {
      return null;
    }
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return BigInt(Math.floor(date.getTime() / 1000));
}

export function secondsToIso(value?: bigint | number | null): string | null {
  if (value === undefined || value === null) return null;
  const big = typeof value === "bigint" ? value : BigInt(value);
  if (big === 0n) return null;
  const millis = Number(big) * 1000;
  if (!Number.isFinite(millis)) return null;
  return new Date(millis).toISOString();
}

export function parseDateBound(value?: string | null): Date | undefined {
  if (!value) return undefined;
  const timestamp = parseTimestampSeconds(value);
  if (timestamp === null) return undefined;
  const ms = Number(timestamp) * 1000;
  if (!Number.isFinite(ms)) return undefined;
  return new Date(ms);
}
