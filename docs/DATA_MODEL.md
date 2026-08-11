# Modelo de datos Firestore

Convenciones:

- **Documentos top-level** para entidades compartidas o con consultas de agregación.
- **Subcolecciones** para datos 1:N que se consultan siempre con padre conocido (reducir costo y reglas más precisas).
- IDs: colecciones en `camelCase`; IDs generados por Firestore salvo los naturales (`users/{uid}`, `courseMembers/{courseId}/{studentId}`, `classes/{classId}`, `courses/{courseId}`).
- Nombres de campos: `camelCase`. Timestamps: `Timestamp` de Firestore.
- **Regla de costo:** cada pantalla debe leer ≤ ~10 docs típicamente; listados de curso se agregan en el cliente o vía consultas con índices.

## Entidades y colecciones

### 1. `users/{uid}`
Perfil de usuario (identidad + rol + membresías resumen).

```
{
  uid: string,            // = Firebase Auth uid
  email: string,
  displayName: string,
  role: Role,             // MASTER|ADMIN|PROFESOR|EVALUADOR|ESTUDIANTE|PIE|UTP
  active: boolean,
  avatarUrl?: string,
  courseIds: string[],    // cursos a los que pertenece (denormalizado para reglas/claims)
  createdAt, updatedAt: Timestamp,
  metadata: { lastLoginAt?: Timestamp, createdBy?: string }
}
```

> `role` y `courseIds` se mantienen en **custom claims** (fuente rápida) y en este doc (fuente editable). Regla: solo `users/{uid}` propio para lecturas; escrituras de `role`/`courseIds`/`active` solo desde Functions (o `admin`).

### 2. `roles/{roleId}`
Catálogo de roles y permisos finos (config).

```
roles/STUDENT: { name, description, permissions: [...] }
```

### 3. `courses/{courseId}`
Id determinístico del importador: `course-3med-{sección}-{año}` (ej. `course-3med-d-2026`).

```
{
  id: string,                  // course-3med-d-2026
  name: string,                // "3º Medio D"
  level: string,               // "Tercero Medio"
  section: string,             // "D"
  subject: string,             // "Educación Ciudadana"
  year: number,                // 2026
  teacherId?: string,
  active: boolean,
  createdAt, updatedAt,
  settings: {
    feedbackAnonymous: boolean,       // modalidad anónima del feedback (RQ-006)
    participationScale: number[],     // [0,1,2,3]
    gradingScale?: { from, to },
    allowOffline: boolean,
    enablePIE: boolean
  }
}
```

### 4. `courseMembers/{courseId}/{memberId}`
Miembro de un curso (estudiante o docente). El `memberId` para estudiantes es su `studentId` interno.

```
{
  courseId: string,
  memberId: string,          // estudiante: studentId; docente: uid
  memberType: 'STUDENT'|'TEACHER'|'EVALUATOR'|'ADMIN',
  studentId?: string,        // referido a students/{id}
  roleInCourse: string,
  active: boolean,
  joinedAt, updatedAt
}
```

> Consultas habituales: «estudiantes del curso» → `courseMembers/{courseId}` donde `memberType==STUDENT`. «Cursos de un usuario» → se obtiene de claims/courseIds (evita consulta invertida).

### 5. `students/{studentId}`
Datos académicos de la estudiante (perfil pedagógico). `studentId` (documento) se vincula al `uid` de Auth **cuando se crea la cuenta**; el registro académico existe aunque la estudiante aún no tenga cuenta.

> **Implementado (FASE 1–2).** Campos reales del importador:

```
{
  id: string,                    // UUID propio (nunca RUT/correo/nombre)
  userId?: string,               // uid de Auth cuando la cuenta existe
  firstName?, middleName?, paternalSurname?, maternalSurname?: string,
  displayName: string,           // nombre original (tildes y Ñ intactas)
  preferredName?: string,
  normalizedSearchName: string,  // SOLO búsqueda/comparación (minúsculas, sin tildes)
  courseId: string,
  listNumber?: number,           // Nº de lista (opcional)
  active: boolean,               // Matriculado/Retirado
  archivedAt?: Timestamp|null,   // soft delete
  createdAt, updatedAt,
  academicProfile: { participationTrackingEnabled, gamificationEnabled },
  stats?: { lastActivityAt?, completedClasses?, submittedCount?, quizAttempts?, badgesCount? }
}
```

### 6. `students/{studentId}/protected` (subcolección protegida)
Datos de integración/accesibilidad. **Acceso restringido** (MASTER/ADMIN/PROFESOR del curso/PIE/UTP).

```
students/{id}/protected/settings: {
  integrationSupport: boolean,
  accessibilityPreferences: { fonts, contrast, audio, visualSupports: [...] },
  notes?: string,               // solo rol autorizado
  visibility: { roles: [...] }
}
```

> RQ-004: nunca visible para estudiantes ni EVALUADOR. No aparece en ninguna lista ni API de lectura amplia.

### 7. `units/{unitId}`
Unidades del curso (U3, U4) y OA asociados (catálogo curricular).

```
{
  courseId, code: 'U3'|'U4', title, description,
  oas: [{ code: 'OA6', text }],     // texto oficial MINEDUC
  order, active
}
```

### 8. `classes/{classId}` — catálogo global de las 12 misiones
El catálogo es el **mismo para todos los cursos**; la programación por curso vive en `classSchedules`.

> **Implementado (FASE 3).** Documento global (sin `courseId`):

```
{
  id: string,                  // 'class-01' … 'class-12'
  number: 1..12,
  missionId: string,           // 'mission-01' … 'mission-12'
  title: string,               // 'Misión 01 — ¿Qué significa ser ciudadana?'
  subtitle?: string,
  unitId: string,              // 'U3' | 'U4'
  oaIds: string[],             // OA6/OA7/OA4
  learningGoal?: string,
  order: number,
  hasFeedback: boolean,        // clases 1, 4, 7, 10
  flippedEnabled: boolean,
  estMinutes: number,          // 10–15
  rubricId?: string,
  materialIds?: string[],
  createdAt, updatedAt
}
```

### 8b. `classSchedules/{courseId}/schedules/{classId}`
Programación por curso (estado + disponibilidad + ventana). Escrita por el PROFESOR (vía callable con auditoría).

```
{
  classId, courseId,
  status: 'DRAFT'|'READY'|'SCHEDULED'|'OPEN'|'IN_PROGRESS'|'COMPLETED'|'ARCHIVED',
  availability: {
    enabled: boolean,
    startAt?: Timestamp,           // availableFrom
    endAt?: Timestamp,             // availableUntil
    flippedAvailable: boolean,     // flippedLessonAvailable
    activityAvailable: boolean,
    submissionAvailable: boolean,
    feedbackAvailable: boolean
  },
  updatedAt, updatedBy
}
```

> Disponibilidad evaluada en el cliente **y** en use-cases/reglas.

### 9. `flippedLesson/{classId}` (doc)
Aula invertida (contenido estructurado por bloques). Uno por clase (global).

```
{
  classId, title, objective, problemQuestion, concepts: string[],
  blocks: FlippedBlock[],        // title, objective, problem, concepts, text, image, video, map, infographic, reading, question, reflection, resource, gameRef
  estMinutes: number,            // 10–15
  readyLabel: 'Estoy lista para la misión',
  version: number,
  updatedAt
}
```

> `Block` = tipo unión `FlippedBlock` en `packages/shared` (bloques con `id` para seguimiento). Los referenciados a quiz/juego apuntan a `quizzes/{id}` / `games/{id}` (no embebidos). Sanitizado en Functions.

### 10. `flippedProgress/{classId}/records/{studentId}`
Progreso individual del aula invertida (subcolección `records`). La estudiante escribe su propio progreso; el profesor ve resúmenes vía callable `getFlippedOverview`.

```
{
  classId, studentId, courseId,
  startedAt, completedAt?: Timestamp|null,
  progressPercent: number,
  blocksVisited: string[],
  interactionSeconds: number,      // no punitivo
  quizScore?: number|null,
  quizAttempts: number,
  reflection?: string,
  ready: boolean,                  // «Estoy lista para la misión»
  updatedAt
}
```

### 11. `presentations/{classId}`
Presentación proyectable (DeckPlayer). Bloque `slide`.

```
{
  classId, version: number,
  slides: Slide[],                // estructura pedagógica obligatoria + bloques
  config: { timerDefault, theme, showAnswers, randomWheel },
  updatedBy, updatedAt
}
presentations/{classId}/history/{version}: { snapshot, updatedBy, updatedAt }
```

### 12. `activities/{activityId}`
Actividades de una clase (instrucciones, tipo, evidencia esperada).

```
{
  classId, courseId, title,
  type: 'dilemma'|'council'|'map'|'investigation'|'cabildo'|'budgetSim'|'dataLab'|'project'|'fair'|...,
  description, instructions,
  evidenceRequired: boolean,
  evidenceTypes: string[],
  rubricId?: string,
  maxScore?: number,
  order, active
}
```

### 13. `quizzes/{quizId}`
Cuestionario (motor propio, sin branding ajeno). Las preguntas en subcolección `quizzes/{quizId}/questions/{qid}` con `order`.

```
{
  classId, courseId, title,
  mode: 'INDIVIDUAL'|'COLLECTIVE',
  config: { timerSeconds?, points, attempts, immediateFeedback, showExplanation },
  shuffle: boolean,
  active, order
}
quizzes/{id}/questions/{qid}: { type, prompt, options?, answer (sanitizada), imageUrl?, mapId?, explanation, points, order }
```

> `answer` solo la ve la lógica de corrección (reglas: estudiante no lee respuestas de preguntas).

### 14. `quizAttempts/{quizId}/{studentId}`
```
{
  studentId, classId, courseId,
  startedAt, submittedAt, score, maxScore,
  answers: [{ qid, given, correct, points }],   // solo si el profesor habilita ver detalle; por defecto agregado
  status: 'IN_PROGRESS'|'SUBMITTED'
}
```

### 15. `games/{gameId}`
Configuración de minijuego.

```
{
  classId, courseId, type,       // classify|relate|order|decide|dilemma|budget|argue|timeline|truefalse|board
  title, instructions,
  config: object,                // dependiente del tipo (grids, budget caps, ramos)
  scoring: { base, bonuses, maxScore },
  oaRef: string[],               // responde a OA
  active
}
games/{id}/attempts/{studentId}: { studentId, score, duration, steps, submittedAt }
```

> Minijuego de simulación presupuestaria (Clase 8) = `type:'budget'` con `config.budgetUnits:100`, ramos 8 y 5 indicadores (bienestar, desigualdad, empleo, ambiente, aprobación).

### 16. `submissions/{submissionId}` (evidencias)
Toda evidencia entregable (RQ/FR-051). Un `submission` por (studentId, activityId) con historial de re-entregas.

```
{
  studentId, classId, courseId, activityId,
  status: 'PENDIENTE'|'ENTREGADO'|'REVISADO'|'RETROALIMENTADO'|'REQUIERE_CORRECCION',
  content: { text?, answer?: string|object, fields?: object },
  attachments: [{ type: 'pdf'|'image'|'doc'|'audio'|'link'|..., url, name, size, mime, storagePath? }],
  score?: number, rubricData?: object,
  teacherFeedback?: string, feedbackAt?: Timestamp,
  attempts: number,
  submittedAt, updatedAt
}
submissions/{id}/history/{version}: { snapshot, at, by }
```

### 17. `participation/{courseId}/{classId}/{studentId}`
Registro de participación (múltiples registros por clase/habilidad). Doc con `records[]` (hasta N por clase) para reducir lecturas.

```
{
  studentId, classId, courseId,
  records: [{ at: Timestamp, skill: ParticipationSkill, level: 0|1|2|3, note?: string, by: uid }],
  total: number,
  updatedAt
}
```

### 18. `badges/{badgeId}`
Catálogo de medallas (narrativa Observatorio Ciudadano).

```
{
  code: 'ANALISTA'|'INVESTIGADORA'|'CARTOGRAFA'|'CIUDADANA'|'MEDIADORA'|'INNOVADORA'
        |'BIEN_COMUN'|'PENSAMIENTO_CRITICO'|'CONSTRUCTORA_ACUERDOS'|'CIUDADANIA_DIGITAL',
  name, description, icon, criteria, level, order, active
}
```

### 19. `studentBadges/{studentId}/{badgeId}`
```
{ badgeId, studentId, earnedAt, via: 'auto'|'teacher', by?, hidden?: false }
```

### 20. `feedback/{classId}/{studentId}`
Feedback de estudiante (clases 1,4,7,10). Doc con dos dimensiones.

```
{
  classId, courseId, studentId,
  anon: boolean,
  app: { easyToFind, clear, working, open: string },
  learning: { objective, clarity, helpful, participated, comfortable, keep: string, change: string },
  submittedAt, updatedAt
}
```

> Si `anon:true` el docente ve solo agregados; el campo `studentId` se usa únicamente para evitar duplicados y se excluye de agregaciones anónimas.

### 21. `exitTickets/{classId}/{studentId}`
```
{
  classId, courseId, studentId,
  answers: { learned, evidence, concept, question, relationOvalle: string },
  difficulty: 1..5,
  submittedAt
}
```

### 22. `assessments/{assessmentId}`
Evaluaciones formales (con rúbrica).

```
{
  classId, courseId, title, type: 'FORMATIVE'|'SUMMATIVE'|'AUTHENTIC',
  oaIds: string[],
  rubricId: string,
  autoevaluacion: boolean, coevaluacion: boolean,
  deadline?: Timestamp,
  version: number,
  status: 'DRAFT'|'EN_REVISION'|'APROBADO'|'PUBLICADO',
  evaluatorId?: string,
  materialId?: string,
  createdBy, updatedAt
}
assessments/{id}/results/{studentId}: { score, rubricData, feedback, by, at }
```

### 23. `rubrics/{rubricId}`
```
{ title, oaIds, criteria: [{ name, description, levels: [{ level, label, points, descriptor }] }], version }
```

### 24. `materials/{materialId}`
Material didáctico (guía, evaluación, rúbrica, pauta, solucionario, lectura, complementario).

```
{
  classId?, courseId, type,
  title, oaIds: string[],
  hasDUA: boolean,
  status: 'BORRADOR'|'EN_REVISION'|'CON_OBSERVACIONES'|'APROBADO'|'RECHAZADO'|'CORREGIR_Y_REENVIAR',
  evaluatorId?: string,
  sentAt?: Timestamp, reviewAt?: Timestamp,
  printDeadline?: Timestamp,          // calendario −3 días
  reviewDeadline?: Timestamp,         // calendario −7 días
  currentVersion: number,
  createdBy, updatedAt
}
materials/{id}/versions/{v}: { fileUrl, fileName, mime, size, kind: 'GENERAL'|'DUA', note, uploadedAt, by }
materials/{id}/reviewComments/{c}: { text, by, role, at, statusAtReview }
```

> `kind: GENERAL | DUA` permite la versión general y la versión DUA/adecuada del mismo material (mismo OA).

### 25. `reviewRequests/{requestId}`
Solicitudes de revisión (evaluador).

```
{ materialId, courseId, requestedBy, evaluatorId, state, requestedAt, respondedAt }
```

### 26. `projects/{projectId}`
Proyecto Ovalle 2035 (ABP/ApS), Misión 11.

```
{
  classId, courseId,
  teamId: string,
  fields: {
    problem, evidence, territory, affectedPopulation, citizenParticipation,
    publicAgency, privateActor, resources, socialImpact, environmentalImpact, proposal
  },
  status: 'EN_PROGRESO'|'ENTREGADO'|'REVISADO',
  attachments: [], submittedAt, updatedAt
}
projects/{id}/teamMembers/{studentId}: { studentId, roleInTeam, active }
```

### 27. `notifications/{userId}/{notificationId}`
```
{ type, title, body, link, read: boolean, createdAt }
```

### 28. `auditLogs/{logId}`
```
{ userId, action, entity, entityId, courseId?, timestamp, metadata: { secure } }
```
Solo escritura desde Functions (`admin`). Ver `docs/SECURITY.md`.

### 29. `settings/{key}`
Configuración general: `{ key: 'general'|'content'|'security', value }`. Leída por MASTER; lecturas públicas mínimas según reglas.

## Índices Firestore necesarios (compuestos)

| Colección | Campos |
|---|---|
| `classes` | `courseId` asc + `order` asc |
| `classes` | `courseId` asc + `status` asc |
| `flippedProgress` | `classId` asc + `completedAt` asc |
| `submissions` | `courseId` asc + `status` asc + `classId` asc |
| `submissions` | `studentId` asc + `classId` asc |
| `quizAttempts` | `studentId` asc + `submittedAt` desc |
| `participation` | `courseId` asc + `classId` asc + `studentId` asc |
| `materials` | `courseId` asc + `status` asc |
| `materials` | `evaluatorId` asc + `status` asc |
| `feedback` | `courseId` asc + `classId` asc |
| `exitTickets` | `classId` asc + `submittedAt` asc |
| `projects` | `classId` asc + `status` asc |
| `studentBadges` | `studentId` asc + `earnedAt` desc |

> Los índices se declaran en `firestore.indexes.json` y se despliegan con el proyecto.

## Agregados y costos

- `students/{id}.stats` se actualiza mediante Functions (tras quiz, submission, participation) — evita `COUNT(*)` en cliente.
- Dashboard profesor: 1 consulta por dominio (resumen curso) con agregados denormalizados; los gráficos por clase se construyen con 1–3 consultas.
- Listas de estudiantes: consulta `students where courseId == X` (índice `courseId`+`active` declarado en `firestore.indexes.json`).
- **Emulador local:** Firestore en `127.0.0.1:8088`, Auth en `9098`, Functions en `5002` (puertos dedicados; 8080/9099 pueden estar ocupados por otros emuladores del equipo).


## FASE 4 � Quizzes, evidencias y ticket de salida (implementado)

- **`quizzes/{quizId}`** + **`quizzes/{quizId}/questions/{qid}`**: preguntas con campos de correcci�n (`correctIndex`, `correctOrder`, `correctPairs`, `correctText`, `keywords`). **Regla R15**: la estudiante NO lee las preguntas; las recibe v�a callable `getQuizForStudent` **sin respuestas** y la correcci�n ocurre server-side en `submitQuizAttempt`.
- **`quizAttempts/{quizId}/attempts/{studentId}`**: intento con `score`, `maxScore`, `answers[]` (resultados por pregunta) y `status`; escritura **solo server** (R15).
- **`activities/{activityId}`**: instrucciones, tipos de evidencia, r�brica opcional.
- **`submissions/{submissionId}`**: evidencia con `content`, `attachments`, `status` (PENDIENTE/ENTREGADO/REVISADO/RETROALIMENTADO/REQUIERE_CORRECCION), `score`, `teacherFeedback`. La estudiante crea la suya; el profesor actualiza solo campos de revisi�n (R16). Escritura de entregas/revisiones v�a callables `submitEvidence`/`reviewSubmission` (con auditor�a).
- **`exitTickets/{classId}/tickets/{studentId}`**: 5 respuestas + `difficulty` (1..5); escritura v�a `submitExitTicket`.
- Consultas con �ndice compuesto declarado: `submissions` (courseId+classId) y (studentId+activityId).
