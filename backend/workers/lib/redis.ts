import type { RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";

export function parseRedisUrl(url: string): RedisOptions {
  const parsed = new URL(url);
  const options: RedisOptions = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    password: parsed.password || undefined
  };
  if (parsed.pathname && parsed.pathname.length > 1) {
    options.db = Number(parsed.pathname.slice(1));
  }
  return options;
}

export const redisOptions = parseRedisUrl(redisUrl);
