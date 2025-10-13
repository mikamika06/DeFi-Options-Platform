import { Queue } from "bullmq";

import { redisOptions } from "./lib/redis";

export const RISK_RECALC_QUEUE = "risk_recalc";

export function createQueue(name: string) {
  return new Queue(name, { connection: redisOptions });
}
