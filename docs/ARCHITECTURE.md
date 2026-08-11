# Arquitectura — Providencia Ciudadanía Lab

## 1. Principios

- **Clean Architecture** en capas: `domain` → `application` → `infrastructure` → `presentation`. Las dependencias apuntan hacia adentro (domain no conoce a Firebase ni a Vue).
- **Monorepo** con paquetes tipados y código compartido entre frontend y backend (tipos de dominio, DTOs, constantes).
- **Sin lógica de negocio en componentes Vue**: los componentes solo coordinan presentación; llaman a composables → use-cases → repositorios.
- **Firebase como infraestructura**: repositorios implementan puertos (`ports`) definidos en application/domain.
- **Contenido separado del código** (ver `docs/CONTENT_MODEL.md`).
- **Defensa en profundidad**: reglas Firestore + custom claims + validación server-side + sanitización.

## 2. Diagrama lógico

```
┌─────────────────────────────── PWA (Vue 3 + Vite) ──────────────────────────────┐
│  presentation/                                                                    │
│   views (rutas) · components/features (por dominio) · layout · proyección        │
│        │ usa                                                                      │
│  composables/  →  use-cases (application)  →  ports (interfaces)                 │
│                                                     │ implementa                │
│  infrastructure/                                                                 │
│   firebase/ (auth, firestore repos, storage, functions client, emulator)        │
│   offline/ (idb cache + sync queue + service worker)  · logger · sentry(opt)     │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                 │ HTTPS (SDK web con reglas) / Functions callable
┌───────────────────────────────▼─────────────────────────────────────────────────┐
│ Firebase                                                                           │
│  Auth (+custom claims) · App Check · Firestore (rules) · Storage (rules)          │
│  Hosting (PWA estática) · Functions (callable: user mgmt, claims, imports,        │
│  audit, sanitización, rate limiting, sync server) · Emulator Suite (dev/test)     │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                 │
┌───────────────────────────────▼─────────────────────────────────────────────────┐
│ CI/CD — GitHub Actions · lint · typecheck · unit/component · rules tests ·      │
│ Playwright · build · deploy Firebase (staging/prod)                               │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Flujo de datos de un caso de uso (ej. «enviar evidencia»):

```
Vista (form) → composable useSubmitEvidence → SubmitEvidenceUseCase (application)
  → port EvidenceRepository → FirestoreEvidenceRepository (infrastructure)
  → validateSubmission (domain rules) + sanitizar adjuntos
  → escritura con reglas Firestore (verifica courseId + studentId)
  → auditLog (functions) → actualiza progreso e insignias (use-cases / funciones)
```

## 3. Estructura de directorios

```
providencia/
├─ apps/
│  ├─ web/                            # PWA Vue 3 + TS + Vite
│  │  ├─ src/
│  │  │  ├─ main.ts
│  │  │  ├─ App.vue
│  │  │  ├─ router/                   # Vue Router + guard de roles
│  │  │  ├─ views/                    # páginas por rol (student, teacher, evaluator, admin, master, projection)
│  │  │  ├─ features/                 # por dominio, cada uno autocontenido
│  │  │  │  ├─ auth/  courses/  students/  classes/  flipped/  activities/
│  │  │  │  ├─ quizzes/ games/ evidence/ participation/ materials/
│  │  │  │  ├─ evaluation/ badges/ feedback/ exitTickets/ projection/
│  │  │  │  ├─ analytics/ reports/ admin/ audit/ notifications/ offlinesync/
│  │  │  ├─ components/               # design system (ui/)
│  │  │  ├─ composables/
│  │  │  ├─ stores/                   # Pinia (session, course, ui, offline)
│  │  │  ├─ styles/                   # tokens, design tokens
│  │  │  └─ types/                    # tipos de UI re-exportados desde domain
│  │  └─ public/  sw.ts  vite.config.ts  ...
│  └─ (futuro: apps/mobile si se requiere)
├─ functions/                         # Cloud Functions (Node + TS)
│  └─ src/ (auth triggers, callables: userManagement, claims, importStudents,
│            sanitizeContent, audit, rateLimit, sync, projectionToken)
├─ packages/
│  ├─ domain/                         # entidades puras, value objects, reglas
│  ├─ application/                    # use-cases + ports (interfaces)
│  ├─ infrastructure/                 # implementaciones (compartidas donde aplique)
│  └─ shared/                         # constantes, enumerados, utilidades puras
├─ content/                           # seeds de contenido educativo (JSON por misión) — SEPARADO del código
│  └─ missions/01-12/ (flipped, slides, quizzes, games, materials, rubrics)
├─ scripts/                           # seed, import CSV/JSON, lint de contenido
├─ tests/                             # e2e Playwright, rules tests, a11y
├─ docs/
├─ .github/workflows/
├─ .env.example  .firebaserc  firebase.json  firestore.rules  storage.rules
├─ package.json  pnpm-workspace.yaml (o workspaces npm)
└─ README.md
```

## 4. Capas y responsabilidades

| Capa | Contenido | Depende de | Regla |
|---|---|---|---|
| `domain` | Entidades (Course, Student, Class, Quiz, Evidence…), value objects, reglas de negocio puras (scoring, disponibilidad, estados). | nada | Sin import de Vue/Firebase |
| `application` | Use-cases por acción + puertos (interfaces de repositorio). Orquestación, autorización de caso de uso, mapeo. | domain | Sin Firebase |
| `infrastructure` | Implementaciones: Firebase Auth/Firestore/Storage/Functions, cola offline (IndexedDB + Service Worker), logger, rate limit client. | application ports | Sin lógica de negocio |
| `presentation` | Vue views, features, design system, stores (estado UI), rutas. | application (composables) | Sin reglas de negocio |

## 5. Decisiones técnicas (ADR resumidas)

1. **Monorepo npm/pnpm workspaces** con `packages/{domain,application,infrastructure,shared}` para compartir tipos y reglas entre web y functions.
2. **Custom claims** para rol y `courses[]` (evita lectura extra en cada pantalla); Firestore rules como control real.
3. **Escrituras sensibles vía Cloud Functions callable** (importación de estudiantes, gestión de usuarios/claims, envío a revisión, aprobación, auditoría) para validación y rate limiting server-side.
4. **Contenido estructurado como datos** (bloques JSON sanitizados) en Firestore; el editor de slides guarda bloques, no HTML.
5. **Offline**: Service Worker (workbox) + IndexedDB para respuestas en cola; IDs generados en cliente con prefijo `local-` y reconciliación idempotente en sincronización.
6. **Proyección**: ruta propia, pantalla completa, eventos de teclado, componente `DeckPlayer` que renderiza bloques; token de proyección para alumnos sin cuenta.
7. **Auditoría** escrita solo desde Functions con `admin` y formato fijo.
8. **Estados/errores**: plantillas globales (loading, error, empty, retry, offline, 403, 404) en el design system.

## 6. Preguntas de arquitectura a validar con el usuario

- ¿Prefieres pnpm o npm workspaces? (se recomienda pnpm por velocidad de instalación en CI.)
- ¿Firebase projects separados por entorno o un solo project con `projectId` por entorno vía `.firebaserc`? (se recomienda separados: `pclab-dev`, `pclab-test`, `pclab-staging`, `pclab-prod`.)
- ¿Backend solo con Cloud Functions v2 (callable) o agregar Express alojado? (recomendado: solo Functions v2; mantener stack serverless.)
- ¿Fuente de datos oficiales para mapas/gráficos (INE, BCN)? Se definirá en contenido con licencia verificada.
