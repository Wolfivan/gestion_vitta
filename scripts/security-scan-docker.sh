#!/usr/bin/env bash
set -e
echo "=== SECURITY SCAN (DOCKER) ==="
if ! docker info >/dev/null 2>&1; then echo "Docker no disponible"; exit 1; fi
blockers=0
echo; echo "[1] Gitleaks..."; if ! docker compose -f docker-compose.security-tools.yml run --rm gitleaks; then blockers=$((blockers+1)); fi
echo; echo "[2] OSV-Scanner..."; if ! docker compose -f docker-compose.security-tools.yml run --rm osv-scanner; then blockers=$((blockers+1)); fi
echo; echo "[3] Semgrep..."; if ! docker compose -f docker-compose.security-tools.yml run --rm semgrep; then blockers=$((blockers+1)); fi
echo; echo "[4] Trivy FS..."; if ! docker compose -f docker-compose.security-tools.yml run --rm trivy; then blockers=$((blockers+1)); fi
echo; echo "=== SECURITY SCAN (DOCKER) END ==="; if [ $blockers -gt 0 ]; then echo "BLOCKERS: $blockers"; exit 1; else echo "OK"; exit 0; fi
