#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.prod.yml"
HOST_DOWNLOADS_PATH="./data/library"

echo "Building images with ${COMPOSE_FILE}..."
HOST_DOWNLOADS_PATH="${HOST_DOWNLOADS_PATH}" docker compose -f "${COMPOSE_FILE}" build

echo "Starting services..."
HOST_DOWNLOADS_PATH="${HOST_DOWNLOADS_PATH}" docker compose -f "${COMPOSE_FILE}" up -d

echo "Done."
