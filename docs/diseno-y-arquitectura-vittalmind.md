# DOCUMENTO DE DISEÑO TÉCNICO, ARQUITECTURA Y ESPECIFICACIÓN DEL PRODUCTO (VITTALMIND)

**SISTEMA:** VittalMind — Salud Mental, Bienestar Emocional y Productividad Clínica  
**VERSIÓN:** 0.3.1 (Producción — Rama `main`)  
**FECHA DE EMISIÓN:** 25 de Octubre de 2026  
**DESTINATARIOS:** Equipo de Ingeniería, Arquitectura, Due Diligence Técnico e Inversionistas  

---

## 1. VISIÓN DEL PRODUCTO Y PRINCIPIOS DE DISEÑO

**VittalMind** es una plataforma móvil y backend para el bienestar emocional y la salud mental, co-diseñada bajo una sinergia estricta entre la **Ingeniería de Software de Alto Desempeño** y el **Rigor Clínico Psicológico**. 

Su propósito central es ofrecer a los usuarios herramientas de autorregulación emocional, psicoeducación interactiva, diarios de gratitud, comunicación asertiva asistida por Inteligencia Artificial y protocolos inmediatos de contingencia ante crisis de pánico o suicidio, bajo una experiencia de usuario (UX) minimalista, cálida y de baja fricción cognitiva.

```mermaid
flowchart TD
    A["VittalMind: Principios de Arquitectura"] --> B["1. Privacy-First<br/>(Anonimato Estricto)"]
    A --> C["2. Offline-First<br/>(Resiliencia de Red)"]
    A --> D["3. Modularidad Dinámica<br/>(CMS Desacoplado)"]
    A --> E["4. Asistencia Clínica IA<br/>(Supervisión CNV)"]
    
    B --> B1["Desacoplamiento total entre identidad real (email/nombre) y registros clínicos mediante id_anonimo (UUIDv4)"]
    C --> C1["Almacenamiento local SQLite + gestor de sincronización idempotente por client_uuid"]
    D --> D1["Contenido clínico administrado en WordPress y servido en JSONB sin recompilar la app"]
    E --> E1["Modelos de lenguaje restringidos por prompts clínicos de Marshall Rosenberg"]
```

### 1.1. Principios Fundamentales
1. **Seguridad y Privacidad Estricta (Patrón de Anonimato):** Los datos clínicos (diarios, hitos de ánimo, gratitud, cuestionarios) **nunca** se vinculan a la identidad real del usuario (nombre, email). Toda la interacción transaccional viaja y se almacena bajo un identificador pseudo-aleatorio único: `id_anonimo` (`UUIDv4`).
2. **Arquitectura Offline-First:** Las herramientas críticas (Timeline, Gratitud, Botón de Pánico, lecturas descargadas) funcionan con o sin conectividad celular/Wi-Fi, almacenando datos localmente en SQLite y sincronizándolos de forma idempotente al restablecerse la red.
3. **Modularidad Dinámica:** Los contenidos psicoeducativos no están cableados en la aplicación móvil. Son servidos por el backend desde bases de datos relacionales y administrados por terapeutas mediante un plugin especializado en WordPress.
4. **Asistencia Supervisada por IA:** Las herramientas de Inteligencia Artificial (ej. Traductor Asertivo basado en Comunicación No Violenta - CNV) aplican una estricta sanitización de prompts para evitar respuestas diagnósticas o reactivas, garantizando un enfoque exclusivamente psicoeducativo.

---

## 2. ARQUITECTURA GENERAL DEL SISTEMA

El sistema opera bajo una **arquitectura desacoplada en tres capas principales**, complementada por microservicios en la nube y sincronizadores de contenido:

```mermaid
graph TB
    subgraph "Capa de Presentación (Frontend Móvil)"
        UI["React Native 0.86 / Expo SDK 57<br/>TypeScript"]
        NAV["Navegación Stack / Modales<br/>@react-navigation"]
        STORE["Almacenamiento Local Seguro<br/>expo-secure-store & expo-sqlite"]
        SYNC["SyncManager<br/>(Encolamiento Idempotente)"]
        GEO["Ubicación Pasiva en Memoria<br/>expo-location (Sin persistencia)"]
    end

    subgraph "Capa de Negocio y API (Backend)"
        API["Node.js 20 LTS / Express 4.21<br/>TypeScript API RESTful"]
        SEC["Middlewares de Seguridad<br/>Helmet, CORS, JWT Auth, RLS"]
        CTRL["Controladores REST<br/>Auth, Gratitud, Timeline, Psicoeducación"]
        SVC["Servicios de Dominio<br/>Lógica de Negocio y Validación"]
        REPO["Repositorios de Persistencia<br/>Consultas SQL Parametrizadas"]
    end

    subgraph "Capa de Persistencia y Datos"
        DB[("PostgreSQL 15+ (Supabase Cloud)<br/>SSL Forzado, Pool de Conexiones, RLS Activo")]
    end

    subgraph "Servicios Externos y Satélites"
        LLM["Proveedores de IA<br/>OpenRouter / Groq / OpenAI"]
        PUSH["Expo Push Notification Services"]
        CMS["WordPress CMS + Plugins Especializados<br/>(vittalmind-psicoeducacion & notificaciones)"]
        AUTH_EXT["Proveedores OAuth 2.0<br/>Google Cloud Platform & Apple Developer"]
    end

    UI --> NAV
    UI --> STORE
    STORE <--> SYNC
    UI --> GEO
    
    UI -->|HTTPS / REST / JWT Bearer| API
    SYNC -->|Batch Sync Idempotente| API
    
    API --> SEC --> CTRL --> SVC --> REPO --> DB
    
    SVC -->|Tokens OAuth| AUTH_EXT
    SVC -->|Prompts CNV (JSON REST)| LLM
    SVC -->|Push Tokens| PUSH
    CMS -->|Gestión Contenidos / Migración| DB
```

---

## 3. DIAGRAMA DE CASOS DE USO (ACTORES Y SISTEMA)

El sistema distingue tres actores principales:
- **Usuario / Paciente:** Persona que busca gestionar su salud mental, registrar su día a día y acceder a recursos clínicos.
- **Profesional / Terapeuta:** Terapeuta avalado registrado en el directorio para vinculación y contacto.
- **Administrador Clínico / Psicólogo CMS:** Co-autor o terapeuta autorizado para publicar manuales, lecturas y notificaciones.

```mermaid
flowchart LR
    User(("Usuario / Paciente"))
    Prof(("Terapeuta en Directorio"))
    Admin(("Administrador Clínico / CMS"))

    subgraph "Módulo de Identidad y Seguridad"
        UC1["Registrarse / Iniciar Sesión (Google, Apple, Local)"]
        UC2["Activar Autenticación Biométrica"]
        UC3["Configurar Preguntas de Seguridad Criptográficas"]
        UC4["Aceptar Descargo de Responsabilidad Legal (Disclaimer)"]
    end

    subgraph "Módulo de Registro Emocional y Hábitos"
        UC5["Registrar Hito en Línea del Tiempo (Timeline)"]
        UC6["Registrar Agradecimiento Diario en Círculo de Gratitud"]
        UC7["Visualizar Racha y Flor Dinámica de Gratitud"]
        UC8["Sincronizar Datos Locales sin Conexión (Offline-First)"]
    end

    subgraph "Módulo de Psicoeducación y Ejercicios"
        UC9["Explorar Tópicos (Ansiedad, Parejas, Amor Propio)"]
        UC10["Completar Formularios y Cuestionarios Interactivos"]
        UC11["Descargar Guías y Manuales Clínicos en PDF"]
        UC12["Visualizar Videos de Apoyo Psicológico"]
    end

    subgraph "Módulo de Asistencia y Crisis"
        UC13["Usar Traductor Asertivo (CNV con IA)"]
        UC14["Activar Botón de Pánico (Líneas de Emergencia por País)"]
        UC15["Contactar a Profesional del Directorio"]
    end

    subgraph "Módulo de Administración Clínica (CMS)"
        UC16["Publicar / Modificar Lecturas y Tópicos"]
        UC17["Gestionar Plantillas de Notificaciones Push"]
    end

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6
    User --> UC7
    User --> UC8
    User --> UC9
    User --> UC10
    User --> UC11
    User --> UC12
    User --> UC13
    User --> UC14
    User --> UC15

    Prof -.->|Recepción de Pacientes| UC15
    Admin --> UC16
    Admin --> UC17
```

---

## 4. DIAGRAMA DE BASE DE DATOS (ENTITY-RELATIONSHIP DIAGRAM - ERD)

A continuación se muestra el modelo relacional de la base de datos de producción (PostgreSQL), que implementa el **patrón de disociación de identidad**:

```mermaid
erDiagram
    USUARIOS_AUTH ||--o{ REFRESH_TOKENS : "emite"
    USUARIOS_AUTH ||--o{ PREGUNTAS_SEGURIDAD : "protege con"
    USUARIOS_AUTH ||--o{ TIMELINE_EVENTS : "crea (via id_anonimo)"
    USUARIOS_AUTH ||--o{ GRATITUDE_ENTRIES : "escribe (via id_anonimo)"
    USUARIOS_AUTH ||--o| GRATITUDE_STREAKS : "acumula (via id_anonimo)"
    USUARIOS_AUTH ||--o{ USUARIO_PROGRESO_PSICOEDUCACION : "avanza (via id_anonimo)"
    USUARIOS_AUTH ||--o{ NOTIFICATION_DEVICES : "vincula (via id_anonimo)"
    USUARIOS_AUTH ||--o| NOTIFICATION_PREFERENCES : "configura (via id_anonimo)"

    CATEGORIAS_PSICOEDUCACION ||--o{ TEMAS_PSICOEDUCACION : "contiene"
    TEMAS_PSICOEDUCACION ||--o{ CONTENIDOS_BLOQUES : "desglosa en"
    CONTENIDOS_BLOQUES ||--o{ USUARIO_PROGRESO_PSICOEDUCACION : "evalua"

    USUARIOS_AUTH {
        int id_usuario PK
        string email UK "Email disociado"
        string password_hash "Bcrypt (NULL si Google/Apple)"
        string auth_provider "local | google | apple"
        string nombre_completo "Disociado de datos clinicos"
        uuid id_anonimo UK "UUIDv4 unico utilizado en sistema clinico"
        boolean acepto_disclaimer "Aceptacion legal"
        string role "user | admin"
        timestamp created_at
        timestamp updated_at
    }

    REFRESH_TOKENS {
        int id PK
        uuid id_anonimo FK "Referencia usuarios_auth(id_anonimo)"
        string token_hash "SHA256 del refresh token"
        timestamp expires_at "Expiracion 30 dias"
        boolean revoked "Bandera de revocacion"
        timestamp created_at
    }

    PREGUNTAS_SEGURIDAD {
        int id PK
        uuid id_anonimo FK "Referencia usuarios_auth(id_anonimo)"
        string pregunta "Texto de la pregunta"
        string respuesta_hash "Bcrypt de la respuesta saneada"
        timestamp created_at
    }

    TIMELINE_EVENTS {
        int id PK
        uuid id_anonimo "Referencia logica a id_anonimo"
        string client_uuid UK "UUIDv4 del dispositivo para idempotencia offline"
        string emoji "Icono de emocion"
        string emocion_label "Etiqueta descriptiva"
        text descripcion "Texto del hito o pensamiento"
        text sentimiento "Analisis reflexivo personal"
        timestamp fecha "Fecha del suceso"
        timestamp created_at
    }

    GRATITUDE_ENTRIES {
        int id PK
        uuid id_anonimo "Referencia logica a id_anonimo"
        string client_uuid UK "UUIDv4 para idempotencia offline"
        text texto "Reflexion diaria de agradecimiento"
        date fecha "Dia calendario registrado"
        timestamp created_at
    }

    GRATITUDE_STREAKS {
        int id PK
        uuid id_anonimo UK "Referencia logica a id_anonimo"
        int current_streak "Racha actual en dias"
        int best_streak "Mejor racha historica"
        date last_completed_date "Ultima fecha computada"
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIAS_PSICOEDUCACION {
        int id PK
        string slug UK "Identificador URL"
        string titulo "Nombre de la categoria"
        text descripcion "Sintesis"
        string icono "Identificador visual"
        int orden "Secuencia de presentacion"
        timestamp created_at
    }

    TEMAS_PSICOEDUCACION {
        int id PK
        int categoria_id FK "Referencia categorias_psicoeducacion(id)"
        string titulo "Titulo del modulo"
        text descripcion_breve "Resumen"
        string autor "Nombre de autor / terapeuta"
        boolean exportar_pdf "Habilita exportacion documental"
        int orden "Secuencia"
        timestamp created_at
        timestamp updated_at
    }

    CONTENIDOS_BLOQUES {
        int id PK
        int tema_id FK "Referencia temas_psicoeducacion(id)"
        string pilar "CONCIENCIA | ACEPTACION | ACCION"
        string tipo_componente "TEXTO | TABLA_COMPARATIVA | CUESTIONARIO | EJERCICIO | FORMULARIO | VIDEO_YOUTUBE"
        string titulo_bloque "Encabezado"
        jsonb cuerpo_json "Estructura dinamica renderizada por la app"
        int orden "Posicion dentro del pilar"
        timestamp created_at
        timestamp updated_at
    }

    USUARIO_PROGRESO_PSICOEDUCACION {
        int id PK
        uuid id_anonimo "Referencia logica a id_anonimo"
        int bloque_id FK "Referencia contenidos_bloques(id)"
        jsonb respuestas_usuario_json "Respuestas y notas"
        boolean completado "Estado de finalizacion"
        timestamp actualizado_en
    }

    PROFESIONALES {
        int id PK
        string nombre "Nombre del terapeuta"
        string especialidad "Area clinica"
        text descripcion "Perfil academico y enfoque"
        string telefono "Numero de contacto"
        string email "Correo corporativo"
        boolean activo "Disponibilidad en catalogo"
        timestamp created_at
    }

    NOTIFICATION_DEVICES {
        bigint id PK
        uuid id_anonimo "Referencia logica a id_anonimo"
        string device_id "Identificador de hardware"
        string push_token UK "Token de Expo Push Services"
        string platform "ios | android"
        string app_version "Version del cliente"
        string locale "Idioma"
        string timezone "Huso horario del usuario"
        boolean push_enabled "Estado de recepcion"
        timestamp last_seen_at
    }

    NOTIFICATION_PREFERENCES {
        uuid id_anonimo PK "Referencia logica a id_anonimo"
        boolean enabled "Interruptor general"
        boolean gratitude_reminder_enabled "Recordatorio diario de gratitud"
        boolean motivation_enabled "Frases de bienestar"
        boolean announcements_enabled "Anuncios del sistema"
        time reminder_time_local "Hora programada"
        time quiet_hours_start "Inicio horario no molestar"
        time quiet_hours_end "Fin horario no molestar"
        string timezone
    }
```

---

## 5. DIAGRAMAS DE CLASES Y MODELOS (FRONTEND Y BACKEND)

### 5.1. Diagrama de Clases del Backend (TypeScript / Express Architecture)
El backend implementa un patrón **Controller - Service - Repository**:

```mermaid
classDiagram
    class AuthController {
        +register(req, res)
        +login(req, res)
        +googleAuth(req, res)
        +appleAuth(req, res)
        +refreshToken(req, res)
        +setSecurityQuestions(req, res)
        +verifySecurityQuestions(req, res)
        +resetPassword(req, res)
    }

    class AuthService {
        -UserRepository userRepo
        -RefreshTokenRepository tokenRepo
        -SecurityQuestionsRepository questionsRepo
        +register(email, password, nombre)
        +login(email, password)
        +authenticateWithGoogle(idToken)
        +authenticateWithApple(identityToken, fullName)
        +refreshAccessToken(tokenStr)
    }

    class UserRepository {
        +findByEmail(email)
        +findByIdAnonimo(idAnonimo)
        +createLocal(email, hash, nombre)
        +createGoogle(email, nombre)
        +createApple(email, nombre)
        +updatePassword(idAnonimo, newHash)
    }

    class TimelineController {
        -TimelineService timelineService
        +getEvents(req, res)
        +createEvent(req, res)
        +syncBatch(req, res)
        +deleteEvent(req, res)
    }

    class TimelineService {
        -TimelineRepository timelineRepo
        +listUserEvents(idAnonimo)
        +recordEvent(idAnonimo, eventData)
        +processBatch(idAnonimo, eventsList)
    }

    class TimelineRepository {
        +getByUser(idAnonimo)
        +insertSingle(idAnonimo, eventData)
        +upsertBatch(idAnonimo, eventsList)
    }

    class GratitudeController {
        -GratitudeService gratitudeService
        +getStreak(req, res)
        +listEntries(req, res)
        +postEntry(req, res)
    }

    class GratitudeService {
        -GratitudeRepository gratitudeRepo
        +saveEntryAndRecalculate(idAnonimo, text, clientUuid)
        +getUserStreak(idAnonimo)
        -calculateStreakDays(lastDate, currentDate, currentStreak)
    }

    class ToolsController {
        -AIService aiService
        +assertiveTranslate(req, res)
    }

    class AIService {
        -string apiKey
        -string baseURL
        -string promptCNV
        +translateToAssertive(rawText) string
    }

    AuthController --> AuthService
    AuthService --> UserRepository
    TimelineController --> TimelineService
    TimelineService --> TimelineRepository
    GratitudeController --> GratitudeService
    ToolsController --> AIService
```

### 5.2. Diagrama de Clases y Módulos del Frontend (React Native / Expo Architecture)
El frontend implementa una arquitectura desacoplada basada en **Custom Hooks, Context API y Capa de Persistencia Local**:

```mermaid
classDiagram
    class AuthContext {
        +UserSession session
        +boolean isAuthenticated
        +login(email, password)
        +loginGoogle()
        +loginApple()
        +logout()
        +enableBiometrics()
    }

    class SyncManager {
        -DbService db
        -ApiService api
        +enqueueAction(type, payload, clientUuid)
        +flushQueue()
        +listenNetworkStatus()
    }

    class DbService {
        +initDatabase()
        +saveTimelineLocal(event)
        +getTimelineLocal()
        +saveGratitudeLocal(entry)
        +markSynchronized(clientUuid)
    }

    class UseTimeline {
        +TimelineEvent[] events
        +boolean loading
        +addEvent(emoji, label, desc, sentiment)
        +refreshEvents()
    }

    class UseGratitude {
        +GratitudeStreak streak
        +GratitudeEntry[] entries
        +addEntry(text)
        +fetchStreak()
    }

    class UsePanic {
        +CountryEmergency emergencyData
        +boolean isLocating
        +triggerPanicCall()
        -resolveCountryFromGPS(lat, lon)
    }

    class ContentBlockRenderer {
        +render(block: ContenidoBloque)
        -renderTexto()
        -renderTablaComparativa()
        -renderCuestionario()
        -renderEjercicio()
        -renderVideoYouTube()
    }

    UseTimeline --> SyncManager
    UseTimeline --> DbService
    UseGratitude --> SyncManager
    UseGratitude --> DbService
    SyncManager --> DbService
    AuthContext --> SyncManager
```

---

## 6. DIAGRAMAS DE FLUJO (PROCESOS CRÍTICOS DEL SISTEMA)

### 6.1. Flujo de Autenticación, Disociación de Privacidad y Biometría

```mermaid
flowchart TD
    Start(["Inicio de App"]) --> CheckToken{"¿Existe Refresh Token<br/>en SecureStore?"}
    
    CheckToken -- Sí --> CheckBio{"¿Biometría habilitada<br/>por el usuario?"}
    CheckToken -- No --> ShowAuthScreen["Mostrar Welcome / Login"]
    
    CheckBio -- Sí --> PromptBio["Solicitar Huella / FaceID<br/>(expo-local-authentication)"]
    CheckBio -- No --> RefreshJWT["Solicitar nuevo Access Token<br/>(POST /auth/refresh)"]
    
    PromptBio -- Éxito --> RefreshJWT
    PromptBio -- Falló --> ShowAuthScreen
    
    RefreshJWT -- Válido --> LoadSession["Iniciar Sesión con id_anonimo<br/>(Identidad Real Oculta)"]
    RefreshJWT -- Inválido / Expirado --> ShowAuthScreen
    
    ShowAuthScreen --> SelectMethod{"Método Elegido"}
    SelectMethod -- Google --> FlowGoogle["Google OAuth 2.0 PKCE<br/>expo-auth-session"]
    SelectMethod -- Apple --> FlowApple["Sign in with Apple<br/>expo-apple-authentication"]
    SelectMethod -- Local --> FlowLocal["Email + Contraseña"]
    
    FlowGoogle --> VerifyBackend["Validar Token en Backend<br/>(google-auth-library / apple-verify)"]
    FlowApple --> VerifyBackend
    FlowLocal --> VerifyBackend
    
    VerifyBackend --> CheckUser{"¿Usuario existe en<br/>usuarios_auth?"}
    CheckUser -- No --> CreateAnon["Generar UUIDv4 id_anonimo<br/>e insertar disociado"]
    CheckUser -- Sí --> IssueTokens["Emitir JWT Access (1h)<br/>y Refresh Token (30d)"]
    CreateAnon --> IssueTokens
    
    IssueTokens --> StoreSecure["Guardar en expo-secure-store"]
    StoreSecure --> CheckDisclaimer{"¿Disclaimer aceptado?"}
    CheckDisclaimer -- No --> ShowDisclaimer["Pantalla de Aviso Legal Obligatorio"]
    ShowDisclaimer --> DisclaimerAgreed["Aceptar y registrar"]
    DisclaimerAgreed --> MainApp["Ingreso a Pantalla Principal (Home)"]
    CheckDisclaimer -- Sí --> MainApp
```

### 6.2. Flujo del Botón de Pánico y Manejo de Crisis (Privacidad Estricta de GPS)

```mermaid
flowchart TD
    Trigger(["Usuario pulsa Botón de Pánico"]) --> OpenModal["Abrir PanicModal con interfaz de calma"]
    OpenModal --> AskLocation{"¿Permiso de ubicación concedido?"}
    
    AskLocation -- Sí --> ReadGPS["Lectura efímera de coordenadas<br/>en memoria (expo-location)"]
    AskLocation -- No --> DefaultCountry["Seleccionar país por defecto o manual"]
    
    ReadGPS --> MatchCountry["Calcular código de país ISO<br/>mediante geocodificación inversa"]
    MatchCountry --> PurgeGPS["Destruir coordenadas de memoria<br/>(CERO almacenamiento en BD / disco)"]
    
    PurgeGPS --> QueryNumbers["Buscar teléfonos de emergencia clínica<br/>(Línea 106, 911, prevención de suicidio)"]
    DefaultCountry --> QueryNumbers
    
    QueryNumbers --> DisplayNumbers["Mostrar tarjetas de contacto de auxilio"]
    DisplayNumbers --> UserCall["Usuario pulsa botón Llamar"]
    UserCall --> LaunchDialer["Lanzar marcador telefónico nativo<br/>(Linking.openURL tel:xxx)"]
    LaunchDialer --> End(["Fin del protocolo"])
```

### 6.3. Flujo del Traductor Asertivo (Comunicación No Violenta - CNV)

```mermaid
flowchart TD
    InputText(["Usuario ingresa mensaje reactivo o conflictivo"]) --> CheckMinLength{"¿Longitud > 5 caracteres?"}
    CheckMinLength -- No --> AlertUser["Pedir mensaje más descriptivo"]
    CheckMinLength -- Sí --> SendBackend["POST /tools/assertive-translate<br/>(JWT Bearer)"]
    
    SendBackend --> BackendMiddleware["Validar JWT y extraer id_anonimo"]
    BackendMiddleware --> SanitizeInput["Sanitizar texto contra Prompt Injections"]
    
    SanitizeInput --> AssemblePrompt["Construir Payload con Sistema Marshall Rosenberg:<br/>1. Observación sin juicio<br/>2. Identificación de sentimientos<br/>3. Necesidad subyacente<br/>4. Petición clara y asertiva"]
    
    AssemblePrompt --> CallLLM["Llamada API a LLM (OpenRouter / Groq)<br/>Modelo Llama 3.3 / Gemini"]
    CallLLM --> CheckResponse{"¿Respuesta exitosa de IA?"}
    
    CheckResponse -- Fallo / Timeout --> FallbackRule["Aplicar algoritmo de respaldo heurístico o reintentar"]
    CheckResponse -- Éxito --> ExtractText["Extraer texto procesado"]
    
    ExtractText --> DeliveryFrontend["Retornar respuesta en JSON"]
    FallbackRule --> DeliveryFrontend
    DeliveryFrontend --> RenderUI["Mostrar traducción asertiva en tarjeta con opción de copiar"]
    RenderUI --> End(["Fin del proceso"])
```

---

## 7. DIAGRAMAS DE SECUENCIA (INTERACCIONES CLAVE)

### 7.1. Secuencia de Sincronización Offline-First (Timeline y Gratitud)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario (Móvil)
    participant UI as Pantalla Timeline
    participant LocalDB as SQLite Local (db.ts)
    participant Sync as SyncManager (sync-manager.ts)
    participant API as Backend REST (/timeline)
    participant Postgres as Supabase PostgreSQL

    User->>UI: Registra hito emocional (Emoji, Descripción, Sentimiento)
    UI->>LocalDB: Genera client_uuid (v4) y guarda registro en local (synced = 0)
    LocalDB-->>UI: Confirmación de guardado instantáneo (<10ms)
    UI-->>User: Actualización visual optimista en la lista

    Note over Sync: Detección de conectividad (NetInfo)
    Sync->>Sync: Comprobar estado de conexión a Internet
    
    alt Sin Conexión a Red (Offline)
        Sync-->>UI: Permanece en cola local hasta restablecimiento
    else Con Conexión Activa (Online)
        Sync->>LocalDB: Consultar eventos pendientes (synced = 0)
        LocalDB-->>Sync: Retorna lote de eventos con client_uuid
        Sync->>API: POST /timeline/batch (Array de eventos con client_uuid)
        API->>Postgres: INSERT INTO timeline_events ON CONFLICT (client_uuid) DO NOTHING
        Postgres-->>API: Transacción confirmada
        API-->>Sync: 200 OK (Array de client_uuid sincronizados exitosamente)
        Sync->>LocalDB: UPDATE timeline_events SET synced = 1 WHERE client_uuid IN (...)
        LocalDB-->>Sync: OK
        Sync-->>UI: Actualiza indicador de estado sincronizado
    end
```

### 7.2. Secuencia de Consulta Dinámica de Psicoeducación (CMS Desacoplado)

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario (Móvil)
    participant Screen as PsychoeducationTopicScreen
    participant Cache as AsyncStorage Cache
    participant API as Backend REST (/psychoeducation)
    participant DB as Supabase PostgreSQL
    actor Clinico as Psicólogo Clínico (WordPress)

    Clinico->>Clinico: Publica o edita bloque interactivo en Plugin WordPress
    Clinico->>DB: Actualización directa de contenidos_bloques (JSONB dinámico)

    User->>Screen: Abre Tópico (ej. "Relaciones de Pareja")
    Screen->>Cache: Verificar si existe versión en caché local
    alt Existe en Caché Local
        Cache-->>Screen: Retorna bloques cacheados para render inmediato
        Screen-->>User: Despliega contenido sin tiempo de espera
    end

    Screen->>API: GET /psychoeducation/topics/:id/blocks (Header If-Modified-Since)
    API->>DB: SELECT * FROM contenidos_bloques WHERE tema_id = :id ORDER BY orden ASC
    DB-->>API: Filas con JSONB (Pilar: Conciencia, Aceptación, Acción)
    API-->>Screen: 200 OK con bloques actualizados
    Screen->>Cache: Sobrescribir caché local con última versión
    Screen->>Screen: ContentBlockRenderer genera dinámicamente formularios y ejercicios
    Screen-->>User: Interfaz interactiva actualizada sin recompilar la app
```

---

## 8. DISEÑO DE INTERFAZ Y EXPERIENCIA DE USUARIO (UI/UX)

### 8.1. Sistema de Diseño Visual y Paleta Cromática
La interfaz sigue una directriz de **baja estimulación visual**, diseñada para personas en estados de alta vulnerabilidad emocional, ansiedad o estrés.

| Elemento | Token / Valor Hex | Uso en el Sistema |
|---|---|---|
| **Fondo Principal** | `#FBF9F8` | Blanco cálido que disminuye el deslumbramiento y fatiga visual |
| **Superficie / Cards** | `#FFFFFF` | Contenedores con elevación sutil y bordes redondeados (`borderRadius: 16`) |
| **Texto Primario** | `#1C1917` | Gris carbón profundo para máximo contraste accesible |
| **Texto Secundario** | `#78716C` | Tono tierra suave para subtítulos y metadatos |
| **Acento Primario (Salvia)** | `#4A7C59` | Verde sereno que evoca naturaleza, calma y estabilidad |
| **Acento Secundario (Lavanda)** | `#7E6B8F` | Tono terapéutico para tópicos de reflexión y aceptación |
| **Alerta / Crisis** | `#C0392B` | Rojo reservado exclusivamente para el Botón de Pánico |
| **Tipografía** | System Font (San Francisco / Roboto) | Legibilidad nativa fluida en cualquier dispositivo |

### 8.2. Estructura de Navegación de la Aplicación

```mermaid
graph TD
    Root["RootNavigator"] --> AuthStack["Auth Stack"]
    Root --> MainTabs["Main App Tabs"]

    AuthStack --> Welcome["WelcomeScreen"]
    AuthStack --> Login["LoginScreen"]
    AuthStack --> Register["RegisterScreen"]
    AuthStack --> Disclaimer["DisclaimerScreen (Legal)"]
    AuthStack --> SecurityQuestions["SecurityQuestionsScreen"]
    AuthStack --> ForgotPassword["ForgotPasswordScreen"]

    MainTabs --> TabHome["Tab: Inicio (HomeScreen)"]
    MainTabs --> TabPsico["Tab: Psicoeducación (BibliotecaScreen)"]
    MainTabs --> TabGratitude["Tab: Círculo de Gratitud (GratitudeScreen)"]
    MainTabs --> TabTimeline["Tab: Línea de Tiempo (TimelineScreen)"]
    MainTabs --> TabTools["Tab: Herramientas (ToolsScreen)"]

    TabTools --> ToolAssertive["Traductor Asertivo (CNV)"]
    TabTools --> ToolExercises["Ejercicios Guiados"]
    TabTools --> ToolProfessionals["Directorio de Terapeutas"]
    TabTools --> ToolDownloads["Descargas Offline"]

    TabPsico --> TopicDetail["PsychoeducationTopicScreen"]
    TopicDetail --> BlockRender["ContentBlockRenderer (Texto, Tablas, Cuestionarios, Videos)"]

    MainTabs -.->|Acceso Global Flotante| PanicModal["Modal Botón de Pánico (Asistencia Inmediata)"]
```

---

## 9. MATRIZ DE SEGURIDAD, PRIVACIDAD Y ESPECIFICACIÓN DE ENDPOINTS

### 9.1. Matriz de Endpoints de Producción (API RESTful)

| Módulo | Método | Endpoint | Autenticación | Descripción Funcional |
|---|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Pública | Registro de usuario local con hash Bcrypt. |
| **Auth** | `POST` | `/auth/login` | Pública | Login local; retorna Access Token y Refresh Token. |
| **Auth** | `POST` | `/auth/google` | Pública | Verificación de Google ID Token y vinculación con `id_anonimo`. |
| **Auth** | `POST` | `/auth/apple` | Pública | Verificación de Apple Identity Token y disociación de identidad. |
| **Auth** | `POST` | `/auth/refresh` | Pública | Rotación de Refresh Token para extender sesión sin reautenticar. |
| **Auth** | `POST` | `/auth/security-questions`| Bearer JWT | Configuración de preguntas de seguridad para recuperación. |
| **Timeline** | `GET` | `/timeline` | Bearer JWT | Consulta de hitos cronológicos asociados al `id_anonimo`. |
| **Timeline** | `POST` | `/timeline` | Bearer JWT | Creación individual de un hito emocional. |
| **Timeline** | `POST` | `/timeline/batch` | Bearer JWT | Sincronización idempotente de lote de eventos offline. |
| **Gratitud** | `GET` | `/gratitude/streak` | Bearer JWT | Obtención de días consecutivos y racha histórica del usuario. |
| **Gratitud** | `POST` | `/gratitude/entries` | Bearer JWT | Registro de gratitud del día y recalculo automático de racha. |
| **Psicoeducación**| `GET` | `/psychoeducation/categories` | Bearer JWT | Listado de categorías clínicas (Ansiedad, Pareja, etc.). |
| **Psicoeducación**| `GET` | `/psychoeducation/topics/:id` | Bearer JWT | Lectura de temas con sus bloques dinámicos y JSONB. |
| **Herramientas** | `POST` | `/tools/assertive-translate` | Bearer JWT | Procesamiento de comunicación asertiva asistida por IA. |
| **Profesionales** | `GET` | `/professionals` | Bearer JWT | Directorio de terapeutas activos para agendamiento. |
| **Sistema** | `GET` | `/app/version` | Pública | Control de versiones mínimas y obligatorias de tiendas. |
| **Salud** | `GET` | `/health` | Pública | Healthcheck de disponibilidad de base de datos y backend. |

### 9.2. Mecanismos de Ciberseguridad y Protección de Datos
1. **Row Level Security (RLS) en Supabase:**
   - La totalidad de las tablas en el esquema `public` tienen RLS habilitado.
   - El acceso anónimo público por PostgREST está denegado; las consultas transaccionales solo se efectúan mediante el pool seguro del Backend con rol de servicio autenticado.
2. **Hardening de Cabeceras HTTP:**
   - Implementación de `helmet` para protección contra Clickjacking (`X-Frame-Options`), inyección de contenido (`X-Content-Type-Options`) y Cross-Site Scripting (`X-XSS-Protection`).
3. **Criptografía de Contraseñas y Respuestas de Seguridad:**
   - Hashing mediante `bcrypt` con factor de coste de 10 rondas de salt para contraseñas locales y respuestas a preguntas de recuperación.
4. **Almacenamiento Local Cifrado:**
   - En el dispositivo móvil, los tokens de sesión sensibles se almacenan en el hardware de seguridad mediante `expo-secure-store` (Keychain en iOS y EncryptedSharedPreferences en Android).
5. **Sanitización de Datos de Ubicación:**
   - Las coordenadas GPS utilizadas para mapear los números de emergencia en el Botón de Pánico se mantienen **únicamente en la memoria volátil (RAM)** de la app móvil mientras el modal está abierto, y se destruyen inmediatamente. Ninguna coordenada es transmitida a la red ni guardada en bases de datos.

---

## 10. CONCLUSIONES Y TRANSFERIBILIDAD TÉCNICA

La arquitectura de VittalMind descrita en este documento representa un producto maduro, estable y probado en producción (rama `main`), caracterizado por:
1. **Escalabilidad Horizontal:** Separación completa entre Frontend móvil, API RESTful stateless y PostgreSQL relacional.
2. **Independencia Operativa:** Capacidad de actualizar contenidos clínicos y psicoeducativos en tiempo real mediante CMS sin depender de ciclos de aprobación en App Store o Google Play.
3. **Cumplimiento Normativo de Privacidad:** Preparado arquitectónicamente para normativas de datos de salud y privacidad estricta (tipo HIPAA/GDPR) gracias a la total disociación entre credenciales reales y datos clínicos.
4. **Bajo Costo de Mantenimiento:** Stack altamente estandarizado (TypeScript en toda la solución) con bibliotecas permisivas de código abierto sin dependencias de licencias de pago obligatorias.

