# AGENTS.md — Guía para agentes y colaboradores

Providencia Ciudadanía Lab — PWA educativa "Observatorio Ciudadano · Ovalle 2035".
Monorepo TypeScript: **Vue 3 + Vite** (web), **Firebase** (Auth, Firestore, Functions, Hosting)
y arquitectura limpia por capas. Proyecto Firebase: **`ciudadania-lab`**.

## Estructura

```
apps/web/                 # Vue 3 + Vite (features/, components/ui/, composables/, stores/)
packages/shared/          # Tipos y constantes (@pclab/shared) — sin dependencias
packages/domain/          # Lógica pura y testeable (@pclab/domain)
packages/application/     # Casos de uso + puertos (@pclab/application)
packages/infrastructure/  # Adaptadores Firebase/xlsx (@pclab/infrastructure)
functions/                # Cloud Functions v2 (callables) — src/index.ts
scripts/                  # Seeds, importación y utilidades (tsx / python)
content/                  # Contenido editable (clases, quizzes, badges, manuales…)
docs/                     # Documentación; docs/manuales/*.pdf son manuales de usuario
e2e/                      # Playwright
```

Dirección de dependencias: `shared → domain → application → infrastructure` y
`apps/web` / `functions` consumen todas. **Nunca** hagas que las capas de arriba
dependan de las de abajo.

## Comandos

```bash
# Calidad
pnpm typecheck            # web + server
pnpm lint                 # ESLint (max-warnings 0)
pnpm test                 # unitarias (domain/application/web)
pnpm test:e2e             # Playwright (requiere emuladores + seeds)

# Desarrollo
pnpm dev                  # web en http://localhost:5199
pnpm emulator             # Firebase emulators (auth, firestore, functions, storage, ui)

# Seeds
pnpm seed:content         # clases, quizzes, badges, conceptQuizzes, materiales, etc.
pnpm seed:courses
pnpm seed:demo-teacher / seed:demo-student / seed:demo-evaluator / seed:demo-pie / seed:demo-utp
pnpm seed:students-auth -- --test=3   # estudiantes de prueba (clave = RUT sin puntos)
pnpm seed:farm            # seed dirigido y seguro (badges + conceptQuizzes)

# Verificación local de la Granja (emuladores arriba + seeds)
pnpm verify:farm          # llama a los callables reales y valida reglas/XP/bonos

# Build y deploy
npm run build:web         # vue-tsc + vite build (usa apps/web/.env.production en prod)
npm run build:functions   # bundle esbuild con aliases a los paquetes
firebase deploy --only firestore:rules --project ciudadania-lab
firebase deploy --only functions --project ciudadania-lab
firebase deploy --only hosting --project ciudadania-lab
```

### Verificación local completa (antes de desplegar)

```bash
# 1) Emuladores
firebase emulators:start --only auth,firestore,functions   # auth:9098, firestore:8088, functions:5002
# 2) En otra terminal, con FIRESTORE_EMULATOR_HOST=127.0.0.1:8088 y FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9098
pnpm seed:content && pnpm seed:courses && pnpm seed:demo-teacher
pnpm seed:students-auth -- --test=3
# 3) Backend + UI
pnpm verify:farm
pnpm test:e2e
```

> Nota: el emulador de Firestore a veces queda "zombie". Si falla al arrancar
> (`hub unable to start on 4400` / "unexpected error"), mata `java.exe` y los
> `node.exe` con `firebase|emulator|cloud-firestore`, y limpia los puertos
> `8088,9098,5002,4400,4401,4500,4501,9150,9151,5199` antes de reintentar.

## Convenciones

- **Idioma**: nombres visibles, comentarios y docs en **español**; código en inglés.
- **Commit**: estilo `tipo: descripción (versión)` (p. ej. `feat: … (0.20.0)`).
  Sugerencias de tipo: `feat`, `fix`, `chore`, `docs`, `perf`, `test`, `deploy`.
- **No commitear**: `2do/` (documentos generados, ~10 MB) ni credenciales
  (`3ro/*.json`, `.env.production`). Ya están en `.gitignore`.
- **Sin comentarios innecesarios** en el código; el código debe explicarse solo.
- **Server-authoritative**: los datos de estudiantes (XP, medallas, granja,
  inventario) viven en Firestore y **solo se mutan por Cloud Functions**. El
  cliente lee por repositorios y escribe llamando callables.
- **Infraestructura y runtime**: `packages/infrastructure` **no debe importar
  valores de `@pclab/domain`** en runtime (los scripts con `tsx` no resuelven el
  alias desde ahí). Si necesitas una constante, duplícala con una nota o pásala
  como parámetro.
- **Alias**: `@` → `apps/web/src`; `@pclab/*` → `packages/*/src`.
- **Índices Firestore**: revisa `firestore.indexes.json` al añadir consultas
  compuestas; las consultas por documento o de un solo campo no lo requieren.

## Cómo añadir una funcionalidad (vertical slice)

1. `packages/shared/src/<feature>.ts` (tipos/DTO) + exportar en su `index.ts`.
2. `packages/domain/src/<feature>/<feature>.ts` (lógica pura) + test + export.
3. `packages/application/src/ports.ts` (puertos) y `.../<feature>/*.use-case.ts`.
4. Adaptador en `packages/infrastructure/src/firebase/` (admin) y/o
   `apps/web/src/infrastructure/repositories.ts` (cliente, solo lectura).
5. Callable en `functions/src/index.ts` y wrapper en
   `apps/web/src/services/importApi.ts`.
6. Vista en `apps/web/src/features/<feature>/`, ruta en `apps/web/src/router/index.ts`,
   reutilizando `components/ui/*` y variables CSS de `styles/main.css`.
7. Tests colocados (`*.test.ts`) y, si aplica, e2e en `e2e/`.

## Granja Ciudadana (contexto específico)

- Catálogo de objetos en `packages/shared/src/farm.ts` (`FARM_CATALOG`).
- Estado en `farms/{uid}` (`FarmState`): monedas, semillas, parcelas, inventario,
  `layout` (posiciones colocadas), `notices`, XP de granja, etc.
- Callables: `getFarm`, `plantSeed`, `harvestPlot`, `buyFarmItem`, `equipFarmItem`,
  `saveFarmLayout`, `getConceptQuiz`, `submitConceptQuiz`, `teacherGrant`.
- **Bonos**: los objetos dan perks al poseerlos; además, **colocarlos** aporta bonus
  por categoría (`PLACED_BONUS_CATEGORY` en shared; lógica en
  `domain/farm/farm.ts` → `placementBonuses`, expuesto en `FarmSnapshot.placement`).
- Regalos del docente: `teacherGrant` agrega `FarmNotice`; la web los notifica en
  vivo con `useFarmWatch.ts` (`onSnapshot` sobre `farms/{uid}`).
- Notificaciones de recompensas: `composables/useNotify.ts` + `components/ui/AppToasts.vue`.
- Seed de producción **seguro**: `pnpm seed:farm -- --prod` (solo `badges` y
  `conceptQuizzes`). **No** uses `seed:content --prod` sin revisar: sobrescribe
  materiales y presentaciones editadas.

## Manuales de usuario

Los PDF de `docs/manuales/` se generan con ReportLab:

```bash
python scripts/generate-manuales.py   # requiere python + reportlab
```

Al cambiar la experiencia de estudiante/docente, actualiza el texto en
`scripts/generate-manuales.py` y vuelve a generar los PDF (no editar los PDF a mano).

## Documentación clave

- `docs/GRANJA_CIUDADANA.md` — diseño, fases y verificación de la Granja.
- `docs/CHANGELOG.md` — historial por versión.
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/DEPLOYMENT.md`.
- `docs/COSTOS_FIRESTORE.md` — consultas, índices y estimación de costos.
- `docs/MENSAJE_GRANJA_ESTUDIANTES.md` — mensaje listo para comunicar la Granja.
- `docs/assets/*.png` — capturas (script `scripts/screenshot-farm.mjs`).
