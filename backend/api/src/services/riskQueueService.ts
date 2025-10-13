import { Queue } from "bullmq";

import { createQueue, RISK_RECALC_QUEUE } from "../../../workers/queues";
import type { GraphQLContext } from "../context";

let queue: Queue | null = null;

function getQueue() {
  if (!queue) {
    queue = createQueue(RISK_RECALC_QUEUE);
  }
  return queue;
}

export async function enqueueRiskSnapshot(ctx: GraphQLContext, userAddress: string): Promise<string> {
  if (!userAddress) {
    throw new Error("userAddress is required");
  }
  const normalized = userAddress.toLowerCase();
  const job = await getQueue().add("risk-recalc", { userAddress: normalized }, { removeOnComplete: true, removeOnFail: 50 });
  return job.id as string;
}
