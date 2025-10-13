import { createQueue, IV_UPDATE_QUEUE } from "../../../workers/queues";
import { normalizeSeriesId } from "./settlementService";

let queue: ReturnType<typeof createQueue> | null = null;

function getQueue() {
  if (!queue) {
    queue = createQueue(IV_UPDATE_QUEUE);
  }
  return queue;
}

export async function enqueueIvUpdate(seriesId: string, ivWad: string): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  if (!ivWad) throw new Error("iv is required");

  const job = await getQueue().add(
    "iv-update",
    {
      seriesId: normalizeSeriesId(seriesId),
      ivWad
    },
    { removeOnComplete: true, removeOnFail: 50 }
  );
  return job.id ?? "";
}
