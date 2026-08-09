#!/bin/sh
set -eu
node /app/scripts/onprem-bootstrap.cjs
node /app/scripts/sync-license-state.cjs
exec node /app/server.cjs
