#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

if command -v forge >/dev/null 2>&1; then
  echo "[contracts] forge detected"
else
  echo "[contracts] forge not found. Install Foundry and try again."
  exit 1
fi

if [[ -f "${ENV_FILE}" ]]; then
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ENV_FILE}" | xargs)
else
  echo "[contracts] .env not found, using defaults from .env.example"
  export $(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "${ROOT_DIR}/.env.example" | xargs)
fi

RPC_URL="${ANVIL_RPC_URL:-http://127.0.0.1:8545}"

echo "[contracts] Deploying contracts to ${RPC_URL}"

forge script \
  contracts/script/DeployLocal.s.sol:DeployLocal \
  --rpc-url "${RPC_URL}" \
  --private-key "${DEPLOYER_PRIVATE_KEY}" \
  --broadcast \
  --skip-simulation \
  || echo "[contracts] Deploy script placeholder. Implement contracts/script/DeployLocal.s.sol."

echo "[contracts] Done."
