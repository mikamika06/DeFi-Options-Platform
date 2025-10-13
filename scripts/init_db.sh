#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if [[ -f "${ENV_FILE}" ]]; then
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" | xargs)
else
  echo "[init_db] .env not found, using defaults from .env.example"
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ROOT_DIR}/.env.example" | xargs)
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "[init_db] pnpm is required but not found in PATH"
  exit 1
fi

BACKEND_FILTER="@defi-options/backend"

echo "[init_db] Generating Prisma client..."
pnpm --filter "${BACKEND_FILTER}" run prisma:generate

echo "[init_db] Applying Prisma migrations..."
pnpm --filter "${BACKEND_FILTER}" run prisma:deploy

echo "[init_db] Seeding baseline data..."
pnpm --filter "${BACKEND_FILTER}" run db:seed

echo "[init_db] Done."
