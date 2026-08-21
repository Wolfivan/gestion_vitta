# Hoja de Ruta de Desarrollo: Fases e Hitos del MVP

Este documento detalla hitos prioritarios para el desarrollo de la aplicación de Salud Mental utilizando el framework de agentes **Hardness**. Cada hito representa una funcionalidad core y debe implementarse respetando los lineamientos de seguridad descritos en el `README.md`.

---

## Hito 1: Autenticación y Registro con Google (Flujo de Anonimización)

### Descripción
Permitir a los usuarios registrarse e iniciar sesión de forma rápida utilizando su cuenta de Google mediante Expo en el cliente y Node.js en el backend, estableciendo la base del desacoplamiento de identidad.

### Requerimientos Técnicos
1. **Frontend (Expo):** Integrar el flujo de autenticación con Google (vía `expo-auth-session` o librería nativa compatible). Capturar el token de identidad de manera segura.
2. **Backend (Node.js):** Endpoint de recepción del token para validarlo contra los servidores de Google.
3. **Mapeo de Datos Semianónimo:**
   - Crear una tabla `usuarios_auth` que almacene: `id_usuario` (PK), `email_google`, `nombre_completo` y un `id_anonimo` (UUIDv4 generado de forma aleatoria).
   - Generar un Token de Sesión propio (JWT) que solo viaje firmado con el `id_anonimo` en los subsecuentes requests de la aplicación. El frontend nunca conocerá ni almacenará la clave primaria que lo vincula a su correo de Google en flujos operacionales.
4. **Seguridad:** Implementar protección biométrica local opcional (`expo-local-authentication`) tras el primer login para desbloquear la sesión en el dispositivo.

---

## Hito 2: Botón de Pánico y Contención Inmediata (Offline-First)

### Descripción
Proporcionar al usuario un mecanismo de auxilio psicológico inmediato, visible y de carga instantánea ante una crisis de ansiedad o emergencia emocional.

### Requerimientos Técnicos
1. **Frontend (Expo):**
   - Un botón de acción rápida y alto contraste visual (rojo/solemne) ubicado en un lugar accesible desde la pantalla principal.
   - Al presionarlo, desplegar un modal o vista limpia de contención de carga inmediata.
2. **Funcionalidades Core de la Pantalla:**
   - **Líneas de Emergencia Locales:** Listado telefónico de asistencia (ej. prevención de suicidio, emergencias generales) precargado de forma local (offline-first) según la geolocalización o el país seleccionado por el usuario en su perfil. Al pulsar sobre el número, se debe disparar el marcador nativo del dispositivo (`Linking.openURL('tel:...')`).
   - **Acceso a Red Profesional:** Un botón secundario para enlazar directamente con el directorio de psicólogos profesionales de guardia en la plataforma para asistencia sincrónica (chat o llamada integrada si hay conexión activa).

---

## Hito 3: Módulo para Parejas (Herramientas de Conexión Emocional)

### Descripción
Un espacio compartido dentro de la aplicación diseñado para mejorar la salud de las relaciones mediante herramientas interactivas, dinámicas de comunicación asertiva e hitos conjuntos.

### Herramientas a Desarrollar

### 3.1. Traductor de Comunicación Asertiva (Asistente de IA)
- **Lógica de Negocio:** El usuario ingresa un texto reactivo o impulsivo redactado desde la frustración o el enojo. El sistema procesa el texto y le devuelve una sugerencia basada en la metodología de Comunicación No Violenta (CNV), enseñándole cómo expresar la misma necesidad sin atacar a su pareja.
- **Implementación:** Backend en Node.js que conecte con la API de OpenAI (modelo ligero como `gpt-4o-mini`). El prompt del sistema debe estar estrictamente estructurado bajo criterios clínico-cognitivos.

### 3.2. Módulo de Psicoeducación en Pareja (Estructura Dinámica)
- **Lógica de Negocio:** Despliegue de tarjetas de aprendizaje, micro-lecturas y consejos sobre dinámicas relacionales provistos por el psicólogo cofundador.
- **Implementación:** El backend expone un endpoint que retorna un payload JSON estructurado con títulos, cuerpos de texto y links a recursos. El frontend de Expo interpreta este JSON de manera agnóstica para renderizar las vistas dinámicamente.

### 3.3. Línea del Tiempo de la Relación (Timeline Compartido)
- **Lógica de Negocio:** Una cronología visual interactiva donde ambos miembros de la pareja pueden registrar eventos significativos (ej. acuerdos de convivencia logrados, hitos positivos, superación de semanas difíciles o recordatorios de autocuidado en pareja).
- **Implementación:** Tabla en base de datos que vincule un `id_relacion` único (asociando dos `id_anonimo`). Cada registro en el timeline contiene: `fecha`, `titulo`, `descripcion` y un `tipo_evento` (Clínico/Acuerdo, Celebración, Recordatorio).

---

## Hito 4: Integración del Descargo de Responsabilidad (Disclaimer Legal)

### Descripción
Garantizar la protección legal del proyecto y la seguridad del usuario mediante avisos explícitos sobre el alcance de la aplicación.

### Requerimientos Técnicos
1. **Flujo de Onboarding:** Pantalla obligatoria post-registro de Google donde el usuario debe leer y aceptar activamente los términos, condiciones y el aviso legal antes de poder usar cualquier herramienta de la app.
2. **Acceso Permanente:** El descargo de responsabilidad debe estar disponible para consulta en cualquier momento dentro de la sección de Configuración o Información de la aplicación.
3. **Criterio de Texto Obligatorio:** Debe indicar explícitamente: *"Esta aplicación es una herramienta tecnológica de soporte, autoayuda y acompañamiento psicoeducativo. Bajo ninguna circunstancia reemplaza o sustituye la consulta médica, el diagnóstico clínico, la psicoterapia o los tratamientos profesionales formales."*


# Hito 5: Paso a producción
Plan de despliegue para VittalMind v0.1.0 (MVP)
## 1. Base de datos gratuita (PostgreSQL)
Servicio	Gratis	Storage
Supabase	✅	500 MB
Neon	✅	500 MB
Railway	✅ (limitado)	—
ElephantSQL	✅	20 MB
Recomendación → Supabase. Tiene PostgreSQL real, SSL, 500 MB gratis, y además te da autenticación si un día la necesitas. Creas proyecto, obtienes:
DB_HOST=db.xxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=xxx
DB_SSL=true
## 2. Arquitectura final
Cliente (Expo App)
     ↕ HTTPS
Hostinger VPS (Node.js/Express)
     ↕ SSL
Supabase (PostgreSQL)
Hostinger VPS corre el backend Node.js perfectamente. No necesitas PostgreSQL en Hostinger — solo instalas Node.js y Config Manager para las env vars.
## 3. Pasos concretos (orden cronológico)
### Fase A — Infraestructura
1. Crear proyecto en Supabase → copiar credenciales
2. Agregar DB_SSL=true al backend (hostinger requiere SSL para conexiones externas)
3. Agregar rejectUnauthorized: false en la conexión pg (o certificado CA de Supabase)
4. Configurar Hostinger:
- Crear VPS (o hosting Node.js si tienen plan)
- Instalar Node.js 20.x
- Subir backend compilado (git clone + npm ci && npm run build)
- Configurar variables de entorno en el panel de Hostinger
- Ejecutar migraciones: npm run migrate
- Ejecutar seeds: npm run seed
5. Configurar PM2 (o el gestor de procesos de Hostinger) para mantener vivo el proceso
6. Poner Nginx como reverse proxy (Hostinger suele traerlo) con SSL/HTTPS
### Fase B — Google OAuth
 7. Ir a Google Cloud Console → crear proyecto "VittalMind"
 8. Configurar pantalla de consentimiento OAuth (External, datos: email, perfil)
 9. Crear credenciales:
- Web Client ID para el backend (validación de tokens)
- Android Client ID (para Expo Google Sign-In)
- iOS Client ID (para Expo Google Sign-In)
10. Configurar scheme vittalmind en Google Cloud (URL de redireccionamiento)
11. Actualizar GOOGLE_CLIENT_ID en el backend con el Web Client ID
12. Actualizar app.json con los client IDs de Android/iOS
13. Probar el flujo completo (login → JWT → endpoints protegidos)
Sobre tu privacidad: El patrón está bien implementado. El backend recibe el token de Google, valida, almacena email + nombre en usuarios_auth, pero el JWT solo contiene id_anonimo. Toda la data clínica (timeline, diarios, tests) se vincula al id_anonimo. Tú tienes el email del usuario pero no está expuesto en ningún endpoint operacional. Estás cubierto.
### Fase C — Build y Stores
14. Expo EAS Build para generar binarios:
npm install -g eas-cli
eas build --platform android --profile production  → .aab para Google Play
eas build --platform ios --profile production      → .ipa para TestFlight
15. Google Play Console ($25 única vez):
- Crear listing (nombre, descripción, capturas de pantalla, categoría: Salud y Bienestar)
- Subir el .aab
- Completar el formulario de datos de salud (requerido para apps de salud mental)
- Política de privacidad (necesitas una — puedes usar un generador online)
- Disclaimer legal obligatorio en la descripción
16. Apple Developer Program ($99/año):
- Subir .ipa a App Store Connect via Transporter o Xcode
- Completar "App Review Information" (datos de salud también requieren justificación)
- Configurar "Export Compliance" (usa HTTPS, responder "No" a cifrado propio)
### Fase D — Post-lanzamiento
17. Actualizar APP_STORE_URL en el backend con las URLs reales de las stores
18. Monitorear con logs de Hostinger + PM2
19. Probar el flujo de versionado (cambiar APP_LATEST_VERSION para ver el modal)
