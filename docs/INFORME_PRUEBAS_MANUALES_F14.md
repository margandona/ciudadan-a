# Informe de Pruebas Manuales — FASE 14

**Fecha:** 2026-08-11 · **Entorno:** emuladores locales (Firestore 8088, Auth 9098, Functions 5002, web 5199)
**Ejecutadas por:** agente automatizado con Playwright (harness de la app real), replicando el runbook `docs/MANUAL_TEST_RUNBOOK.md`.

## Resultados por ronda

### Ronda A — Profesor

| # | Paso | Resultado |
|---|---|---|
| A1 | Login `profesor@demo.cl` | ✅ Entra a `/teacher` |
| A2 | Dashboard curso D | ✅ 41 estudiantes (37 activas / 4 retiradas), 111 registros de participación, listado sin datos del otro curso |
| A3 | Perfil + retiro (soft delete) | ✅ Retirada → «Reactivar»; historial conservado (restaurado tras la prueba) |
| A4 | Programar Misión 01 OPEN | ✅ Guardada con aula invertida disponible (`classSchedules` status=OPEN) |
| A5 | Dashboard clase | ✅ Indicadores y participación por habilidad; sin rankings |
| A6 | Participación en vivo | ✅ «3 registro(s) guardados» (111 → 114), sin errores |
| A7 | Material + versión + enviar a evaluador | ✅ «Guía F14» creada, versión GENERAL, estado «En revisión» |
| A8 | Proyección | ✅ Deck 1/14 con navegación ←/→ |
| A9 | Equipos / proyectos | ⚠️ Creación de equipo falla con error genérico (ver BUG-6); proyectos muestra empty state correcto |
| A10 | Feedback / Analítica | ✅ Empty states correctos, sin rankings, alertas descriptivas |
| A11 | Calendario | ✅ Alertas crítico/vencido y próximos según plazos |

### Ronda B — Estudiante

| # | Paso | Resultado |
|---|---|---|
| B1 | Login + home | ✅ «Hola, Estudiante», próxima misión y lista con disponibilidad |
| B2 | Aula invertida completa | ✅ 0% → 100% (6 pasos), quiz integrado (1 acierto), reflexión, «¡Lista! Ya puedes ir a clase» |
| B3 | Quiz | ✅ Resultado 3/3 con explicaciones por pregunta |
| B4 | Evidencia | ✅ Entrega → estado ENTREGADO |
| B5 | Ticket de salida | ✅ «¡Ticket enviado!» |
| B6 | Medallas | ✅ Evaluación idempotente; umbrales altos (Analista=4 quizzes, etc.) → 0 medallas con actividad parcial (comportamiento correcto) |
| B7 | Feedback privado | ✅ «Se guardó de forma privada» (con opción anónima) |
| B8 | Proyecto 11 campos | ✅ Entregado (requirió equipo demo; ver nota) |
| B9 | Offline | ✅ Cola + sincronización (ver BUG-7, corregido y verificado) |

### Ronda C — Evaluador

| # | Paso | Resultado |
|---|---|---|
| C1 | Login + portal | ✅ Solo material asignado, sin datos de estudiantes |
| C2 | Versiones GENERAL/DUA | ✅ v1 — guia-f14-general.pdf visible |
| C3 | Comentar + aprobar | ✅ «Revisión registrada.» → Estado Aprobado; historial con comentario |

## Bugs encontrados y resueltos

| ID | Hallazgo | Severidad | Estado |
|---|---|---|---|
| BUG-1 | Listado de cursos del profesor fallaba: «Null value error. for 'list'» (regla usaba el wildcard de ruta `{courseId}`; los listados se evaluaban con wildcard sin enlazar). También violaba «rules are not filters»: la query `where(section/year)` no filtraba por membresía. | P0 | ✅ Corregido |
| BUG-2 | Regla de `submissions` accedía `resource.data.studentId` sin default → «Property studentId is undefined» en listados de la estudiante. | P0 | ✅ Corregido |
| BUG-3 | La vista de actividades de la estudiante usaba `listByClass` (filtro por courseId) incompatible con la rama ESTUDIANTE de las reglas → query rechazada. | P0 | ✅ Corregido |
| BUG-4 | Regla de `materials` (rama EVALUADOR) accedía `resource.data.evaluatorId` sin default → riesgo de error en listados. | P1 | ✅ Corregido |
| BUG-5 | Los docs `courses` no guardaban `courseId` (necesario para BUG-1). | P0 | ✅ Corregido (repo de infraestructura) |
| BUG-6 | Callables no mapean `ValidationError` a `HttpsError`: crear un equipo con estudiantes ya asignadas devuelve 500 INTERNAL sin mensaje útil. Con todas las estudiantes en equipos, la UI muestra error genérico. | P1 | ⚠️ Documentado (recomendación: mapear errores de dominio en `functions/src`) |
| BUG-7 | Cola offline fallaba: «Failed to execute 'put' on 'IDBObjectStore': #<Object> could not be cloned» — el payload de feedback llevaba proxies reactivos de Vue, no clonables en IndexedDB. Las respuestas offline NUNCA se sincronizaban. | P0 | ✅ Corregido (JSON-clone en `enqueue`) y verificado (marcador llegó a Firestore) |

## Notas

- **BUG-6**: durante la prueba, las 36 estudiantes activas del curso D ya estaban asignadas a equipos, por lo que cualquier creación de equipo falla por diseño; el problema real es que el error no llega al usuario. Para verificar el flujo positivo se creó un equipo de prueba («Equipo Demo F14») con un doc de estudiante demo.
- **B8**: el usuario demo (`estudiante@demo.cl`) es solo una cuenta Auth (sin doc en la nómina), por lo que no pertenecía a ningún equipo; se habilitó para la prueba. En producción, la nómina importada debe contener a la estudiante.
- La suite automatizada (260 tests) y lint/typecheck/build quedan en verde tras las correcciones.

## Verificación

- `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm test` ✅ (55 archivos / 260 tests) · `pnpm build` ✅
