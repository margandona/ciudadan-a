# Informe — Implementación del módulo de Materiales y Evaluaciones (flujo institucional)

**Fecha:** 2026-08-12 · **Base:** auditoría aprobada (FASE de materiales) · **Estado:** implementado y verificado

## 1. Qué se implementó

### Flujo de revisión institucional (multi-actor)
- **Máquina de estados ampliada** (`packages/domain/src/material/material-review.ts`):
  `BORRADOR → LISTO_PARA_REVISION → ENVIADO_A_REVISION → EN_REVISION → (OBSERVACIONES | REQUIERE_CAMBIOS) → CORREGIDO → REENVIADO → APROBADO → APROBADO_FINAL → READY_TO_PRINT`, más `RECHAZADO` y `ARCHIVED` (con atajos de compatibilidad FASE 7).
- **Aprobaciones por actor** (`materialApprovals`): PENDIENTE / APROBADO / CON_OBSERVACIONES / SOLICITA_CAMBIOS.
- **Configuración por tipo** (`reviewConfig`): guía simple → solo evaluadora; prueba sumativa → evaluadora + PIE + UTP; material DUA/PIE → evaluadora + PIE.
- **Gate de impresión**: `READY_TO_PRINT` solo si todas las aprobaciones obligatorias están `APROBADO` (mensaje claro «Falta aprobación …»).
- Roles `PIE` y `UTP` **activos** (dashboards propios, antes sin uso).

### Guías, pruebas, rúbricas, pautas, solucionarios, DUA/PIE, tabla de especificaciones
- **Modelo `Material` v2** (`packages/shared/src/material.ts`): tipos institucionales, `content` estructurado (secciones, ítems, rúbrica con escala configurable, solucionario, tabla de especificaciones, pauta), `version` + `parentMaterialId`, `courseIds`, `duration/estimatedPages`, `reviewConfig`, `classDate`/`reviewDeadline`/`printDeadline`.
- **Generador** (`GenerateMaterialUseCase` + botón en UI): GENERAR GUÍA / PRUEBA / RÚBRICA / PAUTA / VERSIÓN DUA / VERSIÓN PIE (crea borrador editable, nunca publica).
- **Editor** del profesor (`MaterialEditorView`): edita título, currículo, secciones, ítems, rúbrica, solucionario, tabla de especificaciones; cada guardado crea **versión nueva** (no sobrescribe la aprobada).
- **Duplicar / archivar / aplicar** (`duplicateMaterial`, `archiveMaterial`).
- **PDF y DOCX institucionales** (`functions/src/material-docs.ts`): `pdfkit` + `docx` con encabezado «Colegio La Providencia · Ovalle — Educación Ciudadana · Prof. Marcos Argandoña», descarga con permisos por rol.
- **Plazos** automáticos: revisión −7 días (evaluaciones) e impresión −3 días (guías impresas) desde la fecha de clase; alertas del calendario.

### Vistas
- `/teacher/materials` (generador + acciones + envío multi-rol), `/teacher/materials/:id` (detalle: currículo, documento, revisiones, versiones, comentarios con «Resolver»), `/teacher/materials/:id/edit` (editor).
- `/evaluator`, `/pie`, `/utp` (portales de revisión: lista de pendientes + detalle + aprobar/solicitar cambios/descargar).

## 2. Materiales creados (contenido real, en `content/material-content.json`)

| Clase | Material | Tipo |
|---|---|---|
| 1 | Diagnóstico U1–U2 (general + pauta + ticket) | WRITTEN_TEST / EXIT_TICKET |
| 2 | Consejo Ciudadano + rúbrica formativa | GUIDE |
| 3 | Mapa de participación ciudadana | GUIDE |
| 4 | Cartografía social | GUIDE |
| 5 | Expediente Ciudadano | GUIDE |
| 6 | Cabildo Providencia (trabajo + rúbrica + tabla especificaciones + pauta) | PRACTICAL_WORK |
| 7 | ¿Quién debe resolver los problemas? | GUIDE |
| 8 | Gobernar Ovalle: presupuesto comunal (ABJ) | WORKSHEET |
| 9 | Laboratorio Ciudadano de Datos | GUIDE |
| 10 | Agua, territorio y desarrollo en Limarí | GUIDE |
| 11 | Proyecto Ovalle 2035 + rúbrica | GUIDE |
| 12 | Feria Ciudadana (instrucciones + rúbrica final + pauta) | PRACTICAL_WORK |
| U3 | Prueba Unidad 3 (general + versión DUA + solucionario/pauta) | WRITTEN_TEST / DUA_VERSION / ANSWER_KEY |
| U4 | Prueba Unidad 4 (general + versión DUA + solucionario/pauta) | WRITTEN_TEST / DUA_VERSION / ANSWER_KEY |

Todo: breve (1–3 páginas), OA-coherente, contextualizado a Ovalle/Limarí, con DUA y solucionario/pauta.

## 3. Estados de revisión disponibles

`Borrador · Listo para revisión · Enviado a revisión · En revisión · Con observaciones · Requiere cambios · Corregido · Reenviado · Aprobado · Aprobado final · Listo para imprimir · Rechazado · Archivado`

## 4. Tests ejecutados (todos verdes)

| Suite | Resultado |
|---|---|
| `pnpm lint` | ✅ 0 |
| `pnpm typecheck` (web + server) | ✅ |
| `pnpm test` (unit + reglas + integración) | ✅ **280 passed** |
| `pnpm test:rules` | ✅ 21 (R19–R21: UTP/PIE/aprobaciones) |
| `pnpm test:integration` | ✅ 29 (incluye `material-approval-emulator`: FLOW 1 y FLOW 3) |
| `pnpm test:e2e` | ✅ **11/11** (material-flow FLOW 1/2, dashboards revisores, y flujos previos) |
| `pnpm build` | ✅ |

Tests nuevos: `material-review.test.ts` (dominio), `material-v2.use-case.test.ts` (16 casos: generación, versionado, duplicar, archivar, envío multi-rol, aprobación multi-actor, gate, plazos, FLOW 1), `material-approval-emulator.test.ts` (integración), reglas R19–R21, `e2e/material-flow.spec.ts`, `e2e/flow3-4-material-evaluador.spec.ts` (dashboards).

## 5. Errores encontrados y corregidos durante la implementación

- Firestore rechazaba `content` con **arrays anidados** (`rows: string[][]`) → modelo `rows: { cells }[]`.
- **pdfkit** empaquetado por esbuild perdía sus fuentes AFM → marcado `--external:pdfkit`.
- Spec E2E `flow5-8` usaba `innerText()` sin `await` (bug del test).
- Spec E2E de materiales: esperaba avisos que `load()` limpia → esperar el **estado** de la tarjeta; ids únicos por corrida.
- Reglas: `set` sobre comentario existente es `update` (solo server) → ids únicos en tests.

## 6. Cómo probar manualmente (resumen)

1. `profesor@demo.cl` → `/teacher/materials` → **Generar** (GUÍA o PRUEBA) → **Editar** → **Guardar** (v2) → **Descargar PDF/DOCX** → completar emails (evaluadora `evaluador@demo.cl`, opcionales `pie@demo.cl`, `utp@demo.cl`) → **Enviar a revisión**.
2. `evaluador@demo.cl` → `/evaluator` → abrir → comentar + **Aprobar** (prueba queda esperando PIE/UTP).
3. `pie@demo.cl` → `/pie` y `utp@demo.cl` → `/utp` → **Aprobar** → vuelve a profesor: estado **Aprobado final**.
4. Profesor → **Listo para imprimir** → estado **Listo para imprimir** (bloqueado si falta una aprobación obligatoria).
5. Verificación de plazos en `/teacher/calendar` y en la tarjeta (impresión límite / revisión límite).

## 7. Material listo para enviar a revisión institucional

Los **19 materiales sembrados** (12 clases + pruebas U3/U4 + solucionarios) están en `BORRADOR` en el emulador y **listos para editar y enviar** a evaluadora/PIE/UTP desde la UI. Al desplegar a producción, correr `pnpm seed:content` (con autorización) para cargarlos.

## 8. Rutas de archivos clave

- Modelo/estados: `packages/shared/src/material.ts`, `constants.ts`, `packages/domain/src/material/material-review.ts`
- Casos de uso: `packages/application/src/material/material-v2.use-case.ts`
- Repositorio: `packages/infrastructure/src/firebase/content-repositories.ts`
- Functions: `functions/src/index.ts` (callables), `functions/src/material-docs.ts` (PDF/DOCX)
- Web: `features/materials/{TeacherMaterialsView,MaterialEditorView,MaterialDetailView,ReviewerDashboard}.vue`, `features/evaluation/EvaluatorPortal.vue`, `router/index.ts`
- Contenido: `content/material-content.json` · seeds: `scripts/src/seed-content.ts`, `seed-demo-pie.ts`, `seed-demo-utp.ts`
- Reglas: `firestore.rules` (R19–R21) · Storage: `storage.rules`
