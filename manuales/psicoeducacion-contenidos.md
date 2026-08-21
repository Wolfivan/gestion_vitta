# Guía de contenidos psicoeducativos — `contenidos_bloques`

> Cómo estructurar el JSON de cada bloque según su `tipo_componente`,
> qué espera el frontend y qué se exporta a PDF.

---

## Estructura de la tabla `contenidos_bloques`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | `SERIAL PK` | Auto incremental |
| `tema_id` | `INT FK` | Relaciona al tema padre (`temas_psicoeducacion.id`) |
| `pilar` | `VARCHAR(20)` | `CONCIENCIA` / `ACEPTACION` / `ACCION` |
| `tipo_componente` | `VARCHAR(50)` | **Determina qué JSON esperar y qué componente se renderiza** |
| `titulo_bloque` | `VARCHAR(200)` | Título visible del bloque |
| `cuerpo_json` | `JSONB` | Contenido variable del bloque |
| `orden` | `INT` | Posición dentro del tema |

---

## Tipos de componente

### 1. `TEXTO`

Solo lectura. No captura datos del usuario.

```json
{
  "parrafos": [
    "Texto del primer párrafo.",
    "Texto del segundo párrafo."
  ],
  "cita_poetica": {
    "autor": "Nombre del autor",
    "fragmento": "Texto de la cita..."
  }
}
```

| Campo | Tipo | Obligatorio |
|---|---|---|
| `parrafos` | `string[]` | Sí |
| `cita_poetica.autor` | `string` | No |
| `cita_poetica.fragmento` | `string` | No |

- **Render:** Cada párrafo como texto. Si hay `cita_poetica`, se muestra en una tarjeta con borde decorativo izquierdo.
- **Input del usuario:** No
- **Botón PDF:** No

---

### 2. `TABLA_COMPARATIVA`

Solo lectura. No captura datos del usuario.

```json
{
  "columnas": ["Estilo", "Conductas típicas", "Mensaje que recibe el otro"],
  "filas": [
    {
      "estilo": "Pasiva",
      "conductas": "Evita el conflicto...",
      "mensaje": "Lo que siento no importa."
    },
    {
      "estilo": "Agresiva",
      "conductas": "Grita, acusa...",
      "mensaje": "Estoy bajo ataque."
    }
  ]
}
```

| Campo | Tipo | Obligatorio |
|---|---|---|
| `columnas` | `string[]` | Sí |
| `filas` | `object[]` | Sí |

- Las **keys de cada fila** deben coincidir (en lowercase, sin espacios/acentos) con los valores de `columnas`.
- **Render:** Cards horizontales (70% del ancho de pantalla). La primera columna es el header de la card, el resto son campos con etiqueta.
- **Input del usuario:** No
- **Botón PDF:** No

---

### 3. `CUESTIONARIO`

Captura respuesta Likert 1-5 por cada ítem.

```json
{
  "instrucciones": "Califica del 1 al 5 cómo te sientes en cada aspecto.",
  "items": [
    {
      "id": "item_1",
      "aspecto": "COMUNICACIÓN",
      "pregunta": "¿Se sienten escuchados, comprendidos y validados?"
    },
    {
      "id": "item_2",
      "aspecto": "GESTIÓN DE CONFLICTOS",
      "pregunta": "¿Pueden resolver diferencias sin herirse?"
    }
  ]
}
```

| Campo | Tipo | Obligatorio |
|---|---|---|
| `instrucciones` | `string` | Sí (se muestra en cursiva) |
| `items[].id` | `string` | Sí (único dentro del bloque) |
| `items[].aspecto` | `string` | Sí (label en mayúsculas) |
| `items[].pregunta` | `string` | Sí |

- **Render:** Cada ítem con label `aspecto`, texto `pregunta`, fila de 5 botones (1-5). Auto-completa al responder todos.
- **Respuesta guardada:** `{ "item_1": 4, "item_2": 3 }`
- **Botón PDF:** No tiene botón propio, pero si hay respuestas se incluyen en el PDF cuando se descarga desde un `FORMULARIO`.

---

### 4. `EJERCICIO_DIDACTICO`

Captura un texto libre (borrador de práctica).

```json
{
  "metodologia": "Practica estructurar un reclamo usando esta secuencia:",
  "pasos": [
    "X: Cuando hiciste... [Describe el hecho concreto]",
    "Y: Me sentí... [Describe tu emoción]",
    "Z: Hubiera preferido que hicieras... [Propón una solución]"
  ],
  "ejemplo": "En vez de decir 'Tú siempre me interrumpes', di: 'Me siento frustrado cuando...'"
}
```

| Campo | Tipo | Obligatorio |
|---|---|---|
| `metodologia` | `string` | Sí |
| `pasos` | `string[]` | Sí |
| `ejemplo` | `string` | No |

- **Render:** Pasos colapsables (solo se ve la parte antes de `:` como preview). `ejemplo` en tarjeta ámbar. TextInput libre para el borrador.
- **Respuesta guardada:** `{ "draft": "texto escrito por el usuario" }`
- **Botón PDF:** No tiene botón propio, pero el draft aparece en el PDF si se descarga desde un `FORMULARIO`.

---

### 5. `FORMULARIO`

El más flexible. Cada ítem puede ser de un tipo distinto.

```json
{
  "instrucciones": "Completa los siguientes campos:",
  "items": [
    {
      "id": "campo_nombre",
      "label": "Nombre completo",
      "tipo": "TEXTO_LIBRE",
      "placeholder": "Escribe tu nombre...",
      "multiline": false
    },
    {
      "id": "campo_edad",
      "label": "Edad",
      "tipo": "NUMERICO",
      "min": 0,
      "max": 120
    },
    {
      "id": "campo_satisfaccion",
      "label": "Satisfacción general",
      "tipo": "LIKERT",
      "scaleLabels": {
        "1": "Muy bajo",
        "2": "Bajo",
        "3": "Regular",
        "4": "Bueno",
        "5": "Muy bueno"
      }
    },
    {
      "id": "campo_genero",
      "label": "Género",
      "tipo": "SELECCION_MULTIPLE",
      "opciones": ["Masculino", "Femenino", "No binario", "Prefiero no decirlo"]
    },
    {
      "id": "campo_fecha",
      "label": "Fecha de inicio",
      "tipo": "FECHA",
      "placeholder": "DD/MM/AAAA"
    }
  ]
}
```

#### Tipos de ítem disponibles

| `tipo` | Widget | Campos adicionales |
|---|---|---|
| `LIKERT` | 5 botones (1-5) | `scaleLabels` (opcional, tiene defaults) |
| `TEXTO_LIBRE` | `TextInput` | `placeholder`, `multiline` |
| `SELECCION_MULTIPLE` | Radio buttons | `opciones: string[]` |
| `NUMERICO` | `TextInput` numérico | `min`, `max`, `placeholder` |
| `FECHA` | `TextInput` (10 chars) | `placeholder` (default `DD/MM/AAAA`) |

- **Render:** Cada ítem en una tarjeta con su `label` y el widget correspondiente. Banner verde + botón PDF al completar todos.
- **Respuesta guardada:** `{ "campo_nombre": "Juan", "campo_edad": "30", ... }`
- **Botón PDF:** **Sí** — "Descargar respuestas en PDF"

---

### 6. `FORMULARIO_PAREJA`

Cada ítem tiene Likert dual (Persona A + Persona B) más reflexión.

```json
{
  "instrucciones": "Evalúen juntos cada aspecto de su relación.",
  "exportar_pdf": true,
  "items": [
    {
      "id": "item_1",
      "aspecto": "COMUNICACIÓN",
      "pregunta": "¿Se sienten escuchados, comprometidos y validados?"
    },
    {
      "id": "item_2",
      "aspecto": "VIDA SEXUAL",
      "pregunta": "¿Existe satisfacción, apertura al diálogo y respeto?"
    }
  ]
}
```

| Campo | Tipo | Obligatorio |
|---|---|---|
| `instrucciones` | `string` | Sí |
| `exportar_pdf` | `boolean` | No — si es `true` muestra botón PDF al completar |
| `items[].id` | `string` | Sí |
| `items[].aspecto` | `string` | Sí |
| `items[].pregunta` | `string` | Sí |

- **Render:** Cada ítem: `aspecto` + `pregunta`, Likert "Tu evaluación" (personaA), Likert "Evaluación de tu pareja" (personaB), TextInput "Reflexión conjunta".
- **Respuesta guardada por ítem:**
  ```json
  {
    "personaA": 4,
    "personaB": 3,
    "reflexion": "Debemos mejorar la comunicación..."
  }
  ```
- **Botón PDF:** **Sí** — con renderizado especial que muestra personaA/5, personaB/5 y reflexión en tarjetas estructuradas.

---

## PDF — ¿qué se exporta y desde dónde?

El PDF se genera con todos los bloques completados del tema, no solo el que tiene el botón.

### Disparadores del PDF

| Componente | Botón PDF |
|---|---|
| `content-block-form.tsx` (`FORMULARIO`) | **Sí** — al completar todos los campos |
| `content-block-couples-form.tsx` (`FORMULARIO_PAREJA`) | **Sí** — al completar todos los campos |
| `content-block-questionnaire.tsx` (`CUESTIONARIO`) | No tiene botón propio |
| `content-block-exercise.tsx` (`EJERCICIO_DIDACTICO`) | No tiene botón propio |
| `content-block-text.tsx` (`TEXTO`) | No |
| `content-block-table.tsx` (`TABLA_COMPARATIVA`) | No |

### Contenido del PDF por tipo de bloque

| Tipo | ¿Aparece en el PDF? | Qué muestra |
|---|---|---|
| `TEXTO` | No (no hay datos de usuario) | — |
| `TABLA_COMPARATIVA` | No (no hay datos de usuario) | — |
| `CUESTIONARIO` | **Sí** — si hay respuestas guardadas | `aspecto` / `pregunta` + Likert |
| `EJERCICIO_DIDACTICO` | **Sí** — si hay draft guardado | El texto del draft |
| `FORMULARIO` | **Sí** | `label` + valor de cada ítem |
| `FORMULARIO_PAREJA` | **Sí** (render especial) | personaA/5, personaB/5, reflexión |

> **Nota:** Para que `CUESTIONARIO` y `EJERCICIO_DIDACTICO` tengan su propio botón de descarga de PDF, hay que agregar las props `onDownloadPdf` e `isGeneratingPdf` a esos componentes, igual que ya tienen `FORMULARIO` y `FORMULARIO_PAREJA`. El motor de PDF (`pdf-service.ts`) ya procesa correctamente esos tipos de bloque, solo falta el botón en la UI.

---

## Resumen visual

| `tipo_componente` | Campos clave en `cuerpo_json` | Input del usuario | Botón PDF |
|---|---|---|---|
| `TEXTO` | `parrafos[]`, `cita_poetica{}` | — | — |
| `TABLA_COMPARATIVA` | `columnas[]`, `filas[]` | — | — |
| `CUESTIONARIO` | `items[].{id,aspecto,pregunta}` | Likert 1-5 | No |
| `EJERCICIO_DIDACTICO` | `pasos[]`, `ejemplo` | Texto libre | No |
| `FORMULARIO` | `items[].{id,label,tipo,...}` | Múltiple | **Sí** |
| `FORMULARIO_PAREJA` | `items[].{id,aspecto,pregunta}`, `exportar_pdf` | Likert dual + texto | **Sí** (solo si `exportar_pdf: true`) |
