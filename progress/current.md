# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## Feature en curso

- **Feature:** #50 fix_login_network_aborted — Fix rechazo App Store: "Aborted" al hacer login
- **Inicio:** 2026-08-23
- **Agente:** ox-alpha
- **Estado:** COMPLETADA (tests verdes). Pendiente solo el despliegue/reenvío del usuario.

## Contexto del rechazo (Guideline 2.1(a))

- Revisión Apple 2026-08-22 (iPad Air 11" M3, iPadOS 26.6): "Not able to log in due to message".
- Causa confirmada: `request()` aborta con AbortController a los 10s; RN produce error con message "Aborted"; se muestra crudo en la UI de login.
- Infra: app.vittaminds.com está detrás de Hostinger CDN (`Server: hcdn`), IPs rotantes TTL 60s. Apple revisa en redes solo-IPv6; camino IPv6 del CDN lento/colgado → timeout → "Aborted".
- Diagnóstico completo y plan (Parte 2 DNS/hCDN y Parte 3 reenvío) acordados con el usuario el 2026-08-23. La Parte 1 (cliente) es esta feature.

## Hecho

- Diagnóstico realizado: verificado /health en prod OK (~0.8s), RDAP confirma rangos HOSTINGER-CDN, hcdn en cabeceras.
- feature_list.json: agregada tarea id 50 `fix_login_network_aborted` (alta), marcada `done`.
- **App/src/services/api.ts:** añadidos `NETWORK_ERROR_MESSAGE`, `isNetworkError()` y `mapNetworkError()` (AbortError/"Aborted"/"Network request failed" → mensaje amigable en español). Nuevos helpers `fetchWithTimeout()` (AbortController fresco por intento) y `fetchWithRetry()` (1 reintento con backoff 500ms ante fallo de red). `request()` y `retryRequest()` mapean errores de red; `retryRequest()` ya no recibe el signal externo (bug latente corregido: reutilizaba el signal abortado del primer intento en el flujo 401-refresh).
- **App/src/constants/index.ts:** API_TIMEOUT 10000 → 15000 (CNV translate conserva su 60s explícito).
- **App/__tests__/api-network.test.ts:** 8 tests nuevos (detección de errores de red, reintento exitoso, timeout → mensaje amigable, no-reintento de errores ajenos, preservación de errores HTTP).
- **Verificación:** App 36/36 tests, Backend tests OK, `npx tsc --noEmit` sin errores, `.\init.ps1` 100% verde.

## Decisiones tomadas

- Mensaje amigable único para fallos de red/timeout: "No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo."
- Un solo reintento automático con backoff corto (500ms) cuando el fetch falla por red/abort.
- Cada intento de fetch crea su propio AbortController (corrige bug latente del signal compartido en retryRequest).
- API_TIMEOUT por defecto sube a 15s; CNV translate mantiene su 60s explícito.

## Pendiente / siguiente sesión

- Parte 2 (usuario, fuera del repo): decidir si desactivar hCDN para `app.vittaminds.com` (DNS-only al VPS) o abrir ticket a Hostinger por IPv6/NAT64; verificar con datos móviles y check-host.net.
- Parte 3: build nuevo → probar login en TestFlight con datos móviles → responder a App Review (cuenta demo ya existe en producción según usuario).
