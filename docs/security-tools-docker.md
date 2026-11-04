# Security Tools in Docker

Este proyecto puede ejecutar `gitleaks`, `osv-scanner`, `semgrep` y `trivy` desde contenedores Docker sin instalar nada en el host.

## Prerrequisitos
- Docker Desktop / Docker Engine corriendo
- Permisos para ejecutar `docker compose`

## Archivos
- `docker-compose.security-tools.yml` - Definición de servicios (read-only mounts)
- `scripts/security-scan-docker.ps1` / `.sh` - Ejecuta todas las herramientas
- `scripts/security-scan.ps1` / `.sh` - Wrapper con auto-detección (local -> Docker -> fallback grep)

## Uso rápido
### Windows (PowerShell)
```powershell
.\scripts\security-scan-docker.ps1
```

### Linux/macOS
```bash
chmod +x scripts/security-scan-docker.sh
./scripts/security-scan-docker.sh
```

### Integrado con init
```powershell
.\init.ps1
```
Si no hay herramientas locales y hay Docker, `security-scan.ps1` usará Docker automáticamente.

## Ejecutar herramienta individual
```bash
docker compose -f docker-compose.security-tools.yml run --rm gitleaks
docker compose -f docker-compose.security-tools.yml run --rm osv-scanner
docker compose -f docker-compose.security-tools.yml run --rm semgrep
docker compose -f docker-compose.security-tools.yml run --rm trivy
```

## Qué bloquea y qué no
- **gitleaks** (bloquea): usa `.gitleaks.toml`. Escanea el árbol completo con `--no-git`, así que excluye los archivos locales que git ignora (`.env`, `.env.production`, `.env.sonar`, `DataConf/`, `graphify-out/`, `node_modules/`, `coverage/`). Lo versionado se sigue revisando; un falso positivo puntual se marca en su línea con `gitleaks:allow` y el motivo.
- **semgrep** (bloquea solo severidad `ERROR`): rulesets `p/default`, `p/typescript`, `p/react` y `p/php`. `--config=auto` no sirve con las métricas apagadas. Un falso positivo se marca con `// nosemgrep` y un comentario encima que explique por qué.
- **trivy** (bloquea `CRITICAL,HIGH`): omite `node_modules` (los lockfiles ya listan las dependencias), los `.env` locales y `DataConf/`; guarda la base de vulnerabilidades en el volumen `trivy-cache`.
- **osv-scanner** (informativo): recibe `App/package-lock.json` y `Backend/package-lock.json` de forma explícita, porque el `.gitignore` de la raíz excluye `App/` y `Backend/` y sin eso decía "No package sources found".

## Seguridad
- Montajes en modo `:ro` (solo lectura)
- `SEMGREP_SEND_METRICS=off`
- Sin escritura en el repositorio
- Usa `run --rm` para limpiar contenedores

## Versiones
Las versiones están fijadas para estabilidad. Para actualizar, modificar tags en `docker-compose.security-tools.yml`.

## Troubleshooting
- **Docker no responde**: iniciar Docker Desktop/daemon
- **Permisos Windows/WSL**: asegurar que el repo es accesible desde el contexto de Docker
- **Falsos positivos**: revisar informe y ajustar; Trivy filtra por `CRITICAL,HIGH` por defecto
- **Sin salida**: probar `docker pull` de las imágenes
