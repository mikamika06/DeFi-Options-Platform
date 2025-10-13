import { Queue } from "bullmq";

import { redisOptions } from "./lib/redis";

export const RISK_RECALC_QUEUE = "risk_recalc";
export const SETTLEMENT_QUEUE = "settlement_queue";
export const LIQUIDATION_QUEUE = "liquidation_queue";
export const MARGIN_CHECK_QUEUE = "margin_check_queue";
export const IV_UPDATE_QUEUE = "iv_update_queue";
export const GREEKS_QUEUE = "greeks_queue";

export function createQueue(name: string) {
  return new Queue(name, { connection: redisOptions });
}
