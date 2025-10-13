import { createQueue, LIQUIDATION_QUEUE } from "../../../workers/queues";
import { normalizeAddress } from "../utils/address";

let queue: ReturnType<typeof createQueue> | null = null;

function getQueue() {
  if (!queue) {
    queue = createQueue(LIQUIDATION_QUEUE);
  }
  return queue;
}

export async function enqueueLiquidation(
  seriesId: string,
  account: string,
  size: string,
  receiver?: string | null
): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  if (!account) throw new Error("account is required");
  if (!size) throw new Error("size is required");

  const job = await getQueue().add(
    "liquidation",
    {
      seriesId: seriesId.toLowerCase(),
      account: normalizeAddress(account),
      size,
      receiver: receiver ? normalizeAddress(receiver) : null
    },
    { removeOnComplete: true, removeOnFail: 50 }
  );
  return job.id ?? "";
}
