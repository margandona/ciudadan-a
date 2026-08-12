# Changelog

Formato: [SemVer](https://semver.org/) + categorías `Added / Changed / Fixed / Security`.

## [0.16.1] — Contenido editorial de las 12 misiones

### Added
- **10 quizzes nuevos** (class-02 a class-12) en `content/quizzes.json` — 42 preguntas en total (choice/truefalse/short) alineadas a cada misión: tradiciones de ciudadanía, participación, territorio, expediente, cabildo, presupuesto, desigualdad/datos, agua Limarí, proyecto Ovalle 2035 y feria.
- **9 actividades nuevas** (class-02, 04, 05, 07–12) en `content/activities.json` — 12 en total (reflexión, mapas de actores, expediente, debate de actores, presupuesto comunal, laboratorio de datos, agenda del agua, propuesta, bitácora de la feria).
- Verificado end-to-end: quiz de class-02 **Resultado 4/4** como estudiante en el emulador; re-seed de `content/` en el namespace `ciudadania-lab`.

## [0.16.0] — FASE 16 (CI/CD y despliegue)

### Added
- **Hosting de Firebase** en `firebase.json` (SPA rewrite, cache headers inmutable para assets, `sw.js` no-cache).
- **Workflows**: `ci.yml` reutilizable (`workflow_call`), `preview.yml` (PR → Hosting channel `pr<N>` 7 días + comentario de URL) y `deploy.yml` (push a `main` → build de producción + deploy de hosting/rules/indexes/storage/functions).
- Runbook completo en `docs/DEPLOYMENT.md` (entornos, secretos, App Check, despliegue manual).

### Changed
- README y `docs/PROJECT_PHASES.md`: FASE 16 como fase final completada (deploy end-to-end pendiente de secrets del propietario).

## [0.15.0] — FASE 15 (Optimización, accesibilidad y performance)

### Changed
- **Accesibilidad WCAG 2.2 AA**: axe 0 violaciones en 11 rutas. Contraste de badges (`success`/`warning` ≥ 4.5:1), `aria-label` en selects de materiales, orden de encabezados (BaseCard → `h2`, preguntas de quiz → `h2`), landmark de `DeckPlayer` (main → div), medallas bloqueadas sin `opacity` (color muted AA).
- **Performance**: code-splitting de Firebase — `app+auth` en el bundle inicial, `firestore+functions` lazy (`lib/firebaseApp.ts`); `manualChunks` para vendor (vue/router/pinia). Bundle inicial 680→294 kB min.
- **PWA**: iconos PNG 192×192 y 512×512 + maskable en el manifest (instalabilidad).
- **Responsive**: header nav con wrap, tablas con scroll horizontal contenido (`position: relative` en `.table-wrap`), filtros con wrap. 0 desbordes en 18 rutas a 360/640 px.
- Flags de build: `VITE_FORCE_EMULATORS=true` para medir/ejecutar un build contra el Emulator Suite local.

### Fixed
- Desbordes horizontales en móvil (Clases, Dashboard de curso, Submissions, Quiz Results, Flipped Overview, Import, Projects).
- `registerOfflineHandlers` pasa a import dinámico (no arrastra las Cloud Functions al bundle inicial).

### Resultados
- Lighthouse (login, móvil throttled): Performance 83→**89**, Accessibility **100**, Best Practices 96, SEO 91; LCP 3.6→**3.1 s**, FCP 3.4→**2.9 s**, TBT 0 ms, CLS 0.
- Informe: `docs/INFORME_PERFORMANCE_ACCESIBILIDAD_F15.md`.

## [0.14.1] — FASE 14 (Testing manual ejecutado)

### Fixed
- **Reglas Firestore** (`firestore.rules`): lectura de `courses` por `resource.data.courseId` (el wildcard de ruta lanzaba «Null value error. for 'list'» en listados) y accesos con default en `submissions.studentId` / `materials.evaluatorId` («Property … is undefined» en listados).
- **Consulta de cursos** (`WebCourseRepository.findBySectionYear`): filtra por `courseId in [cursos del usuario]` (regla «rules are not filters»); `courses` ahora persiste el campo `courseId`.
- **Vista de actividades de la estudiante**: usa `findByStudentAndClass` (filtro por `studentId`) en lugar de `listByClass`, consistente con la rama ESTUDIANTE de las reglas.
- **Cola offline** (`offlineQueue.enqueue`): JSON-clone del payload — los proxies reactivos de Vue no eran clonables en IndexedDB («could not be cloned») y las respuestas offline nunca se sincronizaban.

### Changed
- Docs: `docs/INFORME_PRUEBAS_MANUALES_F14.md` (resultados por ronda), registro de bugs en `docs/BACKLOG.md` (B6–B8), estado de FASE 14 en `docs/PROJECT_PHASES.md`, `docs/MANUAL_TEST_PLAN.md` y `README.md`.

## [0.14.0] — FASE 14 (Testing manual)

### Added
- **Runbook de pruebas manuales** (`docs/MANUAL_TEST_RUNBOOK.md`): sesión guiada de ~30 min para el/la docente con credenciales demo, pasos A (profesor), B (estudiante) y C (evaluador), y checkboxes de cierre.
- **Registro de bugs conocidos** en `docs/BACKLOG.md` (hallazgos de E2E y FASE 14; se mantiene vivo durante la ejecución manual).
- Hoja de seguimiento en `docs/MANUAL_TEST_PLAN.md` (estado de ejecución, total de 82 casos, bugs reportados).
- **Guía paso a paso** (`docs/GUIA_PASO_A_PASO.md`): levantar emuladores, sembrar datos, verificación automática y reporte de resultados.

### Changed
- `docs/TEST_STRATEGY.md` y `README.md`: la FASE 14 queda como hito en ejecución (depende de la sesión manual del docente).

## [0.13.0] — FASE 13 (Testing automatizado completo)

### Added
- **Cobertura** (`@vitest/coverage-v8`) con umbrales (≥85% statements/functions/lines, ≥80% branches). Reporte actual: **93.43% / 80.87% / 91.35% / 93.43%** (domain+application).
- **Playwright E2E**: configuración + **8 flujos** (estudiante, profesor, materiales+evaluador, proyección, gamificación, feedback, offline) + **accesibilidad con axe** (login y home de estudiante sin errores críticos). Script `test:e2e`.
- **CI**: jobs de calidad (incluye cobertura), reglas/integración (emulador) y **E2E** (emuladores + seeds + Playwright, con artefactos de reporte).
- Redirección por rol tras login (estudiante → `/student`, evaluador → `/evaluator`).

## [0.12.0] — FASE 12 (Seguridad y hardening)

### Security
- **Rate limiting server-side** (ventana deslizante por usuario+acción) en callables sensibles: importación (10/min), preview (30), envío/revisión de materiales (30), tokens de proyección (30), medallas (30), evaluación de proyectos (30), revisión de evidencias (60), registro de participación (120).
- **Auditoría ampliada**: `MATERIAL_CREATED`, `TEAM_CREATED`, `TEAM_GROUPS_CREATED`, `PARTICIPATION_REGISTERED` (además de las existentes).
- **App Check**: SDK inicializado cuando existe `VITE_RECAPTCHA_SITE_KEY` (producción/staging); documentado para activarlo en la consola.
- **Límites de entrada**: texto de evidencia (4000) y nombres de adjuntos (200); comentarios de revisión (4000).
- **Reglas Firestore** R1–R18 (incluye R17/R18: `auditLogs` solo servidor; estudiantes no escriben `projects`/`projectTeams`) con suite verde.
- Sin secretos en el repositorio (solo `.env.example`); `3ro/*` ignorado.

## [0.11.0] — FASE 11 (PWA / offline)

### Added
- **PWA instalable** (`vite-plugin-pwa`): manifest en español, service worker con workbox y caché del shell + red (`NetworkFirst`).
- **Persistencia local de Firestore** (`persistentLocalCache`): lectura offline del contenido ya cargado (aula invertida, clases).
- **Cola de sincronización offline** en IndexedDB: quiz, evidencia, ticket de salida y feedback se encolan si no hay conexión y se reproducen al reconectar (handlers idempotentes).
- **Banner de estado**: `SINCRONIZADO` / `PENDIENTE DE SINCRONIZAR` / `ERROR DE SINCRONIZACIÓN` / `SIN CONEXIÓN`, con reintento.
- Vistas de estudiante muestran estado pendiente cuando la acción quedó en cola.

## [0.10.0] — FASE 10 (Proyecto Ovalle 2035 + ABP/ApS)

### Added
- **Equipos de trabajo** (ABP/ABJ/ApS): crear, asignar/quitar integrantes y **grupos aleatorios** (nunca mezclan cursos; sin repetir asignadas).
- **Proyecto Ovalle 2035 (Misión 11)** con wizard de los **11 campos**; guardar y entregar (`saveProject`); una entrega por equipo.
- **Evaluación auténtica** con rúbrica: docente (`assessProject`, con auditoría y estado REVISADO) y autoevaluación/coevaluación soportadas (`saveSelfPeerAssessment`).
- **Feria Ciudadana (Misión 12)**: vista de proyectos presentados.
- **Rúbricas** en contenido (`content/rubrics.json`): Cabildo «Nuestro territorio necesita…», Proyecto y Feria.
- Vistas: `ProjectWizard` (estudiante), `TeamsView`, `ProjectsReviewView` y `FairView` (docente).
- Reglas Firestore para `projectTeams`, `projects` y evaluaciones.

## [0.9.0] — FASE 9 (Feedback + analítica pedagógica)

### Added
- **Feedback de estudiante** (clases 1, 4, 7 y 10) con dos dimensiones (experiencia de la aplicación y experiencia de aprendizaje/docencia), escalas 1–5 y comentarios abiertos; **privado** y **anónimo configurable** (`submitFeedback`).
- **Tendencias agregadas** para el profesor (`getFeedbackTendencies`): promedios por clase y comentarios abiertos; los números nunca exponen identidad y los comentarios respetan el flag `anon`.
- **Analítica pedagógica descriptiva** (`getCourseAnalytics`): % aula invertida, evidencias pendientes, tickets y dificultad percibida, participación y **preguntas con menor rendimiento** (por intentos de quiz).
- **Alertas simples** (evidencias pendientes, dificultad alta, preguntas con bajo acierto) **sin etiquetas ni diagnósticos**.
- Vistas: formulario de feedback (estudiante), tendencias (`/teacher/feedback`) y analítica (`/teacher/analytics`).

## [0.8.0] — FASE 8 (Gamificación)

### Added
- **Medallas del Observatorio Ciudadano** (10) con criterios configurables (flipped completado, quizzes aprobados, evidencias, participación por habilidad, tickets). `content/badges.json`.
- **Otorgamiento automático** (`evaluateBadges`, idempotente) y **manual** (`awardBadge` del docente, con auditoría). Sin rankings ni impacto en la nota.
- **Galería de medallas** en el home del estudiante (colección + estado) y otorgamiento en el perfil desde el rol docente.
- **Mensajes positivos** por contexto (quiz, flipped, participación por habilidad, evidencias) en `content/messages.json`; callable `getPositiveMessage`.
- Estadísticas de actividad de la estudiante (`ActivityStatsRepository`) para evaluar criterios.
- Seed: 10 medallas + 8 mensajes.

## [0.7.0] — FASE 7 (Evaluador + materiales + DUA)

### Added
- **Materiales** con máquina de estados (BORRADOR → EN_REVISION → CON_OBSERVACIONES/APROBADO/RECHAZADO/CORREGIR_Y_REENVIAR) y **versiones GENERAL y DUA** (PDF/DOCX, hasta 50 MB).
- **Envío a revisión** (`sendMaterialForReview`): resuelve al evaluador por email, fija `sentAt` y crea la solicitud (con auditoría).
- **Portal del evaluador** (`/evaluator`, aislado de estudiantes): material asignado, versiones, historial de comentarios y decisión con comentario obligatorio (`reviewMaterial`).
- Detalle con historial de versiones y observaciones (`getMaterialDetail`).
- Reglas Firestore para `reviewRequests`; seed `seed:demo-evaluator` (evaluador@demo.cl).

## [0.6.0] — FASE 6 (Modo proyección interactiva)

### Added
- **`/projection/:classId`**: presentación HTML interactiva (DeckPlayer) con pantalla completa, navegación por teclado (←/→/espacio/F/H), temporizador, revelar respuestas y estructura pedagógica obligatoria (portada → aprendizaje → objetivo → ruta → activación → … → ticket de salida).
- **Interacciones colectivas**: votación digital (estudiantes desde la PWA, resultados agregados sin identidad) y **modo sin dispositivos** (el profesor registra conteos manuales). Callables `submitVote`, `recordManualVotes`, `getVotes`.
- **Token de proyección** de 2 h (`createProjectionToken`) para abrir la proyección sin cuentas.
- **Editor de presentaciones** del profesor: bloques por diapositiva, preguntas con opciones y respuesta correcta, sanitización server-side y validación de estructura (`savePresentation`).
- Seeds: deck completo de `class-01` en `content/presentations.json` + decks por defecto para las 12 clases.
- Reglas Firestore para `projectionTokens` y `projections/*/votes`.

### Changed
- `build:functions` ahora **empaqueta con esbuild (CJS)** en `functions/dist/index.js` (el emulador no puede ejecutar el TS de los paquetes con imports sin extensión). Esto arregla el arranque del emulador de Functions.

## [0.5.0] — FASE 5 (Dashboard profesor + participación)

### Added
- **Registro de participación en vivo** (`/teacher/live/:classId`): tarjetas de estudiantes con multi-selección, acciones rápidas (+ Participó/Argumentó/Colaboró/Evidencia/Pregunta/Liderazgo), escala 0–3 y observación breve. Callable `registerParticipation` (lote, con validación server-side).
- **Resumen por habilidad** (`getParticipationOverview`): intervención oral, argumentación, colaboración, escucha, etc., con conteo y media.
- **Dashboards**: resumen de curso (aula invertida %, evidencias pendientes, participación, tickets, dificultad percibida) y por clase (`getCourseDashboard` / `getClassDashboard`). Sin rankings.
- **Calendario administrativo** (`/teacher/calendar`): alertas verde/amarillo/rojo para guías (impresión −3 días) y evaluaciones (revisión evaluador −7 días); seeds `content/materials.json`.
- `ExitTicketRepository.listByClass` ahora filtra por curso (una clase la comparten varios cursos).

## [0.4.0] — FASE 4 (Actividades, quizzes y evidencias)

### Added
- **Motor de quizzes propio** (sin branding ajeno): 9 tipos de pregunta (choice, truefalse, order, match, fill, short, identify, image, map), config (temporizador opcional, puntos, intentos, retroalimentación inmediata, explicación posterior), modo individual/colectivo.
- **Corrección server-side**: `getQuizForStudent` sirve el quiz **sin respuestas**; `submitQuizAttempt` corrige, aplica el límite de intentos y persiste el intento. Las preguntas con `answer` no se leen desde el cliente (regla R15).
- **Evidencias**: `submitEvidence` (estudiante), estados `PENDIENTE→ENTREGADO→REVISADO→RETROALIMENTADO/REQUIERE_CORRECCION`, re-entrega cuando pide corrección, validación de contenido y adjuntos.
- **Revisión del profesor**: `reviewSubmission` (estado, nota, retroalimentación) con auditoría `SUBMISSION_REVIEW`.
- **Ticket de salida**: 5 respuestas + dificultad, vía `submitExitTicket`; listado para el profesor.
- Vistas web: `StudentQuizView` (QuizPlayer individual), `StudentActivitiesView` (evidencias), `ExitTicketView`, `SubmissionsReviewView` (profesor), `QuizResultsView` (profesor).
- Seeds: `content/quizzes.json` (2 quizzes) y `content/activities.json` (3 actividades).
- Reglas Firestore R15–R16 + tests de integración del flujo quiz+evidencia+ticket.

## [0.3.0] — FASE 3 (Motor de clases + aula invertida)

### Added
- Catálogo global de **12 misiones** (`classes/{id}`) con OA, feedback (1/4/7/10) y tiempo estimado.
- Programación por curso (`classSchedules/{courseId}/schedules/{classId}`): estados `DRAFT/READY/SCHEDULED/OPEN/IN_PROGRESS/COMPLETED/ARCHIVED`, ventana `startAt/endAt` y switches flipped/actividad/entrega/feedback. Callable `setClassSchedule` con auditoría.
- Aula invertida por bloques (`flippedLesson/{classId}`) con progreso individual (`flippedProgress/{classId}/records/{studentId}`), quiz con retroalimentación inmediata, reflexión y botón **«Estoy lista para la misión»** (tiempo no punitivo).
- Vista estudiante: home con «Tu próxima misión» + barra de progreso + reproductor flipped.
- Vista profesor: programación de clases + resumen de completitud del aula invertida (`getFlippedOverview`).
- Contenido educativo sembrado (`content/classes.json` + `content/missions/01–12/flipped.json`) separado del código (`pnpm seed:content`).
- Reglas Firestore R13–R14 (progreso flipped y catálogo) + tests de integración del flujo flipped.

### Changed
- `classes` pasa de documento con `courseId` a **catálogo global**; la programación por curso vive en `classSchedules`.

## [0.2.0] — FASE 1–2 (Base técnica + Cursos/estudiantes + Importación de nóminas)

### Added
- Monorepo (pnpm workspaces): `packages/{shared,domain,application,infrastructure}` + `apps/web` + `functions` + `scripts`.
- Clean Architecture: parser XLSX (SheetJS), mapeador de columnas, normalización de nombres (tildes/Ñ), detección de duplicados (NUEVA/CONFIRMADA/POSIBLE), casos de uso `PreviewStudentImportUseCase` e `ImportStudentsUseCase`.
- Pantalla `/teacher/students/import` con preview editable, resumen y estados.
- Dashboard de curso y perfil de estudiante (soft delete + auditoría).
- Cloud Functions callables: `previewStudents`, `importStudents`, `setStudentActive`.
- Reglas Firestore (R1–R18) y Storage; índices; App Check configurable.
- Emulador local en puertos dedicados (Firestore 8088, Auth 9098, Functions 5002).
- Scripts: `import:students`, `seed:courses`, `seed:demo-teacher`, `analyze:roster`.
- Importación real al emulador: **Curso D (41 estudiantes)** y **Curso E (34)**; columna `RUN` detectada como sensible y NO importada.
- Tests: 64 verdes (unit/component/reglas/integración). Documentación `STUDENT_IMPORT.md`.

### Security
- `3ro/*.xlsx`, `3ro/*.json` (incluido service account) y `private-data/` añadidos a `.gitignore`.
- El importador exige emulador por defecto (producción requiere `--prod` + autorización).
- Auditoría sin PII en los logs.

## [0.1.0] — FASE 0 (Discovery y arquitectura)

### Added
- Planificación completa del proyecto (docs), MVP, V2, backlog y roadmap.
- Detección de listas reales en `3ro/` y corrección de texto «Nuestro territorio necesita…» (Misión 06).
