#!/usr/bin/env bash
set -e

has_cmd() { command -v "$1" >/dev/null 2>&1; }

echo "=== SECURITY SCAN ==="
HAVE_GITLEAKS=$(has_cmd gitleaks && echo yes || echo no)
HAVE_OSV=$(has_cmd osv-scanner && echo yes || echo no)
HAVE_SEMGREP=$(has_cmd semgrep && echo yes || echo no)
echo "gitleaks: $HAVE_GITLEAKS"
echo "osv-scanner: $HAVE_OSV"
echo "semgrep: $HAVE_SEMGREP"

blockers=0

if [ "$HAVE_GITLEAKS" = "yes" ]; then
  echo -e "\n[1] Gitleaks..."
  gitleaks detect --no-git --redact --exit-code 1 || blockers=$((blockers+1))
else
  if docker info >/dev/null 2>&1 && [ -f "docker-compose.security-tools.yml" ]; then
    echo -e "\n[1] Gitleaks via Docker..."
    docker compose -f docker-compose.security-tools.yml run --rm gitleaks || blockers=$((blockers+1))
  else
    echo -e "\n[1] Gitleaks not found - fallback grep..."
    grep -rE "(AKIA[0-9A-Z]{16}|sk_live_|sk_test_|ghp_|BEGIN (RSA|EC|OPENSSH) PRIVATE KEY|AuthKey_.*\.p8)" --include="*.ts" --include="*.js" --include="*.json" --include="*.php" --include="*.env*" --include="*.p8" --include="*.pem" . 2>/dev/null && blockers=$((blockers+1)) || true
  fi
fi

if [ "$HAVE_OSV" = "yes" ]; then
  echo -e "\n[2] OSV-Scanner..."
  osv-scanner --recursive . || true
else
  if docker info >/dev/null 2>&1 && [ -f "docker-compose.security-tools.yml" ]; then
    echo -e "\n[2] OSV-Scanner via Docker..."
    docker compose -f docker-compose.security-tools.yml run --rm osv-scanner || blockers=$((blockers+1))
  else
    echo -e "\n[2] OSV-Scanner not found - consider npm audit"
  fi
fi

if [ "$HAVE_SEMGREP" = "yes" ]; then
  echo -e "\n[3] Semgrep..."
  semgrep --config auto --error || blockers=$((blockers+1))
else
  if docker info >/dev/null 2>&1 && [ -f "docker-compose.security-tools.yml" ]; then
    echo -e "\n[3] Semgrep via Docker..."
    docker compose -f docker-compose.security-tools.yml run --rm semgrep || blockers=$((blockers+1))
  else
    echo -e "\n[3] Semgrep not found - fallback grep..."
    grep -rE "(eval\(|innerHTML|dangerouslySetInnerHTML|child_process|exec\(|spawn\()" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --include="*.php" App Backend plugins 2>/dev/null && blockers=$((blockers+1)) || true
  fi
fi

# Try trivy via docker if available
if docker info >/dev/null 2>&1 && [ -f "docker-compose.security-tools.yml" ]; then
  echo -e "\n[4] Trivy FS via Docker..."
  docker compose -f docker-compose.security-tools.yml run --rm trivy || blockers=$((blockers+1))
fi

echo -e "\n=== SECURITY SCAN END ==="
if [ $blockers -gt 0 ]; then echo "BLOCKERS: $blockers"; exit 1; else echo "OK"; exit 0; fi
