import { getKeeperIvOracle } from "./keeperService";
import { normalizeSeriesId, parseBigInt } from "./settlementService";

export async function executeIvUpdate(seriesId: string, ivWad: string): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  if (!ivWad) throw new Error("iv is required");

  const normalizedId = normalizeSeriesId(seriesId);
  const iv = parseBigInt(ivWad, "iv");
  const contract = getKeeperIvOracle();
  const tx = await (contract as any).setIV(normalizedId, iv);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}
