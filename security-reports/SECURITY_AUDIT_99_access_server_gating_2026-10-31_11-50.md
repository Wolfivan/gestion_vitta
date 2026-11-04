# SECURITY AUDIT - 99 access_server_gating

## Resumen
- Archivos revisados: Backend `src/routes/tools.ts`, `src/routes/gratitude.ts`, `src/routes/timeline.ts`, `src/constants/access-features.ts`, `src/middleware/feature-middleware.ts`; App `src/services/access-events.ts`, `src/services/api.ts`, `src/services/sync-manager.ts`, `src/context/access-context.tsx`, `src/components/access/FeatureRequiredNotice.tsx`, `src/navigation/app-navigator.tsx`; tests nuevos.
- Hallazgos: CRITICAL 0 / HIGH 0 / MEDIUM 1 (decision de producto) / LOW 1 / INFO 2.

## Hallazgos

### [MEDIUM, decision pendiente] Sin el plan no se pueden borrar desde la app los registros del servidor
- Archivo: `Backend/src/routes/timeline.ts` (`DELETE /timeline/all`, `DELETE /timeline/:id`).
- Descripcion: se protegieron todas las rutas de la herramienta, tambien las de borrado, como pide el criterio ("lecturas y escrituras responden 403"). Quien pierde el plan no puede borrar sus eventos del servidor hasta recuperarlo; el borrado local en la app queda en cola. No hay endpoint de eliminacion de cuenta en el backend.
- Impacto: derecho de supresion (Ley 1581) mas dificil de ejercer para quien ya no tiene el plan.
- Recomendacion: decidir en la revision de fase si los DELETE quedan libres. El cambio es quitar `requireTimeline` de esas dos rutas y ajustar la lista del test de mapa de rutas.

### [LOW] Una consulta extra a la base por peticion protegida
- `requireFeature` llama a `getEffectiveAccess` en cada request de herramientas. Es el diseno decidido (acceso calculado en cada request). Vigilar carga; el limitador general llega con la 102.

### [INFO] El 403 no expone datos
- Mensaje generico `Tu plan no incluye esta funcion` / `FEATURE_REQUIRED`, sin id ni plan del usuario. `authMiddleware` va antes: sin sesion es 401.

### [INFO] Cola offline sin perdida ni PII en logs
- `noteFeatureBlockedOp` registra entidad, tipo y op_id, sin payload. Las ops con 403 `FEATURE_REQUIRED` nunca se borran; solo se pausan en memoria.

## Checklist
- [x] Sin secretos
- [x] AuthZ correcto (auth antes que feature; el traductor no llama a la IA sin la feature)
- [x] RLS: sin cambios de esquema
- [x] Validacion/saneamiento: sin entradas nuevas
- [x] Errores seguros / sin PII
- [x] WP: sin cambios
- [x] InfoSec: no se borran datos por perder el plan

## Veredicto
OK (con notas). Decision pendiente para la revision de fase: DELETE libres o protegidos.
