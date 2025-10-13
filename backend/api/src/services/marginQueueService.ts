import { createQueue, MARGIN_CHECK_QUEUE } from "../../../workers/queues";
import { normalizeAddress } from "../utils/address";

let queue: ReturnType<typeof createQueue> | null = null;

function getQueue() {
  if (!queue) {
    queue = createQueue(MARGIN_CHECK_QUEUE);
  }
  return queue;
}

export type MarginCheckPayload = {
  account: string;
  seriesId?: string | null;
  size?: string | null;
  receiver?: string | null;
};

export async function enqueueMarginCheck(payload: MarginCheckPayload): Promise<string> {
  if (!payload.account) throw new Error("account is required");
  const job = await getQueue().add(
    "margin-check",
    {
      account: normalizeAddress(payload.account),
      seriesId: payload.seriesId ? payload.seriesId.toLowerCase() : null,
      size: payload.size ?? null,
      receiver: payload.receiver ? normalizeAddress(payload.receiver) : null
    },
    { removeOnComplete: true, removeOnFail: 100 }
  );
  return job.id ?? "";
}
