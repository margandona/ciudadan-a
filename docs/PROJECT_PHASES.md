# Plan por fases — Providencia Ciudadanía Lab

Cada fase indica: objetivo · historias · tareas · archivos principales · dependencias · pruebas · riesgos · criterios de aceptación · DoD.

> **Regla de avance:** no se avanza a la siguiente fase si existen errores bloqueantes sin resolver.

## FASE 0 — Discovery y arquitectura ✅ (en curso)

- **Objetivo:** documentar requisitos, arquitectura, modelo de datos, seguridad, backlog y plan. Cerrar inconsistencias con el usuario.
- **Historias:** COMO equipo QUIERO tener el plan aprobado PARA construir con foco.
- **Tareas:** este documento + `docs/*` + decisión pnpm/workspaces + confirmación de listas reales (`3ro/*.xlsx`) y proyectos Firebase.
- **Entregables:** `README.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY.md`, `docs/FIRESTORE_RULES.md`, `docs/PRODUCT_DESIGN.md`, `docs/DUA_GUIDELINES.md`, `docs/TEST_STRATEGY.md`, `docs/MANUAL_TEST_PLAN.md`, `docs/DEPLOYMENT.md`, `docs/PROJECT_PHASES.md`, `docs/BACKLOG.md`, `docs/RISKS.md`, `docs/CHANGELOG.md`.
- **Pruebas:** — (revisión humana del plan).
- **Riesgos:** malentendidos de alcance; decisiones pendientes del usuario.
- **Criterio de aceptación:** plan aprobado por el usuario (28 entregables) antes de FASE 1.

## FASE 1 — Base técnica: Vue + Firebase + Clean Architecture + Auth + RBAC ✅ (implementada)

- **Objetivo:** monorepo con capas, PWA base instalable, login, claims, guardas de roles, emuladores, lint/typecheck/test funcionando.
- **Historias:**
  - COMO usuario QUIERO iniciar sesión según mi rol PARA acceder a mi portal.
  - COMO MASTER/ADMIN QUIERO crear usuarios y asignar roles PARA gestionar accesos.
- **Tareas:** scaffold monorepo (pnpm workspaces); paquetes `domain/application/infrastructure/shared`; Vue 3 + TS + Vite + Pinia + Router; Auth + claims en Functions; guardas de ruta por rol; design system base; `.env*`; Emulator Suite (puertos dedicados 8088/9098/5002); scripts lint/typecheck/test/build.
- **Estado (implementado):** lint ✅ · typecheck ✅ · build web/functions ✅ · login + claims + guardas ✅ · reglas Firestore R1–R18 ✅ (12 tests) · emulador corriendo con nóminas reales importadas.
- **Criterio de aceptación:** cumplido (login por rol en emulador; suite verde).

## FASE 2 — Cursos, usuarios y estudiantes ✅ (implementada)

- **Objetivo:** cursos, membresías, importación de nóminas con protección de datos PIE; perfiles.
- **Historias:** COMO ADMIN QUIERO importar estudiantes desde CSV/JSON PARA cargar el curso sin errores. COMO PROFESOR QUIERO ver la lista de mi curso y perfil individual PARA dar seguimiento.
- **Tareas:** modelos `courses`/`students` (+`protected`); parser XLSX (SheetJS) + mapeador de columnas + normalización + deduplicación; use-cases preview/import (Clean Architecture); pantalla `/teacher/students/import` (preview editable); dashboard de curso; perfil de estudiante; soft delete; auditoría; **importación de las nóminas reales al emulador** (Curso D: 41, Curso E: 34).
- **Estado (implementado):** importador ✅ · preview UI ✅ · dashboards + perfil ✅ · soft delete + auditoría ✅ · aislamiento entre cursos ✅ · `3ro/` en `.gitignore` ✅.
- **Criterio de aceptación:** cumplido (nóminas reales importadas al emulador con 0 duplicados; aislamiento verificado).

## FASE 3 — Motor de clases + aula invertida ✅ (implementada)

- **Objetivo:** catálogo de 12 misiones, disponibilidad por curso, aula invertida completa con progreso y seed de contenido base.
- **Historias:** COMO PROFESOR QUIERO habilitar/programar clases PARA controlar la secuencia. COMO ESTUDIANTE QUIERO completar el aula invertida de cada misión PARA llegar lista a la clase.
- **Tareas:** `classes` (catálogo global), `classSchedules/{courseId}/schedules/{classId}` (estados DRAFT→ARCHIVED + ventana + flipped/activity/submission/feedback), `flippedLesson/{classId}`, `flippedProgress/{classId}/records/{studentId}`; reproductor por bloques con botón «Estoy lista para la misión»; seeds `content/classes.json` + `content/missions/01–12/flipped.json` (12 misiones, aula invertida de 10–15 min).
- **Estado (implementado):** catálogo 12 ✅ · programación por profesor (callable + auditoría) ✅ · reproductor flipped con progreso/quiz/reflexión ✅ · seeds ✅ · reglas R13/R14 ✅ · integración flipped ✅.
- **Criterio de aceptación:** cumplido (12 misiones sembradas; aula invertida registra progreso y quiz; overview del profesor).

## FASE 4 — Actividades, quizzes y evidencias ✅ (implementada)

- **Objetivo:** motor de quizzes propio (tipos/configuración), actividades, evidencias con estados y adjuntos, feedback docente.
- **Historias:** COMO ESTUDIANTE QUIERO responder quizzes y subir mi evidencia PARA demostrar aprendizaje. COMO PROFESOR QUIERO revisar y retroalimentar PARA apoyar.
- **Tareas:** `quizzes`/`questions` (servidas sin respuestas a estudiantes, **corrección server-side**), `quizAttempts`; `activities`; `submissions` con estados y adjuntos validados; comentarios del profesor; ticket de salida; reglas R3/R4/R5/R15/R16.
- **Estado (implementado):** motor de quizzes con 9 tipos de pregunta ✅ · corrección y límite de intentos en Functions ✅ · evidencias con estados y retroalimentación ✅ · ticket de salida ✅ · revisión del profesor con auditoría ✅ · seeds `content/quizzes.json` + `content/activities.json` ✅.
- **Criterio de aceptación:** cumplido (quiz individual con retroalimentación; evidencia con estados; flujo E2E quiz+evidencia+ticket en tests de integración).

## FASE 5 — Dashboard profesor + participación ✅ (implementada)

- **Objetivo:** dashboards (curso/clase), registro de participación, alertas pedagógicas simples, calendario administrativo.
- **Historias:** COMO PROFESOR QUIERO un resumen del curso y por clase PARA tomar decisiones. COMO PROFESOR QUIERO registrar participación en clase sin fricción PARA evaluar formativamente.
- **Tareas:** `participation` (escala 0–3, registro en lote, resumen por habilidad); dashboards de curso/clase con agregados; calendario verde/amarillo/rojo (−3 días impresión, −7 días evaluador).
- **Estado (implementado):** registro en vivo (`/teacher/live/:classId`, acciones rápidas 1–2 clics) ✅ · overview por habilidad ✅ · dashboards curso/clase (sin rankings) ✅ · calendario administrativo ✅ · `content/materials.json` ✅.
- **Criterio de aceptación:** cumplido (registro a múltiples estudiantes en < 30 s; dashboards sin rankings; alertas de plazo).

## FASE 6 — Modo proyección interactiva ✅ (implementada)

- **Objetivo:** `/projection/:classId`, DeckPlayer, slide builder, token de proyección.
- **Historias:** COMO PROFESOR QUIERO proyectar una presentación interactiva PARA guiar la clase. COMO PROFESOR QUIERO editar diapositivas con bloques PARA adaptar el material.
- **Tareas:** `presentations` (deck por bloques, sanitizado y con estructura pedagógica validada), `DeckPlayer` (teclado, fullscreen, temporizador, revelar, votación digital y conteo manual), token de proyección de corta duración, editor de diapositivas del profesor.
- **Estado (implementado):** deck de 12 clases sembrado (class-01 completo + defaults) ✅ · reproducción fullscreen con teclado ✅ · votación agregada (digital + manual sin dispositivos) ✅ · token 2 h ✅ · editor (sanitización + estructura obligatoria) ✅ · reglas para votes/tokens ✅.
- **Criterio de aceptación:** cumplido (deck con estructura obligatoria; interacciones colectivas agregadas sin identidad; edición sin HTML arbitrario).

## FASE 7 — Evaluador + materiales + DUA ✅ (implementada)

- **Objetivo:** portal evaluador, materiales (general + DUA) con flujo de revisión, calendario administrativo.
- **Historias:** COMO EVALUADOR QUIERO revisar y aprobar material asignado PARA asegurar calidad. COMO PROFESOR QUIERO enviar material a revisión y ver observaciones PARA iterar.
- **Tareas:** `materials`/`versions` (GENERAL|DUA), `reviewComments`, `reviewRequests`; máquina de estados (BORRADOR→…→APROBADO/CORREGIR); fechas de envío/revisión; historial de versiones; portal evaluador aislado.
- **Estado (implementado):** creación de materiales + versiones GENERAL/DUA (PDF/DOCX, tamaño 50 MB) ✅ · envío a revisión con resolución de evaluador por email ✅ · revisión con comentario y decisión (aprobar/observaciones/rechazar/corregir) ✅ · historial de versiones y observaciones ✅ · portal evaluador sin datos de estudiantes ✅ · calendario ya usa plazos de impresión/revisión ✅.
- **Criterio de aceptación:** cumplido (flujo E2E envío→revisión→aprobación en tests de integración).

## FASE 8 — Gamificación ✅ (implementada)

- **Objetivo:** medallas, progreso, colecciones, desbloqueos (sin tocar notas, sin rankings).
- **Historias:** COMO ESTUDIANTE QUIERO ver mi progreso e insignias PARA mantener la motivación. COMO PROFESOR QUIERO otorgar medallas manualmente PARA reconocer logros.
- **Tareas:** `badges`/`studentBadges`; criterios automáticos; galería/colección; mensajes positivos e hitos; desbloqueo de material; reglas R6.
- **Estado (implementado):** catálogo de 10 medallas (Observatorio Ciudadano) con criterios configurables ✅ · otorgamiento automático (`evaluateBadges`, idempotente) y manual (`awardBadge` con auditoría) ✅ · galería de medallas en el home del estudiante y otorgamiento en el perfil (docente) ✅ · mensajes positivos por contexto (`content/messages.json`) ✅ · sin rankings ni impacto en la nota ✅.
- **Criterio de aceptación:** cumplido (medallas otorgadas y visibles; sin impacto en nota; sin rankings).

## FASE 9 — Feedback + analítica pedagógica ✅ (implementada)

- **Objetivo:** feedback en clases 1/4/7/10 (dos dimensiones, anónimo configurable, tendencias agregadas) y analítica con alertas simples.
- **Historias:** COMO ESTUDIANTE QUIERO dar feedback privado PARA mejorar mi experiencia. COMO PROFESOR QUIERO ver tendencias agregadas PARA ajustar.
- **Tareas:** `feedback` (anon flag, agregación sin metadatos), tendencias de tickets de salida y analítica: % aula invertida, conceptos con error, preguntas de bajo rendimiento, evidencias pendientes, dificultad percibida; alertas simples.
- **Estado (implementado):** formulario de feedback de 2 dimensiones con anonimato ✅ · tendencias por clase (sin identificar anónimos) ✅ · analítica descriptiva con alertas (evidencias pendientes, dificultad alta, preguntas de menor rendimiento) ✅ · sin diagnósticos ni etiquetas ✅.
- **Criterio de aceptación:** cumplido (feedback recolectado en las 4 clases; tendencias sin identificar anónimos; alertas descriptivas).

## FASE 10 — Proyecto Ovalle 2035 + ABP/ApS ✅ (implementada)

- **Objetivo:** proyecto colaborativo (Misión 11) y Feria Ciudadana (Misión 12) con rúbricas, equipos y evaluación auténtica.
- **Historias:** COMO ESTUDIANTE QUIERO desarrollar el proyecto Ovalle 2035 con mi equipo PARA presentarlo en la feria. COMO PROFESOR QUIERO evaluar con rúbrica, autoevaluación y coevaluación.
- **Tareas:** `projects`/`projectTeams`; wizard de los 11 campos; rúbricas; feria; evaluación auténtica.
- **Estado (implementado):** equipos (crear/asignar/aleatorios, sin mezclar cursos) ✅ · proyecto de 11 campos (guardar/entregar) ✅ · evaluación con rúbrica del docente (+ autoevaluación/coevaluación soportadas) ✅ · vista de feria ✅ · rúbricas Cabildo/Proyecto/Feria en contenido ✅.
- **Criterio de aceptación:** cumplido (flujo equipo → proyecto → evaluación en tests de integración).

## FASE 11 — PWA / offline ✅ (implementada)

- **Objetivo:** PWA instalable, caché de shell y aula invertida, cola de sincronización con estados visibles, sin pérdida de respuestas.
- **Historias:** COMO ESTUDIANTE QUIERO trabajar sin conexión PARA no perder mi trabajo.
- **Tareas:** service worker (workbox) para shell; persistencia local de Firestore (IndexedDB) para lectura offline del contenido descargado; cola de sincronización (`IndexedDB`) con estados SINCRONIZADO/PENDIENTE/ERROR y reintento idempotente.
- **Estado (implementado):** `vite-plugin-pwa` (manifest + sw + workbox) ✅ · `persistentLocalCache` de Firestore ✅ · cola offline para quiz/evidencia/ticket/feedback (replay al reconectar) ✅ · banner de estado de sincronización ✅ · tests de la cola y del banner ✅.
- **Criterio de aceptación:** cumplido (respuestas offline sin pérdida; sincroniza al reconectar; estados visibles).

## FASE 12 — Seguridad y hardening ✅ (implementada)

- **Objetivo:** reglas finales, App Check, rate limiting, auditoría completa, revisión OWASP, almacenamiento seguro.
- **Tareas:** auditoría completa (`auditLogs` en Functions), App Check en producción, rate limiting (import, envíos, tokens, auditoría), MIME/tamaño, sanitización, revisión de secrets.
- **Estado (implementado):** rate limiting server-side en callables sensibles (import 10/min, votos/registro/materiales/proyectos con límites) ✅ · auditoría ampliada (materiales, equipos, grupos, participación) ✅ · App Check SDK habilitado por entorno (`VITE_RECAPTCHA_SITE_KEY`) ✅ · límites de longitud en evidencias/comentarios ✅ · reglas R1–R18 con suite verde ✅ · sin secretos en el repo ✅.
- **Criterio de aceptación:** cumplido (reglas R1–R18 verdes; App Check preparado; sin secretos).

## FASE 13 — Testing automatizado (completo) ✅ (cobertura + E2E implementados)

- **Objetivo:** cubrir unit/component/integración/rules/E2E/a11y con metas de cobertura.
- **Estado:** **cobertura** con umbrales (statements/functions/lines ≥85%, branches ≥80%) ✅ — reporte actual **93.43% / 80.87% / 91.35% / 93.43%**. **Playwright E2E** con 8 flujos + accesibilidad (axe) ✅ (harness verificado localmente; login y a11y verdes; estabilización completa vía CI/`pnpm test:e2e` con stack dedicado). **CI** con jobs de calidad, reglas/integración y E2E.
- **Criterio de aceptación:** cobertura ≥ objetivo ✅ · E2E 8 flujos + a11y wiring ✅ (full-green pendiente de entorno estable, ver nota FASE 14).

## FASE 14 — Testing manual

- **Objetivo:** ejecutar `docs/MANUAL_TEST_PLAN.md` en staging con el profesor/evaluador.
- **Criterio de aceptación:** checklist completo; bugs conocidos documentados en backlog.

## FASE 15 — Optimización, accesibilidad y performance

- **Objetivo:** LCP/INP, bundle, accesibilidad WCAG 2.2 AA, responsive y proyección fluida.
- **Pruebas:** Lighthouse (performance, a11y, PWA), axe, Playwright perf en móvil.
- **Criterio de aceptación:** LCP < 2.5 s, INP < 200 ms; a11y AA.

## FASE 16 — CI/CD y despliegue

- **Objetivo:** pipelines completos, deploy por entorno, seeds controlados, documentación final.
- **Tareas:** workflows finales (PR → develop/staging → main/prod), despliegue de rules/índices, changelog, runbooks.
- **Criterio de aceptación:** deploy automático verde; producción con App Check; `CHANGELOG.md` actualizado.

---

## Definition of Done (transversal)

Una feature se considera terminada solo cuando:

1. Funciona según el criterio de aceptación de su historia.
2. Está tipada (TypeScript estricto, sin `any` innecesario).
3. No tiene errores de lint.
4. Tiene validación de entrada y control de errores.
5. Respeta seguridad (reglas/backend verifican la acción, no solo la UI).
6. Es responsive y cumple accesibilidad razonable (WCAG AA básico).
7. Tiene tests (unit/component y reglas según aplique).
8. Documentación actualizada.
9. No rompe funcionalidades existentes (regresión chequeada).
