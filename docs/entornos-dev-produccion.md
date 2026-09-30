# Entornos de desarrollo y producción

> Documento de referencia. **No reexplicar esto en chat**: está acá para eso.
> Última auditoría: 2026-09-29 (pre-release v0.3.0).

---

## 1. La regla de oro

**Ningún dato, credencial, URL ni código de desarrollo puede llegar a producción.**
Esto aplica a tres cosas distintas, y confundirlas es el error más caro del proyecto:

| Capa | Qué significa | Cómo se filtra |
|---|---|---|
| **Configuración** | Variables de entorno | `.env` mal copiado a `.env.production` |
| **Datos** | Filas en la base de datos | Un `.env` que apunta a la BD equivocada |
| **Código** | Lógica de dev que compila al bundle | `__DEV__` mal evaluado, seeds, flags |

---

## 2. Topología: son 3 repos, no 1

Esto NO es un monorepo. No hay `.gitmodules`; `App/` y `Backend/` son repos
completamente independientes, y la raíz los ignora (`.gitignore:28-30`).

| Ruta | Remote | Rama de trabajo | Rama de producción |
|---|---|---|---|
| raíz `VittalMind/` | `Wolfivan/gestion_vitta` | `development` | `main` |
| `App/` | `Wolfivan/vittaMinds_front` | `desarrollo` | `main` |
| `Backend/` | `Wolfivan/vittalmind-backend` | `desarrollo` | `main` |

**Consecuencia:** no se puede publicar nada con un solo commit. Cada pieza se
mergea y se despliega por separado. La raíz solo guarda docs y el arnés de agentes
(`feature_list.json`, `progress/`, `docs/`); mergearla **no despliega nada**.

---

## 3. Estado de la separación dev/prod (auditado 2026-09-29)

### 3.1 Lo que SÍ está separado ✅

**El binario de la app** — `App/src/constants/index.ts:9-11`:

```typescript
export const API_BASE_URL = __DEV__
  ? `http://${getApiHost()}:3000`   // red local, máquina del dev
  : 'https://app.vittaminds.com';   // producción
```

`__DEV__` lo define el propio build de EAS. Un build `production` **siempre**
va contra `app.vittaminds.com`, sin importar desde qué rama se compile.

**Los archivos de entorno** — `Backend/.gitignore` excluye `.env` y
`.env.production`. **No están en git**, así que un merge **jamás** puede pisar
la configuración del servidor. La configuración real de producción vive solo
en el panel de Hostinger (o subida por FTP). Esta es la red de seguridad
principal del proyecto: el merge no toca producción.

**Los tests** — `Backend/tsconfig.json` excluye `tests`, así que no se compilan
a `dist/` ni se despliegan al servidor.

### 3.2 Lo que NO está separado 🔴

#### 🔴 `Backend/.env` APUNTA A LA BASE DE DATOS DE PRODUCCIÓN

Este es **el vector de contamination principal**:

```
Backend/.env            NODE_ENV=development
                        DB_HOST=db.utudxtykopnowmxijalv.supabase.co   ← PRODUCCIÓN
                        DB_NAME=postgres
```

Es el **mismo Supabase** que usa `.env.production`. Consecuencias:

- `npm run migrate` desde tu máquina **aplica migraciones en producción**.
- `npm test` puede escribir en producción si algún test no mockea el pool.
- Levantar `npm run dev` en local **lee y escribe datos reales de usuarios**.

`NODE_ENV=development` **no protege nada**: la variable no se usa para elegir
la base de datos, solo se lee en `seed.ts` y como dato informativo.

**Regla:** antes de correr migraciones o el servidor en local, confirmá que
`DB_HOST` apunta a una base de desarrollo. Si no tenés una, creala antes.
**Nunca** corras `npm run migrate` con el `.env` actual.

#### 🔴 El seed crea una cuenta con credencial conocida

`Backend/src/database/seed.ts` inserta `test@vittal.com` / `test1234` con
`auth_provider='local'`, o sea **login por contraseña válido**.

Esto ya está **bloqueado en código**: `runSeed()` aborta si
`NODE_ENV === 'production'`. Si tocás esa guarda, eliminá también la entrada
correspondiente de la base de datos.

**Nunca deployes el backend con Docker.** `Dockerfile:29` corre
`node dist/database/seed.js` en **cada arranque** del contenedor. Hostinger usa
`npm start` → `server.js`, que **no** siembra. Ese es el motivo de que funcione.

#### 🟠 Google OAuth no tiene separación dev/prod

Existe **un solo proyecto** de Google Cloud (`220224673708`) compartido por
desarrollo y producción. Los tres Client IDs son idénticos en `.env`,
`.env.production` y `App/src/constants/index.ts:15-22`.

No es un problema funcional (los Client IDs de OAuth son públicos por
naturaleza), pero implica que los usuarios de prueba y los reales comparten
pantalla de consentimiento y analytics. Si alguna vez hace falta separar,
requiere crear un segundo proyecto de Google Cloud.

#### 🟠 `JWT_SECRET` tiene default inseguro

`Backend/src/utils/config.ts:50` cae a `'dev-secret-change-in-production'` si
la variable no está. Si Hostinger llegara a perder esa variable, **producción
firmaría tokens con una clave pública y conocida**. Verificá que
`JWT_SECRET` esté siempre seteada en el panel.

---

## 4. Tabla de valores por entorno

| Variable | Desarrollo (`.env`) | Producción (`.env.production` + panel) |
|---|---|---|
| `NODE_ENV` | `development` | `production` |
| `DB_HOST` | `db.utudxtykopnowmxijalv.supabase.co` ⚠️ | `db.utudxtykopnowmxijalv.supabase.co` |
| `DB_NAME` | `postgres` ⚠️ | `postgres` |
| `DB_SSL` | `true` | ausente (funciona: default `true`) |
| `JWT_SECRET` | local | **secret real, obligatorio** |
| `AI_PROVIDER` | `openrouter` | `openrouter` |
| `GOOGLE_*_CLIENT_ID` | proyecto `220224673708` | mismo proyecto `220224673708` |
| `APP_LATEST_VERSION` | `0.2.0` (en `.env.docker`) | `0.2.0` (según panel) |
| `APP_MINIMUM_VERSION` | `0.1.0` | `0.1.0` |

⚠️ = punto de colisión actual. El archivo local `.env.production` en disco
**va atrasado** respecto de lo que hay realmente en el panel de Hostinger
(local dice `APP_LATEST_VERSION=0.1.0`, el panel tiene `0.2.0`).
**El panel de Hostinger es la fuente de verdad, no el archivo local.**

`.env.docker` apunta a un Postgres de Docker local (`DB_HOST=db`), así que es
el único entorno realmente aislado. **Pero está commiteado en git y contiene
una `OPENROUTER_API_KEY` real** — hay que rotarla y sanitizarlo.

---

## 5. Procedimiento de release

### Orden obligatorio: **Backend → Hostinger → App → EAS → Stores**

El motivo: la App llama endpoints que el Backend todavía no expone. Publicar
la app primero deja features rotas en manos de usuarios reales.

Ejemplo concreto del release v0.3.0: la App ya tenía el Círculo de Gratitud
(`e5ab43c`) llamando `GET /gratitude/entries` y `GET /gratitude/streak`, pero
esas rutas y las migraciones `019`/`020` no existían en el backend desplegado.

### 5.1 Mergear a `main`

1. **Commitear primero.** El working tree tiene que estar limpio; si hay
   archivos sin trackear, `main` queda incompleto.
2. `npm run build` — `init.ps1` **no** corre `tsc`, así que "tests verdes" no
   significa que compile. Hay que verificarlo aparte.
3. `npm test`.
4. Merge a `main` + push de ambas ramas.

Los merges son limpios: `App` es fast-forward, `Backend` tiene un merge-commit
redundante pero sus árboles son idénticos en el merge-base (verificado con
`git rev-parse '<ref>^{tree}'`).

### 5.2 Desplegar en Hostinger

- **Borrar `dist/` antes del redeploy.** `server.js:9-12` solo auto-compila si
  `dist/index.js` **no existe**. Si queda el `dist/` viejo, sirve código viejo
  y el deploy parece exitoso pero no cambió nada.
- Las migraciones corren solas al arrancar (`server.js:20-21`).
- **No** correr `npm run seed`. **No** usar Docker.

### 5.3 Verificar en producción

```
GET /health              → 200
GET /psychoeducation     → 200
GET /app/version         → 200
GET /gratitude/streak    → 200 con JWT válido   ← prueba que 019/020 corrieron
```

### 5.4 Build de la app

```powershell
cd App
git checkout main              # EAS sube el directorio local, no lee de git
npx eas-cli build --platform android --profile production   # .aab
.\eas-build-ios.ps1                                          # .ipa + --auto-submit
```

- **`autoIncrement: true`** reescribe `versionCode`/`buildNumber` en el
  `app.json` local. **Commit y push después de cada build**, o el siguiente
  reusa el número y la store lo rechaza.
- `--auto-submit` **solo sube** a App Store Connect. *Submit for Review* es manual.
- Android **no** se auto-sube: `eas.json` no tiene bloque `submit.production.android`.

### 5.5 Cierre

`APP_LATEST_VERSION` se sube a la nueva versión **solo cuando las stores
aprueban**. Si lo subís antes, los usuarios de la versión vieja ven un aviso de
actualización hacia un binario que todavía no existe.

`APP_MINIMUM_VERSION` se queda en `0.1.0` para no forzar actualizaciones.

---

## 6. Checklist antes de compilar

- [ ] ¿`app.json` en `main` es la base correcta? Subir la versión **desde ahí**.
- [ ] ¿El working tree de `App` y `Backend` está limpio?
- [ ] ¿`npm run build` pasó en Backend? (no lo cubre `init.ps1`)
- [ ] ¿`npm test` pasó?
- [ ] ¿Ningún `.env` aparece en `git status`?
- [ ] ¿El splash y los assets tienen dimensiones reales? (un PNG de 1×1 compila bien y sale en blanco)
- [ ] ¿Hay URL pública de la política de privacidad? Las dos stores la exigen.
- [ ] ¿El backend ya está desplegado y verificado?
