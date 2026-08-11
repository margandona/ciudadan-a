# Providencia Ciudadanía Lab

**Observatorio Ciudadano — Ovalle 2035**

PWA educativa para el Colegio La Providencia de Ovalle (Chile). Acompaña las 12 clases de la asignatura **Educación Ciudadana** de Tercero Medio (Unidad 3: *Participación y organización territorial en democracia*; Unidad 4: *Relaciones entre Estado y mercado*), articulando aula invertida, ABP, ABJ, Aprendizaje Servicio, gamificación sobria, alfabetización de datos, análisis territorial, DUA, evaluación formativa y aprendizaje situado en Ovalle y la Provincia del Limarí.

> La tecnología **no reemplaza la pedagogía**. La plataforma es un ecosistema para preparar, desarrollar, evaluar y registrar las clases.

---

## 1. Resumen ejecutivo

- **Qué es:** una PWA (instalable, usable offline parcialmente) con roles distintos para estudiante, profesor, evaluador, admin, master y modo proyección en aula.
- **Para quién:** estudiantes de 3.º Medio y su profesor/a; el módulo evaluador da soporte a la revisión institucional de material didáctico.
- **Enfoque pedagógico:** aula invertida (12 misiones de 10–15 min), aprendizaje basado en juegos y proyectos, evaluación auténtica (Cabildo Providencia, Feria Ciudadana), ticket de salida en cada clase, feedback privado cada 3 clases, registro de participación no punitivo y analítica pedagógica sin etiquetar estudiantes.
- **Stack:** Vue 3 + TypeScript + Vite + Pinia + Vue Router (frontend), Node.js + TypeScript (backend/Cloud Functions), Firebase (Auth, Firestore, Storage, Hosting, Functions, App Check, Emulator Suite), Vitest + Vue Test Utils + Playwright (testing), GitHub Actions (CI/CD).
- **Arquitectura:** Clean Architecture (domain / application / infrastructure / presentation), monorepo con paquetes compartidos.
- **Estado:** FASE 0 (planificación y arquitectura). **Pendiente de aprobación para iniciar FASE 1.**

### Rutas de entrega

| Entregable | Dónde |
|---|---|
| Resumen ejecutivo, MVP, V2, roadmap | `README.md` |
| Requerimientos funcionales y no funcionales | `docs/REQUIREMENTS.md` |
| Roles y permisos (RBAC) | `docs/USER_ROLES.md` |
| Arquitectura, diagrama, estructura de carpetas | `docs/ARCHITECTURE.md` |
| Modelo de datos Firestore + índices | `docs/DATA_MODEL.md` |
| Reglas Firestore y sus pruebas | `docs/FIRESTORE_RULES.md` |
| Seguridad, privacidad, autenticación, entornos | `docs/SECURITY.md` |
| Arquitectura del contenido educativo y seeds | `docs/CONTENT_MODEL.md` |
| Diseño de producto (proyección, aula invertida, dashboards, evaluador, perfil estudiante, gamificación) | `docs/PRODUCT_DESIGN.md` |
| Estrategia DUA / accesibilidad | `docs/DUA_GUIDELINES.md` |
| Estrategia de testing | `docs/TEST_STRATEGY.md` |
| Plan de pruebas manuales | `docs/MANUAL_TEST_PLAN.md` |
| Entornos y CI/CD | `docs/DEPLOYMENT.md` |
| Plan por fases (0–16) | `docs/PROJECT_PHASES.md` |
| Backlog priorizado | `docs/BACKLOG.md` |
| Riesgos técnicos y pedagógicos | `docs/RISKS.md` |
| Registro de cambios | `docs/CHANGELOG.md` |

---

## 2. Las 12 misiones

### Unidad 3 — Participación y organización territorial en democracia (OA6, OA7)

| Clase | Misión | Núcleo | Actividad central |
|---|---|---|---|
| 1 | **Misión 01** — ¿Qué significa ser ciudadana? | ciudadanía, democracia, participación | dilemas ciudadanos; diagnóstico de ideas previas; **feedback** |
| 2 | **Misión 02** — Tres maneras de entender la ciudadanía | republicanismo, liberalismo, comunitarismo | Consejo Ciudadano (ABJ: roles + negociación) |
| 3 | **Misión 03** — ¿Participamos realmente? | participación institucional, social, digital | Mapa de participación; pregunta: *¿Un like es participación ciudadana?* |
| 4 | **Misión 04** — ¿Quién construye el territorio? | territorio, actores territoriales, escalas | cartografía social de Ovalle; **feedback** |
| 5 | **Misión 05** — Detectives del territorio | investigación local | **Expediente Ciudadano** (problema, ubicación, población afectada, causas, actores, evidencias, instituciones, soluciones) |
| 6 | **Misión 06** — Cabildo Providencia | evaluación auténtica | presentación «Nuestro territorio necesita…» + rúbrica, autoevaluación y coevaluación opcional |

### Unidad 4 — Relaciones entre Estado y mercado (OA4)

| Clase | Misión | Núcleo | Actividad central |
|---|---|---|---|
| 7 | **Misión 07** — ¿Quién debe resolver los problemas? | Estado, mercado, bienes públicos, colaboración | «¿Quién debería pagar por…?»; **feedback** |
| 8 | **Misión 08** — Gobernar Ovalle | presupuesto público | **Simulador presupuestario** (100 unidades; vivienda, seguridad, educación, áreas verdes, transporte, cultura, medio ambiente, salud → bienestar, desigualdad, empleo, ambiente, aprobación) |
| 9 | **Misión 09** — ¿Por qué existe desigualdad? | pobreza, desigualdad, equidad, distribución, desarrollo | **Laboratorio Ciudadano de Datos** (OBSERVO → INTERPRETO → CUESTIONO → PROPONGO) |
| 10 | **Misión 10** — Agua, territorio y desarrollo en Limarí | sostenibilidad, recursos, economía, medio ambiente | caso agua y desarrollo territorial; **feedback** |
| 11 | **Misión 11** — Diseñamos una solución | ABP + Aprendizaje Servicio | proyecto **Ovalle 2035** (11 campos) |
| 12 | **Misión 12** — Feria Ciudadana Ovalle 2035 | producto final | feria + rúbrica final |

### Puntos de feedback de estudiante
Clases **1, 4, 7, 10** (dos dimensiones: experiencia de la aplicación / experiencia de aprendizaje y docencia; modalidad anónima configurable; privado).

---

## 3. MVP recomendado (Fases 1–11)

Cubre el ciclo pedagógico completo de una clase sin esperar V2:

1. **FASE 1** — Base técnica: monorepo Vue 3 + TS + Clean Architecture, Auth, RBAC, App Check.
2. **FASE 2** — Cursos, usuarios y estudiantes (importación CSV/JSON; DEMO + listas reales detectadas en `3ro/`).
3. **FASE 3** — Motor de clases + aula invertida (12 misiones, progreso, «Estoy lista para la misión»).
4. **FASE 4** — Motor de actividades, quizzes y evidencias (estados, adjuntos, feedback docente).
5. **FASE 5** — Dashboard profesor + registro de participación.
6. **FASE 6** — Modo proyección interactiva (`/projection/:classId`).
7. **FASE 7** — Portal evaluador + materiales + DUA + calendario administrativo.
8. **FASE 8** — Gamificación (medallas sobrias, sin rankings públicos).
9. **FASE 9** — Feedback cada 3 clases + analítica pedagógica.
10. **FASE 10** — Proyecto Ovalle 2035 (ABP/ApS) y Feria Ciudadana.
11. **FASE 11** — PWA/offline con cola de sincronización.

**FASES 12–16** (hardening, testing automatizado y manual, accesibilidad/perf, CI/CD) se ejecutan en paralelo a partir de la FASE 3 y se cierran antes de producción.

## 4. Funcionalidades V2 (posteriores al MVP)

- Notificaciones push por clase/plazo.
- Video-conferencia o aula sincrónica integrada (si se requiere).
- Editor colaborativo y versionado visual de contenidos por el profesor.
- Proyecto de investigación-acción: exportación de reportes institucionales (documento/PDF).
- Módulos PIE y UTP formalizados (dejados preparados en el modelo de datos).
- Correo automático de recordatorios (configurable por institución).
- Soporte multilingüe (español + inglés + mapuzugun opcional).
- Analítica predictiva opt-in con revisión humana (sin diagnósticos automáticos).
- Marketplace/servidor de recursos docentes compartidos entre profesores.

## 5. Roadmap

```
FASE 0  Discovery y arquitectura            ← ESTAMOS AQUÍ (docs aprobados)
FASE 1  Base técnica (Vue + Firebase + Clean Arch + Auth + RBAC)
FASE 2  Cursos, usuarios y estudiantes (import CSV/JSON)
FASE 3  Motor de clases + aula invertida
FASE 4  Actividades + quizzes + evidencias
FASE 5  Dashboard profesor + participación
FASE 6  Modo proyección interactiva
FASE 7  Evaluador + materiales + DUA + calendario
FASE 8  Gamificación
FASE 9  Feedback + analítica pedagógica
FASE 10 Proyecto Ovalle 2035 (ABP/ApS)
FASE 11 PWA / offline
FASE 12 Seguridad y hardening
FASE 13 Testing automatizado
FASE 14 Testing manual
FASE 15 Optimización, accesibilidad y performance
FASE 16 CI/CD y despliegue
```

Detalle completo (objetivo, historias, tareas, archivos, dependencias, pruebas, riesgos, criterios de aceptación, DoD) en `docs/PROJECT_PHASES.md`.

## 6. Estado actual

- [x] FASE 0 — documentación de arquitectura y plan.
- [x] FASE 1 — base técnica (Vue 3 + Firebase + Clean Architecture + Auth + RBAC).
- [x] FASE 2 — cursos, estudiantes e **importación de nóminas reales al emulador** (3º Medio D: 41 · 3º Medio E: 34) + dashboards + perfil + soft delete + auditoría.
- [x] FASE 3 — **motor de clases + aula invertida**: catálogo de 12 misiones, programación por curso, reproductor flipped con progreso/quiz/reflexión y botón «Estoy lista para la misión»; contenido sembrado (`content/missions/01–12`).
- [x] FASE 4 — **actividades, quizzes y evidencias**: motor de quizzes propio con corrección server-side (9 tipos de pregunta), evidencias con estados y revisión del profesor, ticket de salida.
- [x] FASE 5 — **dashboard profesor + participación**: registro en vivo (1–2 clics, escala 0–3), resumen por habilidad, dashboards de curso/clase y calendario administrativo (verde/amarillo/rojo).
- [x] FASE 6 — **modo proyección interactiva**: `/projection/:classId`, DeckPlayer con teclado/fullscreen/temporizador/revelar, votación digital y manual (sin dispositivos), token de proyección y editor de diapositivas.
- [x] FASE 7 — **evaluador + materiales + DUA**: versiones GENERAL/DUA, envío a revisión, portal del evaluador aislado (comentarios/aprobación/historial).
- [x] FASE 8 — **gamificación**: 10 medallas con criterios, otorgamiento automático y manual (sin nota ni rankings), galería y mensajes positivos.
- [x] FASE 9 — **feedback cada 3 clases + analítica**: feedback privado/anónimo (clases 1/4/7/10), tendencias docentes y analítica descriptiva con alertas simples.
- [x] FASE 10 — **proyecto Ovalle 2035 + ABP/ApS**: equipos, proyecto de 11 campos, evaluación con rúbrica (docente/autoevaluación/coevaluación) y feria.
- [x] FASE 11 — **PWA/offline**: instalable, caché de shell + lectura offline (persistencia local) y cola de sincronización con estados SINCRONIZADO/PENDIENTE/ERROR.
- [x] FASE 12 — **seguridad y hardening**: rate limiting, auditoría completa, App Check, límites de entrada y reglas R1–R18.
- [ ] FASE 13 — testing automatizado completo (Playwright E2E) (siguiente hito).

> ⚠️ **Regla de avance:** no iniciar FASE 4 hasta tu revisión de este hito (ver `docs/CHANGELOG.md` y `docs/PROJECT_PHASES.md`).
