import { createQueue, GREEKS_QUEUE } from "../../../workers/queues";
import { normalizeSeriesId } from "./settlementService";

let queue: ReturnType<typeof createQueue> | null = null;

function getQueue() {
  if (!queue) {
    queue = createQueue(GREEKS_QUEUE);
  }
  return queue;
}

export async function enqueueGreeks(seriesId: string): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  const job = await getQueue().add(
    "greeks",
    { seriesId: normalizeSeriesId(seriesId) },
    { removeOnComplete: true, removeOnFail: 50 }
  );
  return job.id ?? "";
}
