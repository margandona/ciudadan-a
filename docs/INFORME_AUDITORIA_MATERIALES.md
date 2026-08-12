# Auditoría del módulo de Materiales y Evaluaciones — Providencia Ciudadanía Lab

**Fecha:** 2026-08-11 · **Tipo:** auditoría de código real (sin asunciones) · **Estado:** INFORME — pendiente de aprobación para implementar

---

## 1. Resumen ejecutivo

El módulo de materiales existe y **funciona** en su forma base (FASE 7): crear material (metadatos), versiones GENERAL/DUA, envío a una **única evaluadora** por email, portal del evaluador con comentario y decisión, historial, calendario con alertas de plazo (−3 días impresión guías, −7 días revisión evaluaciones) y reglas R1–R18.

**El requisito institucional solicitado NO está implementado:**

- No hay **contenido real** de guías/evaluaciones (solo registros de metadatos; no existe el documento).
- No hay **generación de PDF/DOCX** ni **descarga** de materiales.
- No hay **subida real de archivos** (Firebase Storage está configurado en reglas pero **nadie lo usa en el código**).
- No hay **flujo multi-actor**: los roles `PIE` y `UTP` existen en `constants.ts` pero **no se usan en ningún archivo** (0 referencias en application/functions/web/rules).
- No hay **aprobaciones múltiples** (Evaluadora + PIE + UTP) ni `APROBADO_FINAL` / `READY_TO_PRINT` ni bloqueo de impresión sin aprobaciones.
- No hay **tabla de especificaciones**, **solucionarios con justificación**, **pautas** con contenido, ni **rúbricas por nivel** vinculadas a materiales.
- No hay **plantillas** (AssessmentTemplate/Application) para aplicar la misma prueba a varios cursos.
- No hay **generador** (GENERAR GUÍA/PRUEBA/RÚBRICA/PAUTA/DUA).
- No hay **dashboards de pendientes** para UTP/PIE/evaluadora.
- Solo existen **3 registros** de material en el seed (`content/materials.json`), sin contenido para las 12 clases.

## 2. Inventario real verificado

| Área | Qué existe (verificado en código) |
|---|---|
| Roles | `MASTER, ADMIN, PROFESOR, EVALUADOR, ESTUDIANTE, MODO_PROYECCION, PIE, UTP` (`packages/shared/src/constants.ts`) |
| Colecciones Firestore | `materials`, `materials/{id}/versions`, `materials/{id}/reviewComments`, `materials/{id}/reviewRequests`, `rubrics` (solo proyectos). **NO existen** `guides`, `answerKeys`, `duaVersions`, `assessmentTemplates`, `assessmentApplications`; `assessments` top-level tiene regla pero no se usa (solo subcolección de proyectos). |
| Callables (functions) | `createMaterial`, `addMaterialVersion`, `sendMaterialForReview`, `listMaterialsForTeacher`, `listMaterialsForEvaluator`, `getMaterialDetail`, `reviewMaterial`. **NO existen** update/duplicate/archive/delete/download/approve multi-actor. |
| Use cases | `packages/application/src/material/material.use-case.ts` (7 clases) |
| Repositorio | `FirestoreMaterialRepository` (`content-repositories.ts`) — solo `listByCourse`/`listByEvaluator` |
| Vistas | `/teacher/materials` (crear, versiones, enviar) · `/evaluator` (portal evaluador). **Sin rutas UTP/PIE**. |
| Storage | `storage.rules` define rutas `submissions/` y `materials/` pero **0 imports** de `firebase/storage` en web y 0 uso en functions. |
| PDF/DOCX | **No existe** ninguna librería (sin pdfkit/docx) ni generación. |
| Reglas materiales | Lectura: ADMIN/PROFESOR del curso/EVALUADOR asignado. Comentarios: EVALUADOR/PROFESOR/ADMIN. **UTP/PIE sin acceso**. |
| Estado material | `BORRADOR→EN_REVISION→(CON_OBSERVACIONES|APROBADO|RECHAZADO|CORREGIR_Y_REENVIAR)` y vuelta a `EN_REVISION`. Sin `LISTO`, `REQUIERE_CAMBIOS`, `CORREGIDO`, `REENVIADO`, `APROBADO_FINAL`, `READY_TO_PRINT`. |
| Tests | `material.use-case.test.ts` (crear/versionar/enviar/revisar/listar/detalle). Sin duplicar/archivar/editar/PDF/DOCX/descarga/multi-aprobación/plazos por tipo/PIE/UTP. |
| Seed | `content/materials.json` → 3 registros de metadatos (class-03 guía, class-05 guía, class-06 evaluación), sin versiones ni contenido. |

## 3. Tabla de auditoría

| # | Requisito | Estado | Implementado | Parcial | No impl. | Archivo / módulo | Problema | Acción propuesta |
|---|---|---|---|---|---|---|---|---|
| 1 | Guías de aprendizaje | Existe como tipo | ✅ | | | `Material.type="guia"` | Solo metadato; no hay documento/contenido | Modelo de contenido + generador + seed de 12 guías |
| 2 | Evaluaciones escritas | Existe como tipo | ✅ | | | `Material.type="evaluacion"` | Sin ítems, sin portada, sin tabla de especificaciones | Modelo Assessment (ítems, puntaje, tabla) + plantillas |
| 3 | Trabajos prácticos | Tipo no existe | | | ❌ | `Material.type` (7 tipos) | No hay tipo `trabajo`/`practical_work` | Ampliar tipos a 13 (GUIDE…SUPPORT_MATERIAL) |
| 4 | Rúbricas | Existen para proyectos | ✅ | | | `rubrics/{id}` (content/rubrics.json, 3) | Modelo sin escala por nivel (4/3/2/1), sin vínculo a material | Extender `Rubric` (niveles, escala configurable) y vincular a material |
| 5 | Pautas | Existe como tipo | ✅ | | | `Material.type="pauta"` | Sin contenido de pauta docente | Modelo de pauta por tipo de material |
| 6 | Solucionarios | Existe como tipo | ✅ | | | `Material.type="solucionario"` | Sin estructura (ítem/respuesta/puntaje/justificación) | Modelo AnswerKey + generación |
| 7 | Versión DUA | Parcial | | ✅ | | `MaterialVersion.kind="DUA"` | Solo metadato; sin contenido DUA real | Generador de versión DUA desde origen |
| 8 | Versión PIE | No existe | | | ❌ | `MaterialVersion.kind` (GENERAL/DUA) | Rol PIE sin uso; sin kind PIE | Añadir kind PIE + adecuaciones conservando OA |
| 9 | Subida de archivos | No existe | | | ❌ | `storage.rules` + 0 uso en código | Nadie sube archivos; versiones son metadato (fileName/url) | Servicio de Storage (upload/download) en functions/web |
| 10 | Descarga | No existe | | | ❌ | Vistas materiales/evaluador | Solo enlace `url` opcional si el profesor lo pega | Descarga de PDF/DOCX desde Storage y generados |
| 11 | Versionamiento | Parcial | | ✅ | | `addMaterialVersion` (v = len+1) | Sin `changeSummary`; sin comparar versiones; sin versiones de contenido | Versiones con cambio+diff y `material.version` |
| 12 | Envío a revisión | Existe | ✅ | | | `sendMaterialForReview` | Solo una evaluadora por email | Envío multi-actor configurable (evaluadora/PIE/UTP) |
| 13 | Comentarios evaluadora | Existe | ✅ | | | `reviewComments` | `role` fijo EVALUADOR; sin `section`/`resolved`/`versionId` | Comentarios por sección/versión, resolución, multi-rol |
| 14 | Comentarios PIE | No existe | | | ❌ | — | Rol sin uso | Revisión PIE (accesibilidad/DUA) con comentarios |
| 15 | Comentarios UTP | No existe | | | ❌ | — | Rol sin uso | Revisión/validación UTP con comentarios |
| 16 | Corrección | Parcial | | ✅ | | `CORREGIR_Y_REENVIAR→EN_REVISION` | No hay estado `CORREGIDO` ni registro de corrección | Estados `REQUIERE_CAMBIOS→CORREGIDO→REENVIADO` |
| 17 | Reenvío | Parcial | | ✅ | | vuelta a `EN_REVISION` | No distingue reenvío | Estado `REENVIADO` + historial |
| 18 | Aprobación | Parcial | | ✅ | | `reviewMaterial→APROBADO` | Aprobación única (evaluadora); sin APROBADO_FINAL ni bloqueo | Aprobaciones por actor + `APROBADO_FINAL`/`READY_TO_PRINT` |
| 19 | Historial | Parcial | | ✅ | | `versions` + `reviewComments` | Solo versiones de metadato y comentarios | Historial de estados/decisiones por versión |
| 20 | Fechas límite | Parcial | | ✅ | | `printDeadline`/`reviewDeadline` | Se fijan a mano; no se calculan desde la fecha de clase | Cálculo automático −3d/−7d por tipo y estado |
| 21 | Alertas | Parcial | | ✅ | | `GetCalendarAlertsUseCase` | Solo `guia` (impresión) y `evaluacion|guia` (revisión); solo PROFESOR | Alertas por tipo y por actor (UTP/PIE/evaluadora) |
| 22 | Permisos | Parcial | | ✅ | | `firestore.rules` (materials) | UTP/PIE sin acceso; descarga no regulada | Reglas por rol (PROFESOR/EVALUADORA/PIE/UTP) + Storage |
| 23 | Auditoría | Parcial | | ✅ | | `MATERIAL_CREATED/SEND_FOR_REVIEW/REVIEW` | Sin auditoría de versiones/comentarios/resolución/aprobación por actor | Ampliar `auditLogs` a todo el ciclo |
| 24 | Tests | Parcial | | ✅ | | `material.use-case.test.ts` | Sin tests de duplicar/archivar/editar/PDF/DOCX/descarga/multi-aprobación/plazos/PIE/UTP | Suites de material, review, permisos, assessment, plazos, descarga |

## 4. Modelo de datos corregido (propuesta)

```ts
// MATERIAL (v2) — amplía el actual sin romper el flujo existente
Material {
  id: string
  classId?: string
  unitId?: string
  courseIds: string[]            // una prueba puede aplicarse a varios cursos
  type: MaterialType             // 13 tipos (GUIDE, ASSESSMENT, WRITTEN_TEST, PRACTICAL_WORK, PROJECT,
                                 //   RUBRIC, ANSWER_KEY, SCORING_GUIDE, DUA_VERSION, PIE_VERSION,
                                 //   READING, WORKSHEET, EXIT_TICKET, SUPPORT_MATERIAL)
  title: string
  description?: string
  status: MaterialStatus         // máquina de estados ampliada (abajo)
  learningObjectives?: string[]
  classObjective?: string
  indicators?: string[]
  duration?: number              // minutos
  estimatedPages?: number
  version: number                // v1, v2, v3…
  parentMaterialId?: string      // versiones DUA/PIE/adaptadas apuntan al general
  requiresPrinting?: boolean
  requiresReview?: boolean
  reviewConfig: { evaluatorRequired: boolean; pieRequired: boolean; utpRequired: boolean }
  deadlines?: { reviewDeadline?: Iso; printDeadline?: Iso }
  createdBy: string
  createdAt: Iso
  updatedAt: Iso
}

// APROBACIONES por actor (nueva colección)
materialApprovals/{materialId}/approvals/{role}  // { role, status: PENDIENTE|APROBADO|CON_OBSERVACIONES|SOLICITA_CAMBIOS, by, at, commentId? }

// COMENTARIOS v2
ReviewComment { id, materialId, versionId?, section?, text, by, role, at, resolved: boolean, resolvedBy?, resolvedAt? }

// VERSIÓN con contenido
MaterialVersion { id, materialId, version, kind: GENERAL|DUA|PIE, changeSummary?, content?: MaterialContent, fileUrl?, fileName?, mime?, size?, by, at }

// CONTENIDO del documento (para generador)
MaterialContent { header, curricular, sections: Section[], items?: AssessmentItem[], rubric?: RubricRef, answerKey?: AnswerKey }

// RÚBRICA v2 (escala configurable)
Rubric { id, title, oaIds?, scale: { levels: [{label, score}] }, criteria: [{ id, name, descriptor, levels: [{score, descriptor}] }] }

// PLANTILLAS / APLICACIONES
AssessmentTemplate { id, type, title, content, reviewConfig, version }
AssessmentApplication { id, templateId, courseId, classId?, dates {reviewDeadline, printDeadline, appliedAt} }

// SOLUCIONARIO
AnswerKey { id, materialId, version, items: [{ itemId, correct, points, justification?, criteriaExpected? }] }

// TABLA DE ESPECIFICACIONES (derivada del contenido)
SpecificationTable { materialId, version, rows: [{ oa, indicator, content, skill, itemId, points, cognitiveLevel }] }
```

## 5. Flujo institucional (máquina de estados ampliada)

```
BORRADOR
  → (GENERAR → crea borrador editable, no publica)
LISTO_PARA_REVISION
  → ENVIADO_A_REVISION
  → EN_REVISION          (aprobaciones por actor)
       ├─ OBSERVACIONES (comentario por sección; PROFESOR corrige → CORREGIDO → REENVIADO)
       ├─ REQUIERE_CAMBIOS (idem)
       └─ APROBADO por actor
  → cuando todas las aprobaciones obligatorias están APROBADAS
       → APROBADO_FINAL  (→ READY_TO_PRINT cuando requiresPrinting y plazos cumplidos)
RECHAZADO                (reinicia desde BORRADOR)
```

**Regla de bloqueo:** un material con `reviewConfig.pieRequired=true` y aprobación PIE `PENDIENTE` **no puede** pasar a `READY_TO_PRINT` (mensaje claro «Falta aprobación PIE»).

**Por tipo de material (configurable):**
- GUÍA SIMPLE → solo evaluadora.
- PRUEBA SUMATIVA → evaluadora + PIE + UTP.
- GUÍA DUA → evaluadora + PIE (UTP opcional).

## 6. Plan de implementación propuesto

| Fase | Alcance |
|---|---|
| **A** | Modelo v2 (shared): tipos (13), estados ampliados, `MaterialContent`, `ReviewComment v2`, `Rubric v2`, `AnswerKey`, `SpecificationTable`, `AssessmentTemplate/Application`, `MaterialApproval`. Migración compatible (fields opcionales). |
| **B** | Dominio: máquina de estados multi-actor + bloqueo READY_TO_PRINT + cálculo de plazos (−3d/−7d) por tipo. |
| **C** | Repositorios/Reglas: `materialApprovals`, comentarios v2, lectura UTP/PIE, Storage (subida/descarga con roles). |
| **D** | Generador de material (GUÍA/PRUEBA/RÚBRICA/PAUTA/SOLUCIONARIO/DUA/PIE) con template institucional (encabezado «Colegio La Providencia · Ovalle · Educación Ciudadana · Prof. Marcos Argandoña») + tabla de especificaciones + solucionario. |
| **E** | PDF (pdfkit) y DOCX (docx lib) — templates institucionales reutilizables; descarga con permisos. |
| **F** | Vistas: editor de material del profesor (editar/duplicar/archivar), dashboards «Pendientes» para PROFESOR/EVALUADORA/PIE/UTP, vista de material con currículo/documento/revisiones/historial/comentarios, comparar versiones, aprobar por actor. |
| **G** | Content: seed de material para las 12 clases (guías 1–2 páginas, DUA, PIE, pruebas U3/U4, rúbricas, pautas, solucionarios, tablas de especificaciones, tickets). |
| **H** | Tests (unit/use-case/integración/rules/E2E) + plan manual «MATERIAL PEDAGÓGICO». |
| **I** | Docs (DATA_MODEL, SECURITY, DUA, MANUAL_TEST_PLAN, CHANGELOG). |

## 7. Archivos a crear / modificar

**Crear**
- `packages/shared/src/material.ts` (v2), `assessment.ts`, `answerKey.ts`, `specification.ts`, `approval.ts`
- `packages/domain/src/material/material-review.ts` (máquina multi-actor + plazos + bloqueo)
- `packages/application/src/material/material-generator.use-case.ts`, `assessment.use-case.ts`, `approval.use-case.ts`
- `packages/infrastructure/src/firebase/material-v2-repositories.ts` (o ampliar content-repositories)
- `functions/src/material-generator.ts` (o callables nuevos) + `functions/src/pdf.ts` + `functions/src/docx.ts`
- `apps/web/src/features/materials/MaterialEditorView.vue`, `ApprovalDashboards/*.vue` (profesor/evaluadora/pie/utp)
- `content/materials/*` (12 clases: guías, pruebas, rúbricas, pautas, solucionarios, DUA/PIE, tablas)
- `tests/material/*`, `tests/rules/material-approval.rules.test.ts`, `e2e/material-flow1.spec.ts`…

**Modificar**
- `packages/shared/src/constants.ts` (estados + tipos)
- `packages/application/src/material/material.use-case.ts` (enviar multi-actor, versionar con cambio)
- `packages/infrastructure/src/firebase/content-repositories.ts` (aprobaciones, comentarios v2, lectura por rol)
- `functions/src/index.ts` (callables nuevos: `generateMaterial`, `updateMaterial`, `duplicateMaterial`, `archiveMaterial`, `downloadMaterial`, `approveMaterial`, `listPendingForRole`, `compareVersions`)
- `apps/web/src/router/index.ts` (rutas UTP/PIE), `features/materials/TeacherMaterialsView.vue`, `features/evaluation/EvaluatorPortal.vue`
- `firestore.rules` + `storage.rules` (acceso UTP/PIE, subida/descarga)
- `content/materials.json` (v2), `content/rubrics.json` (v2 con niveles)
- `docs/*` + `package.json` (pdfkit, docx)

## 8. Materiales a generar (12 clases)

- **Clase 1** (diagnóstica): guía docente breve, diagnóstico U1–U2 + DUA, pauta de respuestas, ticket.
- **Clase 2** «Consejo Ciudadano» (≤2 pág.) + rúbrica formativa breve (argumentación, comprensión de perspectivas, escucha, participación).
- **Clase 3** Mapa de participación (≤2 pág., institucional/social/digital, ¿un like es participación? + espacio de argumento).
- **Clase 4** Cartografía social (≤2 pág.: lugar/problema/oportunidad/actor/evidencia).
- **Clase 5** Expediente Ciudadano (≤3 pág.: problema/ubicación/población/causas/actores/evidencia/institución/propuesta inicial).
- **Clase 6** Cabildo U3: instrucciones del trabajo, rúbrica, autoevaluación, pauta docente, versión DUA, versión PIE, tabla de especificaciones.
- **Clase 7** Guía breve Estado/Mercado/Ciudadanía/Colaboración (casos: salud, áreas verdes, transporte, seguridad, vivienda).
- **Clase 8** Guía ABJ presupuesto (≤2 pág., 100 unidades, 8 áreas, tabla DECISIÓN/COSTO/JUSTIFICACIÓN/IMPACTO).
- **Clase 9** Guía de análisis de datos (OBSERVO/INTERPRETO/CUESTIONO/PROPONGO, 2–3 datos).
- **Clase 10** Guía de caso Agua Limarí (≤3 pág.: contexto, actores, intereses, evidencia, sostenibilidad, pregunta argumentativa).
- **Clase 11** Guía de proyecto Ovalle 2035 (11 campos) + rúbrica de proyecto.
- **Clase 12** Feria: instrucciones de presentación, rúbrica final, autoevaluación, pauta docente, versión DUA, tabla de especificaciones, ticket final.
- **Evaluaciones individuales**: Prueba U3 (general + DUA/PIE + solucionario + tabla + pauta, 10–15 ítems) y Prueba U4 (misma estructura; Estado/mercado/pobreza/desigualdad/sostenibilidad/comercio justo).

## 9. Estrategia PDF / DOCX

- **PDF**: librería `pdfkit` en las Cloud Functions (generación server-side); template institucional reutilizable (encabezado con logo/nombre del colegio, asignatura, curso, unidad, fecha, OA, pie de página). Idempotente y auditable.
- **DOCX editable**: librería `docx` (Node) para guías/pautas que deban editarse; mismo template.
- **Descarga**: callable `downloadMaterial` que genera/recupera el archivo y lo sirve con permisos (PROFESOR del curso, EVALUADORA asignada, PIE/UTP según permiso); Storage para archivos subidos (materiales `materials/{id}/versions/...` y evidencias `submissions/...`).
- Caché de archivos generados por `materialId+version+kind`.

## 10. Estrategia de tests

- **Unit (use-case)**: crear/editar/versionar/duplicar/archivar; enviar/comentar/solicitar cambios/corregir/reenviar/aprobar; permisos por rol; assessment (general/DUA/solucionario/rúbrica/tabla); plazos (−7/−3/vencido/próximo/correcto); bloqueo READY_TO_PRINT.
- **Reglas**: aprobaciones por actor; UTP/PIE lectura; Storage por rol.
- **Integración (emulador)**: flujo completo multi-actor en `tests/integration/material-approval-emulator.test.ts`.
- **E2E Playwright**: FLOW 1 (Profesor genera prueba U3 → envía → Evaluadora solicita cambio → corrige/reenvía → Evaluadora aprueba → PIE aprueba DUA → UTP aprueba → APROBADO FINAL); FLOW 2 (guía clase 4 → PDF → impresión requerida → plazo correcto); FLOW 3 (impresión sin aprobación PIE → bloqueado con mensaje).
- **Manual**: sección «MATERIAL PEDAGÓGICO» en `docs/MANUAL_TEST_PLAN.md`.

## 11. Riesgos

| Riesgo | Mitigación |
|---|---|
| Migración del modelo puede romper material existente | Campos v2 opcionales + migración compatible; reglas/índices nuevos; no eliminar flujo FASE 7 |
| Generación PDF/DOCX en Functions (tiempo/límites) | Librerías ligeras, caché por versión, límite de tamaño/páginas |
| Ampliar roles (PIE/UTP) afecta reglas y Auth | Claims por rol ya soportados; seeds demo UTP/PIE; pruebas de reglas |
| Scope grande (24 requisitos) | Plan por fases A–I con entregables verificables por fase |
| Storage real implica costos/permisos | Límites (50 MB), buckets por entorno, reglas de Storage testeadas |
| Semántica pedagógica (no exagerar páginas) | Templates con máximos por tipo (guía 1–2 pág., prueba 2–4 pág., rúbrica 1–2 pág.) |

---

**¿Apruebas esta auditoría y el plan de corrección del módulo de materiales y evaluaciones?**
