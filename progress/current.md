# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## Feature en curso

- **Feature:** Setup de repos git + registro de tareas urgentes (no era una feature del listado)
- **Inicio:** 2026-08-20
- **Agente:** ox-alpha
- **Plan:** Crear infraestructura de repos (front, gestión) y ramas `desarrollo`; registrar tareas urgentes en feature_list.json

## Hecho

- **App/ (vittaMinds_front):** repo privado inicializado. Rama `master` renombrada a `main`, commit inicial
  (86 archivos, features 1-43), push a `origin/main`. `.gitignore` ampliado (web-build/, coverage/, *.tsbuildinfo).
  Rama `desarrollo` creada y pusheada. En esta rama el front ya apunta al backend local en modo dev:
  `API_BASE_URL = __DEV__ ? http://${hostUri}:3000 : https://app.vittaminds.com` (constants/index.ts:9),
  no requiere cambios de código para probar con Expo Go.
- **Backend/ (vittalmind-backend):** rama `desarrollo` creada desde `main` y pusheada, sin cambios de código.
  Para entorno dev: `docker compose up -d` en Backend/ (usa .env.docker existente; migraciones + seed automáticos,
  usuario test test@vittal.com / test1234).
- **Raíz (gestion_vitta):** repo de gestión inicializado en `main` con .gitignore que excluye App/, Backend/
  (repos propios), graphify-out/ (generado) y .agents/skills/ (reinstalable vía skills-lock.json). Push hecho.
- **feature_list.json:** corregido ID duplicado 27 (`reset_timeline` ahora es 44). Agregadas tareas urgentes
  con campo `priority`: 45 fix_textbox_wrap (alta), 46 offline_cache_foundation (alta), 47 psychoeducation_offline
  (alta), 48 timeline_offline_sync (alta), 49 perf_pass (media).

## Decisiones tomadas

- Offline-first aprobado por el usuario: expo-sqlite + @react-native-community/netinfo como dependencias nuevas.
- Política de conflictos para sync del timeline: last-write-wins.
- Orden de trabajo próximo: 45 → 46 → 47 → 48 → 49 (una feature por sesión según AGENTS.md).

## Pendiente / siguiente sesión

- Ejecutar feature 45 (fix_textbox_wrap) en la rama `desarrollo` del front.
- Verificación de entorno dev pendiente (usuario la hará manualmente): docker compose up + npx expo start + Expo Go.
  Nota: teléfono y PC en la misma red; puede requerir regla de firewall de Windows para puertos 8081 (Metro) y 3000 (API).
