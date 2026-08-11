# Estrategia de testing

## 0. Estado actual (FASE 1–12, implementado)

Suite verde en este hito:

| Nivel | Archivos | Resultado |
|---|---|---|
| Unit (domain) | `packages/domain/**/*.test.ts` (… **proyectos/feedback/badges/seguridad**) | ✅ |
| Unit (application) | `packages/application/**/*.test.ts` (… **equipos/proyecto/evaluación**) | ✅ |
| Component (Vue) | … `FeedbackView`, `ProjectWizard`, `SyncBanner`, `StudentHomeView`/`StudentProfileView`, `DeckPlayer`, `EvaluatorPortal` | ✅ |
| Reglas Firestore | `tests/rules/firestore-rules.test.ts` (**R1–R18**) | ✅ 18/18 |
| Integración | `tests/integration/*.test.ts` | ✅ 29/29 |
| **Offline** | `offlineQueue.test.ts` + `SyncBanner.test.ts` | ✅ 6 |

**Total: 260 tests.** Fixtures de test con estudiantes ficticias (nunca nombres reales).

- Requisito para `test:rules` y `test:integration`: emulador de Firestore en `127.0.0.1:8088` (ver `docs/DEPLOYMENT.md` / `docs/STUDENT_IMPORT.md`).


## 1. Pirámide y herramientas

| Nivel | Herramienta | Dónde corre |
|---|---|---|
| Unit (domain/application) | **Vitest** | CI (por PR) |
| Componente (Vue) | **Vitest + Vue Test Utils + @vue/test-utils** | CI (por PR) |
| Reglas Firestore | **@firebase/rules-unit-testing** + Emulator | CI |
| Integración (Auth/Firestore/Storage/Functions) | **Emulator Suite** | CI + local |
| E2E | **Playwright** | CI (staging emulado) + manual |
| Accesibilidad | **axe-core** (playwright) + checklist manual | CI + manual |
| PWA/offline | Playwright (workbox), simulación offline | CI + manual |

> Preferir Emulator Suite siempre que sea posible; los tests nunca apuntan a producción.

## 2. Unit tests

**Domain (puro):**
- scoring de quizzes (por tipo de pregunta: múltiple, V/F, ordenar, emparejar, completar, breve).
- validador de respuesta y explicaciones posteriores.
- reglas de disponibilidad de clase (fechas, `flippedEnabled`, `status`).
- progresión/aula invertida (completar bloques → `ready`).
- transiciones de estado de evidencia (`PENDIENTE→ENTREGADO→…→REQUIERE_CORRECCION`).
- validación de material (estados evaluador, fechas −3/−7).
- gamificación: criterios de medallas (sin impacto en nota).
- participación: escala 0–3, máximos por clase.

**Application (use-cases con repositorios mock):**
- `SubmitEvidenceUseCase` (permite editar solo campos propios, impide score/status falsos).
- `ActivateClassUseCase` (solo profesor del curso).
- `ImportStudentsUseCase` (CSV/JSON, protección de datos PIE).
- `ReviewMaterialUseCase` (solo evaluador asignado; transiciones válidas).
- `SendMaterialForReviewUseCase`, `CreateProjectionTokenUseCase`.
- Autorización: cada use-case verifica rol + curso (tests de fallo incluidos).

## 3. Component tests (Vue)

- **Login** (éxito, contraseña incorrecta, error red, logout, sesión expirada).
- **StudentDashboard** (misiones visibles según disponibilidad, estados vacíos).
- **FlippedLessonPlayer** (progreso por bloques, quiz, reflexión, botón listo).
- **QuizPlayer** (individual y colectivo; temporizador; retroalimentación; explicación).
- **EvidenceForm / EvidenceCard** (estados, adjuntos, feedback docente).
- **TeacherDashboard** (resumen, gráficos sobrios, sin rankings).
- **ProjectionPlayer** (navegación, teclado, timer, reveal, votación, quiz).
- **ParticipationPanel** (marcado múltiple, escala, observaciones).
- **EvaluatorReview** (cola, comentarios, aprobar/rechazar).
- **BadgeGallery** (colección, desbloqueo).
- **Empty/loading/error/offline** states.

## 4. Integración (Emulator)

- Registro de usuario → claims → reglas.
- Repositorios Firestore (CRUD por dominio con reglas activas).
- Storage: subida validada (MIME/tamaño), URLs firmadas.
- Functions: import, claims, auditoría, sanitización de bloques, sincronización offline, token de proyección, rate limiting.

## 5. Firestore rules tests

Casos documentados en `docs/FIRESTORE_RULES.md` (R1–R18) + escenarios ampliados:
- estudiante solo accede a sus datos;
- profesor solo a sus cursos;
- evaluador solo a material autorizado;
- admin/master según dominio;
- PIE protegido;
- respuestas de quiz ocultas a estudiantes;
- escrituras sensibles solo desde server.

## 6. E2E Playwright

**FLOW 1** estudiante: login → aula invertida → quiz → evidencia → ticket de salida.
**FLOW 2** profesor: login → habilita clase → revisa perfil/evidencia → registra participación.
**FLOW 3** profesor: sube evaluación → envía a evaluador.
**FLOW 4** evaluador: revisa → comenta → solicita modificación → aprueba.
**FLOW 5** proyección: inicia presentación → pregunta → quiz → ticket.
**FLOW 6** estudiante recibe medalla (criterio automático).
**FLOW 7** feedback en clases 1/4/7/10 (anónimo configurable).
**FLOW 8** offline: responde sin conexión → reconecta → sincroniza (estados visibles).

## 7. Accesibilidad (automática + manual)

- axe-core en cada ruta principal y en componentes clave.
- Checklist: navegación por teclado, foco visible, labels, contraste, zoom 200–400%, reduced motion, lectores de pantalla (NVDA/VoiceOver), alto contraste.

## 8. PWA / offline

- Service worker registra y cachea shell.
- Simulación offline (Playwright) para aula invertida descargada y cola de respuestas.
- Verificación de estados `SINCRONIZADO/PENDIENTE/ERROR`.

## 9. Cobertura objetivo

- Domain/application: ≥ 85% lineas en paquetes críticos (quiz, evidencias, materiales, participación).
- Componentes: ≥ 70% rutas principales.
- Reglas: cobertura de todos los casos R1–R18.
- E2E: 8 flujos críticos verdes antes de cada release.

## 10. Integración en CI

Cada PR: `lint` → `typecheck` → `unit` → `component` → `rules` → `build`. En `develop` se agrega E2E + a11y contra staging emulado. En `main` (tag) se corren todas las suites + deploy.
