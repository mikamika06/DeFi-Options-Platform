import { createQueue, SETTLEMENT_QUEUE } from "../../../workers/queues";

let queue: ReturnType<typeof createQueue> | null = null;

function getQueue() {
  if (!queue) {
    queue = createQueue(SETTLEMENT_QUEUE);
  }
  return queue;
}

export async function enqueueSettlement(seriesId: string, residualRecipient?: string | null): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  const normalizedId = seriesId.toLowerCase();
  const job = await getQueue().add(
    "settlement",
    { seriesId: normalizedId, residualRecipient: residualRecipient?.toLowerCase() ?? null },
    { removeOnComplete: true, removeOnFail: 50, jobId: `settlement-${normalizedId}` }
  );
  return job.id ?? "";
}
