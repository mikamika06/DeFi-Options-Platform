import { ZERO_ADDRESS } from "../utils/constants";
import { getKeeperOptionsMarket } from "./keeperService";
import { normalizeAddress } from "../utils/address";

export async function executeLiquidation(
  seriesId: string,
  account: string,
  size: string,
  receiver?: string | null
): Promise<string> {
  if (!seriesId) throw new Error("seriesId is required");
  if (!account) throw new Error("account is required");
  if (!size) throw new Error("size is required");

  const normalizedId = normalizeSeriesId(seriesId);
  const liquidatedAccount = normalizeAddress(account);
  const sizeBigInt = parseBigInt(size, "size");
  const receiverAddress = receiver ? normalizeAddress(receiver) : ZERO_ADDRESS;

  const contract = getKeeperOptionsMarket();
  const tx = await (contract as any).liquidatePosition(normalizedId, liquidatedAccount, sizeBigInt, receiverAddress);
  const receipt = await tx.wait();
  return receipt?.hash ?? tx.hash;
}

export function normalizeSeriesId(seriesId: string): string {
  const value = seriesId.toLowerCase();
  if (!value.startsWith("0x") || value.length !== 66) {
    throw new Error("seriesId must be 32-byte hex string");
  }
  return value;
}

function parseBigInt(value: string, field: string): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new Error(`${field} must be bigint-compatible string`);
  }
}
