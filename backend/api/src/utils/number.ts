import { Prisma } from "@prisma/client";

export function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

export function toStringSafe(value: unknown): string {
  if (value === null || value === undefined) return "0";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "object" && value !== null && "toString" in value) {
    return (value as { toString(): string }).toString();
  }
  return String(value);
}
