import { ZERO_ADDRESS } from "./constants";

export function normalizeAddress(value?: string | null): string {
  if (!value) return ZERO_ADDRESS;
  return value.toLowerCase();
}
