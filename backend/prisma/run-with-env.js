#!/usr/bin/env node

/**
 * Lightweight wrapper to execute Prisma CLI commands with the root `.env`
 * loaded, without relying on external binaries such as `dotenv-cli`.
 */

import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, "..");
const rootEnvPath = resolve(__dirname, "..", "..", ".env");

config({ path: rootEnvPath });

const [bin, ...args] = process.argv.slice(2);

if (!bin) {
  console.error("[run-with-env] Missing command to execute");
  process.exit(1);
}

const backendRoot = resolve(__dirname, "..");
const potentialBinPath = resolve(backendRoot, "node_modules", ".bin", bin);
const command = process.platform === "win32" ? `${bin}.cmd` : bin;
const candidateWithExt = resolve(backendRoot, "node_modules", ".bin", command);

const executable =
  spawnExists(potentialBinPath) ? potentialBinPath : spawnExists(candidateWithExt) ? candidateWithExt : bin;

const child = spawn(executable, args, { stdio: "inherit" });

child.on("exit", (code) => {
  process.exit(code ?? 0);
});

function spawnExists(path) {
  try {
    return !!require("fs").statSync(path);
  } catch {
    return false;
  }
}
