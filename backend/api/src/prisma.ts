import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["warn", "error"]
});

export type PrismaClientType = typeof prisma;

process.on("beforeExit", async () => {
  await prisma.$disconnect();
});
