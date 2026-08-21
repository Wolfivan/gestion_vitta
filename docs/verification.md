# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.
> Toda feature termina con evidencia ejecutable, no con afirmaciones.

## Niveles de verificación

### Nivel 1 — Tests unitarios (obligatorio)

Toda función pública tiene al menos un test que:

1. Cubre el camino feliz.
2. Cubre al menos un camino de error si la función puede fallar.

**Backend:**
```bash
cd Backend && npm test
```

**Frontend:**
```bash
cd App && npm test
```

### Nivel 2 — Tests de integración (obligatorio para endpoints)

Las features que añaden endpoints se verifican con Supertest:

```typescript
import request from 'supertest';
import { app } from '@/app';

it('POST /auth/google returns 200 with JWT', async () => {
  const res = await request(app)
    .post('/auth/google')
    .send({ token: 'valid-google-token' });
  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('jwt');
});
```

### Nivel 3 — Smoke test manual (opcional pero recomendado)

Antes de cerrar la sesión, ejecuta un flujo end-to-end:

```bash
# Backend
cd Backend && npm run dev

# Frontend
cd App && npx expo start
```

## Anti-patrones (no hacer)

- ❌ "He añadido el endpoint, debería funcionar." → falta test ejecutable.
- ❌ Test que solo verifica que no lanza excepción. → tiene que comprobar resultado concreto.
- ❌ Mock del filesystem o de la DB cuando puedes usar una DB de test.
- ❌ Marcar la feature como `done` sin pasar `./init.sh`.

## Verificación final antes de cerrar

```bash
./init.sh           # debe terminar con [OK] Entorno listo
```

Si `./init.sh` está rojo, **no** marques nada como `done`. Anota el bloqueo
en `progress/current.md` con estado `blocked` en `feature_list.json`.
