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
