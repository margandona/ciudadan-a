# Roles y permisos — RBAC

## Modelo de autorización

Dos mecanismos complementarios (defensa en profundidad):

1. **Custom claims** en Firebase Auth (`{ role, courses: [courseId], scope }`) → control de navegación, menús y rutas. Se otorgan solo desde Cloud Functions (`setCustomUserClaims`) bajo verificación de MASTER/ADMIN.
2. **Firestore Security Rules** → autorización real de cada lectura/escritura (nunca confiar en el frontend).

Las reglas verifican identidad, rol y pertenencia a curso. Ver `docs/FIRESTORE_RULES.md`.

## Roles

| Rol | Alcance | Asignado por |
|---|---|---|
| `MASTER` | Todo el sistema: usuarios, roles, cursos, profesores, configuración general, contenidos, auditoría. | Firebase console / MASTER |
| `ADMIN` | Usuarios, cursos, asignaciones, contenidos, reportes. | MASTER |
| `PROFESOR` | Cursos asignados: pedagogía completa, evidencias, participación, materiales, dashboards, proyección, exportaciones. | MASTER/ADMIN |
| `EVALUADOR` | Material autorizado: revisar, comentar, aprobar/rechazar/solicitar correcciones. Sin acceso a perfiles de estudiantes. | MASTER/ADMIN |
| `ESTUDIANTE` | Solo su propio perfil, su curso y su progreso. | MASTER/ADMIN/import |
| `MODO_PROYECCION` | Acceso temporal a `/projection/:classId` con token de proyección emitido por el profesor. No es una persona. | PROFESOR (token) |
| `PIE` (preparado) | Soporte PIE: información de integración, adecuaciones. | MASTER |
| `UTP` (preparado) | Coordinación pedagógica: planificaciones, reportes agregados. | MASTER |

## Matriz de permisos (resumen por dominio)

Leyenda: C = crear, R = leer, U = actualizar, D = borrar (soft), — = sin acceso.

| Dominio | MASTER | ADMIN | PROFESOR | EVALUADOR | ESTUDIANTE | PROYECCIÓN |
|---|---|---|---|---|---|---|
| Usuarios y roles | CRUD | CRUD (sin master) | R (curso) | — | R (propio) | — |
| Cursos | CRUD | CRUD | R (asignado) | — | R (inscrita) | — |
| Estudiantes (perfil) | CRUD | CRUD | R+U (curso) | R agregado | R (propio) | — |
| Condición PIE / integración | CRUD | R | R (curso) | — | — | — |
| Clases | CRUD | CRUD | U (habilitar/programar) | R | R (habilitadas) | R |
| Aula invertida | CRUD | CRUD | U | R | R+U (progreso propio) | — |
| Quizzes/juegos | CRUD | CRUD | CRUD | R | R (habilitado) + intento propio | R (colectivo) |
| Evidencias | CRUD | CRUD | R/U/comentar | — | C (propia), R (propia) | — |
| Participación | R | R | C/U | — | R (propia) | — |
| Materiales | CRUD | CRUD | C/U/envío | U (estado/comentarios) | R (aprobado y habilitado) | — |
| Feedback (estudiante) | R agregado | R agregado | R agregado (tendencias) | — | C+R (propio) | — |
| Ticket de salida | R agregado | R agregado | R agregado | — | C (propio) | — |
| Insignias | CRUD | CRUD | U (otorgar) | — | R (propias) | — |
| Proyección | R | R | U (crear/editar/emitir token) | R | — | R+interacción |
| Auditoría | CRUD | R | — | — | — | — |
| Configuración general | CRUD | R | — | — | — | — |

## Permisos detallados del PROFESOR (requeridos)

- Cursos: crear, ver, administrar asignados.
- Estudiantes: ver lista, consultar perfil individual, ver progreso.
- Clases: activar/desactivar, programar disponibilidad, habilitar aula invertida.
- Contenidos: gestionar.
- Evidencias: revisar, comentar, evaluar, registrar participación y observaciones.
- Insignias: otorgar.
- Quizzes y tickets de salida: revisar resultados.
- Estadísticas y exportación: visualizar y exportar (guías, evaluaciones, rúbricas, material DUA).
- Feedback: ver feedback docente y feedback sobre la aplicación (agregado).

## Reglas de acceso críticas

1. `ESTUDIANTE` → solo documentos cuyo `studentId == request.auth.uid`.
2. `PROFESOR` → solo `courseId ∈ claims.courses`.
3. `EVALUADOR` → solo material con estado `EN_REVISION`, `CON_OBSERVACIONES`, `CORREGIR_Y_REENVIAR` asignado a su `evaluatorId`, o `APROBADO`/`RECHAZADO` que haya revisado; nunca perfiles de estudiantes.
4. `MASTER`/`ADMIN` → dominio amplio; `MASTER` además auditoría y configuración.
5. `MODO_PROYECCION` → token firmado con expiración; no permite abrir otros dominios.
6. Las escrituras a `auditLogs` solo se aceptan si `request.auth.token.admin == true` o desde Cloud Functions (`admin` flag).

## Importación de nóminas (FASE 2, implementado)

- **PROFESOR/ADMIN/MASTER** pueden importar **solo de los cursos a los que pertenecen** (verificado en use-case y reglas).
- **ESTUDIANTE/EVALUADOR** nunca ven la nómina ni los datos de integración.
- El `RUN` y campos sensibles no se importan; la condición PIE/integración queda en `students/{id}/protected` (roles autorizados únicamente).
- Demostración local: usuario `profesor@demo.cl` / `Demo1234` con claims `PROFESOR` para los cursos D y E (ver `scripts/seed-demo-teacher.ts`).
