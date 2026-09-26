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

### Nivel 3 — Smoke test manual (obligatorio para lo que toca el plugin)

Los dos niveles anteriores no cubren nada que cruce WordPress → Backend → App: el
contenido de psicoeducación se crea en un panel de WordPress real y se ve en un
dispositivo, y ninguna de esas dos piezas tiene un test que lo simule.

Para ese caso, el entorno y el procedimiento están en
**`docs/entorno-pruebas.md`**: allí están las credenciales, los contenedores
Docker, el orden de arranque y el procedimiento end-to-end. Un bloque de
psicoeducación no está verificado hasta que se ha creado desde el panel y se ha
visto en la App.

Los niveles 1 y 2 siguen siendo obligatorios antes que este. El 3 no los
sustituye: se suma.

Para lo que no necesite el panel, esto basta:

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
