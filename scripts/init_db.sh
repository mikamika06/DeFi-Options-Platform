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

PSQL="psql postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "[init_db] Applying schema migrations..."
${PSQL} -f "${ROOT_DIR}/scripts/sql/init_schema.sql"

echo "[init_db] Seeding reference data..."
${PSQL} -f "${ROOT_DIR}/scripts/sql/seed_reference.sql"

echo "[init_db] Done."
