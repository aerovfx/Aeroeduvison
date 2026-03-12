#!/usr/bin/env bash
# Deploy all Rust services (stub - see Migrate2Rust.md for full deployment strategy)
# Usage: ./deploy-all-rust-services.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=============================================="
echo "  Deploy All Rust Services (placeholder)"
echo "=============================================="
echo ""
echo "Full deployment is documented in Migrate2Rust.md:"
echo "  - Staging: Deploy Rust services to Cloud Run"
echo "  - Set RUST_*_URL environment variables"
echo "  - Production: Blue-green deploy, canary rollout"
echo ""
echo "Local services (run from repo root):"
echo "  bun run rust:all     # vector + aero-backend + auth-service"
echo "  bun run rust:vector"
echo "  bun run rust:backend"
echo "  bun run rust:auth"
echo ""
echo "Health checks:"
echo "  curl http://127.0.0.1:8090/health  # aero-backend"
echo "  curl http://127.0.0.1:8091/health  # auth-service (if different port, check service)"
echo ""
exit 0
