# Sistema de Salud Mental y Bienestar Emocional

Este repositorio contiene el código fuente y la arquitectura de una aplicación móvil de salud mental y productividad emocional orientada al rigor clínico, la privacidad estricta y la baja fricción. El proyecto está cofundado por un Ingeniero de Software (Arquitectura/Desarrollo) y un Psicólogo Profesional (Validación Clínica/Contenido).

El desarrollo está guiado por **Agentes Autónomos** utilizando el framework de desarrollo de agentes (**Hardness**). Este documento sirve como el contexto maestro para que cualquier agente comprenda la filosofía, reglas de negocio, arquitectura técnica y prioridades actuales del sistema.

---

## 1. Contexto General y Filosofía de Diseño

- **Objetivo:** Combinar el rigor clínico con una experiencia de usuario fluida, aportando claridad, soporte en momentos de crisis y herramientas prácticas para el bienestar diario.
- **Filosofía de UI/UX:** Enfoque minimalista, intuitivo, limpio y agradable. No se deben sobrecargar las interfaces con elementos innecesarios. La navegación debe ser predecible y transmitir tranquilidad.

---

## 2. Pila Tecnológica (Tech Stack)

Para garantizar la portabilidad y agilidad en el MVP, se ha seleccionado la siguiente infraestructura:

- **Frontend Móvil:** Expo (React Native) con TypeScript.
  - Multiplataforma (Android e iOS).
  - Uso de módulos nativos de Expo para autenticación biométrica (`expo-local-authentication`) y sesiones de autenticación externas.
- **Backend:** Node.js (API RESTful) alojado en un entorno VPS controlado (Hostinger).
- **Base de Datos:** Relacional (PostgreSQL / MySQL) con una separación estricta de dominios de datos.
- **IA/Procesamiento:** Integración con LLMs (vía API de OpenAI u homólogos) para tareas cognitivas específicas supervisadas por lógica clínica.

---

## 3. Directrices Críticas para los Agentes (Reglas de Oro)

Al generar código, bases de datos o lógica de negocio, todo agente debe cumplir obligatoriamente con los siguientes lineamientos:

### A. Seguridad-First y Privacidad Estricta (Patrón de Anonimato)
Los datos de salud mental son extremadamente sensibles. Queda estrictamente prohibido vincular directamente la identidad real del usuario (nombre, correo de Google, teléfono) con sus registros clínicos, notas de diario, estados de ánimo o herramientas de pareja.
- **Arquitectura de Base de Datos:** Se debe implementar un diseño atómico. La tabla de `Autenticación/Usuarios` solo debe asociar las credenciales a un identificador único aleatorio (ej. `UUIDv4`) denominado `id_anonimo`.
- **Relaciones:** Todas las demás tablas del sistema (diarios, respuestas a tests, registros de pareja) deben apuntar única y exclusivamente al `id_anonimo`.

### B. Estructura Modular Dinámica
El contenido clínico (cuestionarios, artículos de psicoeducación, sugerencias, copys de la app) no debe estar hardcodeado en el frontend.
- Todo el contenido debe ser servido de manera dinámica desde el backend mediante estructuras JSON mapeadas de forma limpia. Esto permite al psicólogo cofundador actualizar o expandir el material clínico mediante endpoints administrativos sin alterar el código core de la app.

### C. Descargo de Responsabilidad (Disclaimer Legal)
Toda pantalla crítica o flujo de registro debe incluir de manera clara un aviso legal (Disclaimer) que especifique que la aplicación es una herramienta de apoyo y acompañamiento, y que **bajo ninguna circunstancia reemplaza un diagnóstico, terapia o tratamiento clínico formal**.

---

## 4. Plan de Ejecución e Hitos

El proyecto se está construyendo de forma incremental y modular. La hoja de ruta de desarrollo, que contiene el desglose detallado de los primeros 4 hitos prioritarios (fase MVP), se encuentra completamente documentada en el siguiente archivo:

👉 **[Consultar la Hoja de Ruta de Desarrollo en FASES.md](fases.md)**

Los agentes encargados de escribir código o diseñar componentes deben validar sus tareas actuales contra los requerimientos específicos listados en dicho archivo.

---

## 5. Instrucciones de Uso para Agentes

1. **Lectura de Contexto:** Antes de iniciar cualquier tarea de código, lee este `README.md` y asimila los pilares de Privacidad y Modularidad Dinámica.
2. **Revisión de Fase:** Consulta `fases.md` para identificar qué hito se está ejecutando y cuáles son sus criterios de aceptación.
3. **Validación:** Al finalizar una tarea, verifica que el código generado no exponga datos personales y que cumpla con el tipado estricto en TypeScript (Frontend) y las mejores prácticas de seguridad en Node.js (Backend).  