#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

echo "Building images with ${COMPOSE_FILE}..."
docker compose -f "${COMPOSE_FILE}" build

echo "Starting services..."
docker compose -f "${COMPOSE_FILE}" up -d

echo "Done."
