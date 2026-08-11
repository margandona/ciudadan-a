# Runbook de Pruebas Manuales (FASE 14)

Sesión guiada de **~30 min** para el/la docente. Marca cada paso con ✅/❌ y anota en Observaciones cualquier desviación (bug, redacción, flujo confuso). Los bugs confirmados se reportan al registro de `docs/BACKLOG.md` → «Bugs conocidos».

## Entorno y credenciales

| Item | Valor |
|---|---|
| App local | `http://localhost:5199` (emulador: `docs/DEPLOYMENT.md`) |
| Estaging (si disponible) | URL del proyecto staging configurada en CI/CD |
| Profesor | `profesor@demo.cl` / `Demo1234` |
| Estudiante | `estudiante@demo.cl` / `Demo1234` |
| Evaluador | `evaluador@demo.cl` / `Demo1234` |
| Cursos | `course-3med-d-2026`, `course-3med-e-2026` |

## Ronda A — Profesor (≈12 min)

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| A1 | Login `profesor@demo.cl` | Entra al panel con menú de profesor (`/teacher`) | |
| A2 | `Cursos` → abrir `course-3med-d-2026` | Solo el curso asignado; resumen (total/activas/retiradas) y listado sin estudiantes del otro curso | |
| A3 | Abrir perfil de una estudiante → «Retirar del curso» | Estado → Retirada (soft delete), historial conservado | |
| A4 | `Clases` → programar misión con aula invertida en OPEN | Estado guardado + aviso; auditable | |
| A5 | `Dashboard` de la clase | Flipped %, evidencias pendientes, participación, sin rankings | |
| A6 | `En vivo` → registrar «+ Argumentó» en varias estudiantes | Aviso «N registro(s) guardados»; resumen por habilidad actualizado | |
| A7 | `Materiales` → crear material con versión GENERAL + DUA → enviar a `evaluador@demo.cl` | Estado → En revisión | |
| A8 | `Proyección` `/projection/class-01` | Deck inicia en portada; navegar con ←/→/espacio | |
| A9 | `Equipos` → crear equipo; `Proyectos` → evaluar con rúbrica un proyecto entregado | Puntaje validado; estado REVISADO | |
| A10 | `Feedback` y `Analítica` | Promedios por clase y métricas; alertas descriptivas sin etiquetas | |
| A11 | `Calendario` | Alertas verde/amarillo/rojo según plazos | |

## Ronda B — Estudiante (≈10 min)

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| B1 | Login `estudiante@demo.cl` | Entra al home `/student` con saludo y «Tu próxima misión» | |
| B2 | Completar aula invertida de una misión OPEN | Bloques en orden, progreso avanza, reflexión + «Estoy lista para la misión» | |
| B3 | Responder un quiz disponible | Retroalimentación inmediata; los intentos se registran (límite respetado) | |
| B4 | Entregar una evidencia | Estado ENTREGADO; adjunto validado (tipo/tamaño) | |
| B5 | Ticket de salida | Confirmación; lo refleja el dashboard del profesor | |
| B6 | Home → «Evaluar medallas» | Se otorgan las medallas cuyo criterio se cumple (idempotente) | |
| B7 | Feedback en clase 1/4/7/10 | Se guarda de forma privada/anonimizada | |
| B8 | Proyecto (si hay equipo) | Los 11 campos; guardado por equipo | |
| B9 | **Offline**: desconectar red, responder un quiz, reconectar | Cola guarda → sincroniza; banner PENDIENTE → SINCRONIZADO | |

## Ronda C — Evaluador (≈5 min)

| # | Paso | Resultado esperado | ✅/❌ |
|---|---|---|---|
| C1 | Login `evaluador@demo.cl` | Portal `/evaluator` solo con material asignado, sin datos de estudiantes | |
| C2 | Abrir el material enviado en A7 | Versiones GENERAL y DUA (misma OA) | |
| C3 | Comentar y **Aprobar** | Estado → Aprobado; historial de observaciones; auditable | |

## Cierre

- [ ] Todos los pasos A/B/C con ✅ o ❌ (sin celdas vacías).
- [ ] Bugs reproducidos registrados en `docs/BACKLOG.md` → «Bugs conocidos».
- [ ] Caso del `docs/MANUAL_TEST_PLAN.md` corregido en su columna «Resultado obtenido» si aplica.
- [ ] Estado del checklist informado para cerrar la FASE 14.
