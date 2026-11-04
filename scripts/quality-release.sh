#!/usr/bin/env bash
# Release quality gate (Linux/macOS)
#
# Ejecuta, en este orden:
#   1. quality-lite en Docker (tsc + ESLint + jscpd)   -> debe PASS
#   2. security-scan (gitleaks/osv/semgrep/trivy)      -> debe PASS
#   3. SonarQube en Docker + sonar-scanner por proyecto -> Quality Gate "Sonar way"
#
# Escribe quality-reports/RELEASE_<timestamp>.md y devuelve exit 1 si algo falla.
#
# Si el gate completo pasa (sin --skip-lite ni --skip-security) y App/Backend no
# tienen cambios sin commitear, escribe quality-reports/release-pass.json con el
# tree de HEAD de cada repo. El hook githooks/pre-push lo exige para hacer push
# a main (instalar con ./scripts/install-hooks.sh).
#
# Uso:
#   ./scripts/quality-release.sh                 # gate completo
#   ./scripts/quality-release.sh --skip-security # sin el escaneo de seguridad
#   ./scripts/quality-release.sh --down          # apaga SonarQube (conserva volúmenes)
set -u

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; CYAN='\033[0;36m'; NC='\033[0m'
ok()   { printf "${GREEN}[OK]    %s${NC}\n" "$1"; }
warn() { printf "${YELLOW}[WARN]  %s${NC}\n" "$1"; }
fail() { printf "${RED}[FAIL]  %s${NC}\n" "$1"; }
step() { printf "\n${CYAN}=== %s ===${NC}\n" "$1"; }

COMPOSE="docker-compose.quality-tools.yml"
REPORTS_DIR="quality-reports"
STAMP=$(date +"%Y-%m-%d_%H-%M-%S")
REPORT_PATH="$REPORTS_DIR/RELEASE_$STAMP.md"
ENV_FILE=".env.sonar"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

DOWN=0
SKIP_LITE=0
SKIP_SECURITY=0
for arg in "$@"; do
  case "$arg" in
    --down) DOWN=1 ;;
    --skip-lite) SKIP_LITE=1 ;;
    --skip-security) SKIP_SECURITY=1 ;;
    *) fail "Argumento desconocido: $arg"; exit 1 ;;
  esac
done

CHECKS=()
add_check() {
  local name="$1" passed="$2" detail="$3"
  CHECKS+=("$name|$passed|$detail")
  if [ "$passed" = "1" ]; then ok "$name -> PASS"; else fail "$name -> FAIL ($detail)"; fi
}

write_report() {
  local extra="$1" global_pass=1 line
  for line in "${CHECKS[@]}"; do
    [ "${line##*|}" != "1" ] && global_pass=0
  done

  {
    echo "# RELEASE QUALITY REPORT — $STAMP"
    echo ""
    if [ "$global_pass" = "1" ]; then echo "## Veredicto: **PASS**"; else echo "## Veredicto: **FAIL**"; fi
    echo ""
    echo "| Gate | Resultado | Detalle |"
    echo "|---|---|---|"
    for line in "${CHECKS[@]}"; do
      IFS='|' read -r name passed detail <<< "$line"
      if [ "$passed" = "1" ]; then res="PASS"; else res="FAIL"; fi
      echo "| $name | $res | $detail |"
    done
    echo ""
    echo "## SonarQube"
    echo "- Dashboard: http://localhost:9000"
    echo "- Proyectos: \`vittalmind-backend\`, \`vittalmind-app\`"
    echo "- Apagar: \`./scripts/quality-release.sh --down\` (los volúmenes se conservan)"
    echo ""
    if [ -n "$extra" ]; then echo "## Notas"; echo "- $extra"; echo ""; fi
    echo "---"
    echo "Generado por \`scripts/quality-release.sh\`."
  } > "$REPORT_PATH"

  printf "\nReporte: %s\n" "$REPORT_PATH"
  [ "$global_pass" = "1" ]
}

# Constancia de PASS para el hook pre-push. Usa el tree (contenido) y no el
# commit, para que sirva tanto con fast-forward como con merge-commit.
write_release_stamp() {
  if [ "$SKIP_LITE" = "1" ] || [ "$SKIP_SECURITY" = "1" ]; then
    warn "Gate parcial (--skip-lite/--skip-security): NO se escribe release-pass.json; el push a main seguirá bloqueado."
    return
  fi
  local dir tree backend_tree="" app_tree=""
  for dir in Backend App; do
    if [ -n "$(git -C "$dir" status --porcelain 2>/dev/null)" ]; then
      warn "$dir tiene cambios sin commitear: NO se escribe release-pass.json. Commitea y vuelve a ejecutar."
      return
    fi
    if ! tree=$(git -C "$dir" rev-parse 'HEAD^{tree}' 2>/dev/null) || [ -z "$tree" ]; then
      warn "No se pudo leer HEAD de $dir: NO se escribe release-pass.json."
      return
    fi
    if [ "$dir" = "Backend" ]; then backend_tree="$tree"; else app_tree="$tree"; fi
  done
  printf '{\n  "backend": "%s",\n  "app": "%s",\n  "date": "%s"\n}\n' \
    "$backend_tree" "$app_tree" "$STAMP" > "$REPORTS_DIR/release-pass.json"
  ok "Constancia escrita en $REPORTS_DIR/release-pass.json (habilita el push a main de este código)"
}

if [ "$DOWN" = "1" ]; then
  step "Deteniendo SonarQube"
  docker compose -f "$COMPOSE" --profile release down
  ok "Contenedores detenidos (volúmenes conservados)"
  exit 0
fi

if ! docker info >/dev/null 2>&1; then
  fail "Docker no disponible"
  exit 1
fi

mkdir -p "$REPORTS_DIR"

# 1. Gate rápido
if [ "$SKIP_LITE" = "0" ]; then
  step "1/3 Gate rápido (quality-lite)"
  if "$SCRIPT_DIR/quality-check-docker.sh"; then
    add_check "quality-lite" 1 "tsc + ESLint + jscpd"
  else
    add_check "quality-lite" 0 "ver quality-reports/QUALITY_*.md"
    write_report "Se abortó antes de SonarQube: quality-lite no pasa."
    exit 1
  fi
fi

# 2. Seguridad
if [ "$SKIP_SECURITY" = "0" ]; then
  step "2/3 Security scan"
  if "$SCRIPT_DIR/security-scan.sh"; then
    add_check "security-scan" 1 "gitleaks + osv-scanner + semgrep + trivy"
  else
    add_check "security-scan" 0 "bloqueantes detectados"
    write_report "Se abortó antes de SonarQube: el security scan tiene bloqueantes."
    exit 1
  fi
else
  warn "security-scan omitido (--skip-security)"
  add_check "security-scan" 1 "omitido"
fi

# 3. SonarQube
step "3/3 SonarQube"
echo "Levantando sonar-db + sonarqube (la primera vez descarga ~1-2 GB)..."
if ! docker compose -f "$COMPOSE" --profile release up -d sonar-db sonarqube; then
  add_check "SonarQube" 0 "no se pudo levantar el stack"
  write_report "Revisa: docker compose -f $COMPOSE logs sonarqube"
  exit 1
fi

STATUS=""
DEADLINE=$(( $(date +%s) + 360 ))
while [ "$(date +%s)" -lt "$DEADLINE" ]; do
  STATUS=$(curl -s --max-time 5 http://localhost:9000/api/system/status | node -e "
    let data='';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try { console.log(JSON.parse(data).status || ''); } catch { console.log(''); }
    });
  ")
  [ "$STATUS" = "UP" ] && break
  printf "."
  sleep 5
done
echo ""

if [ "$STATUS" != "UP" ]; then
  add_check "SonarQube" 0 "no llegó a UP en 6 minutos"
  write_report "Revisa: docker compose -f $COMPOSE logs sonarqube"
  exit 1
fi
ok "SonarQube UP en http://localhost:9000"

# Token
TOKEN=""
ADMIN_PASSWORD=""
if [ -f "$ENV_FILE" ]; then
  TOKEN=$(grep -E '^SONAR_TOKEN=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
  ADMIN_PASSWORD=$(grep -E '^SONAR_ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2- | tr -d '\r')
fi

if [ -n "$TOKEN" ]; then
  # SonarQube 9.9 rechaza `Authorization: Bearer` en esta instalacion; el token
  # se envia como usuario Basic. Ver docs/quality-tools-docker.md.
  VALID=$(curl -s -u "$TOKEN:" http://localhost:9000/api/authentication/validate | node -e "
    let data='';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try { console.log(JSON.parse(data).valid ? 'true' : 'false'); } catch { console.log('false'); }
    });
  ")
  if [ "$VALID" != "true" ]; then
    warn "El token guardado ya no es válido (¿volumen reiniciado?). Se regenera."
    TOKEN=""
  fi
fi

if [ -z "$TOKEN" ]; then
  if [ -z "$ADMIN_PASSWORD" ]; then
    ADMIN_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(18).toString('base64url'))")
  fi

  curl -s -u admin:admin -X POST http://localhost:9000/api/users/change_password \
    -d "login=admin" -d "previousPassword=admin" --data-urlencode "password=$ADMIN_PASSWORD" >/dev/null 2>&1 \
    && ok "Contraseña por defecto de admin cambiada" \
    || warn "No se pudo cambiar la contraseña por defecto (probablemente ya estaba cambiada)"

  TOKEN=$(curl -s -u "admin:$ADMIN_PASSWORD" -X POST http://localhost:9000/api/user_tokens/generate \
    --data-urlencode "name=vittalmind-release-$STAMP" | node -e "
      let data='';
      process.stdin.on('data', c => data += c);
      process.stdin.on('end', () => {
        try { console.log(JSON.parse(data).token || ''); } catch { console.log(''); }
      });
    ")

  if [ -z "$TOKEN" ]; then
    add_check "SonarQube token" 0 "no se pudo generar automáticamente"
    write_report "Crea el token a mano en http://localhost:9000 (My Account > Security) y guárdalo en .env.sonar como SONAR_TOKEN=..."
    exit 1
  fi

  printf "SONAR_TOKEN=%s\nSONAR_ADMIN_PASSWORD=%s" "$TOKEN" "$ADMIN_PASSWORD" > "$ENV_FILE"
  ok "Token generado y guardado en $ENV_FILE"
fi

# Cobertura: Sonar lee coverage/lcov.info, que solo existe si jest corre con
# --coverage. Las pruebas corren en el host y el scanner en Docker con el repo
# en /repo, asi que las rutas SF: se dejan relativas al proyecto.
generate_lcov() {
  local dir="$1" abs lcov
  abs="$(cd "$dir" && pwd)"
  lcov="$abs/coverage/lcov.info"
  rm -f "$lcov"
  ( cd "$abs" && npx jest --coverage --coverageReporters=lcov --passWithNoTests --silent ) 2>&1 | tail -n 6
  [ "${PIPESTATUS[0]}" -eq 0 ] && [ -f "$lcov" ] || return 1
  sed -i -e "s#^SF:$abs/#SF:#" -e '/^SF:/s#\\#/#g' "$lcov"
}

# Escaneo
for PROJECT in "vittalmind-backend:Backend" "vittalmind-app:App"; do
  KEY="${PROJECT%%:*}"
  DIR="${PROJECT##*:}"
  step "Cobertura: $DIR"
  if generate_lcov "$DIR"; then
    ok "coverage/lcov.info generado"
  else
    add_check "Cobertura $DIR" 0 "jest --coverage falló o no generó coverage/lcov.info"
  fi

  step "Sonar scan: $DIR"

  SCAN_LOG="/tmp/sonar-scan-$KEY.log"
  docker compose -f "$COMPOSE" --profile release run --rm \
    -e "SONAR_TOKEN=$TOKEN" sonar-scanner \
    "-Dsonar.projectBaseDir=/repo/$DIR" \
    "-Dsonar.working.directory=/tmp/scannerwork" > "$SCAN_LOG" 2>&1
  SCAN_CODE=$?
  tail -n 12 "$SCAN_LOG"

  if [ "$SCAN_CODE" -ne 0 ]; then
    add_check "Sonar $DIR" 0 "sonar-scanner falló (exit $SCAN_CODE)"
    continue
  fi

  # El reporte se procesa en segundo plano: esperar al Compute Engine antes de
  # consultar el Quality Gate.
  TASK_ID=$(grep -oE 'api/ce/task\?id=[A-Za-z0-9_-]+' "$SCAN_LOG" | head -n 1 | sed 's/.*id=//')
  if [ -n "$TASK_ID" ]; then
    CE_STATUS=""
    CE_DEADLINE=$(( $(date +%s) + 300 ))
    while [ "$(date +%s)" -lt "$CE_DEADLINE" ]; do
      CE_STATUS=$(curl -s -u "$TOKEN:" "http://localhost:9000/api/ce/task?id=$TASK_ID" | node -e "
        let data='';
        process.stdin.on('data', c => data += c);
        process.stdin.on('end', () => {
          try { console.log(JSON.parse(data).task.status || ''); } catch { console.log(''); }
        });
      ")
      case "$CE_STATUS" in
        SUCCESS|FAILED|CANCELED) break ;;
      esac
      sleep 5
    done
    if [ "$CE_STATUS" != "SUCCESS" ]; then
      add_check "Sonar $DIR" 0 "procesamiento del reporte: ${CE_STATUS:-sin respuesta}"
      continue
    fi
  fi

  GATE_BODY=$(curl -s -u "$TOKEN:" \
    "http://localhost:9000/api/qualitygates/project_status?projectKey=$KEY")
  GATE=$(printf '%s' "$GATE_BODY" | node -e "
      let data='';
      process.stdin.on('data', c => data += c);
      process.stdin.on('end', () => {
        try {
          const s = JSON.parse(data).projectStatus;
          const failed = (s.conditions || []).filter(c => c.status === 'ERROR')
            .map(c => c.metricKey + '=' + c.actualValue + ' (umbral ' + c.errorThreshold + ')');
          console.log(s.status + '|' + (failed.join('; ') || s.status));
        } catch { console.log('ERROR|respuesta inesperada: ' + data.slice(0, 120)); }
      });
    ")
  GATE_STATUS="${GATE%%|*}"
  GATE_DETAIL="${GATE##*|}"
  if [ "$GATE_STATUS" = "OK" ]; then
    add_check "Sonar $DIR" 1 "$GATE_DETAIL"
  else
    add_check "Sonar $DIR" 0 "$GATE_DETAIL"
  fi
done

if write_report ""; then
  write_release_stamp
  printf "\n${GREEN}=== RELEASE GATE: PASS ===${NC}\n"
  exit 0
fi
printf "\n${RED}=== RELEASE GATE: FAIL ===${NC}\n"
exit 1
