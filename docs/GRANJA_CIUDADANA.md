# Granja Ciudadana — Plan de implementación por fases + documentación

Sistema de farmeo, inventario, personalización y quiz de conceptos, construido sobre la
arquitectura limpia del monorepo. Este documento es a la vez **plan de implementación
(fases + checklists)** y **documentación de referencia**.

**Versión de la actualización:** `0.20.0` (ver `docs/CHANGELOG.md`).

**Leyenda:** ✅ hecho · 🟡 hecho pero pendiente de ejecutar/verificar · ⬜ pendiente · ⛔ bloqueante de producción.

> Regla de oro: **no se despliega a producción sin completar la Fase 12 (verificación
> local con emuladores) y la Fase 11 (e2e) en verde.**

---

## Resumen ejecutivo

| # | Fase | Estado |
|---|---|---|
| 0 | Diseño y modelo de datos | ✅ |
| 1 | Shared: tipos, catálogo y quiz | ✅ |
| 2 | Domain: lógica pura | ✅ |
| 3 | Application: puertos y casos de uso | ✅ |
| 4 | Infrastructure: repositorios y helper de XP | ✅ |
| 5 | Cloud Functions y reglas de Firestore | ✅ |
| 6 | Contenido y seed | ✅ |
| 7 | Web: composable, vistas y rutas | ✅ |
| 8 | Catálogos visuales expandidos (avatares, loaders, iconos) | ✅ |
| 9 | Tests unitarios, typecheck, lint y build | ✅ |
| 10 | Otorgamientos del docente (medallas manuales y regalos) | ✅ |
| 11 | E2E (UI) | ✅ |
| 12 | Verificación local con emuladores | ✅ |
| 13 | Versionado y CHANGELOG | ✅ |
| 14 | Deploy a producción | ✅ |
| 15 | Post-deploy y monitoreo | 🟡 |

---

## Fase 0 — Diseño y modelo de datos ✅

- [x] Diagnóstico del sistema actual (XP derivado, badges, quizzes, avatar/loader/iconos).
- [x] Definición del bucle de farmeo (plantar → crecer → cosechar → comprar → mejorar).
- [x] Definición de categorías y perks (7 categorías, 6 tipos de perk).
- [x] Definición de la condición de victoria (**Cosecha Dorada**).
- [x] Decisión de persistencia **server-authoritative** (Firestore + Cloud Functions).
- [x] Definición del quiz de conceptos por nivel con bono de XP.
- [x] Regla del tope **100%** para pasar de nivel.

---

## Fase 1 — Shared: tipos, catálogo y quiz ✅

Archivos: `packages/shared/src/farm.ts`, `packages/shared/src/concept-quiz.ts`,
`packages/shared/src/index.ts`.

- [x] Tipos `FarmState`, `FarmPlot`, `InventoryEntry`, `FarmItem`, `FarmPerk`,
      `FarmSnapshot`, `FarmRewards`, `FarmActionResult`, `BuyFarmItemResult`.
- [x] Catálogo `FARM_CATALOG` (49 objetos) + `FARM_ITEM_BY_ID`, `FARM_CROPS`.
- [x] Orden y etiquetas de categorías (`FARM_CATEGORY_ORDER`, `FARM_CATEGORY_LABELS`).
- [x] Tipos del quiz: `ConceptQuiz`, `ConceptQuestion`, `ConceptQuizPublic`,
      `ConceptQuizResult`, `CONCEPT_QUIZ_MAX_LEVEL`.
- [x] Exportación desde `index.ts`.

---

## Fase 2 — Domain: lógica pura ✅

Archivo: `packages/domain/src/farm/farm.ts` (+ `farm.test.ts`).

- [x] `XP_PER_LEVEL`, `progressFromXp` con **tope 100%**, `levelFromXp`.
- [x] `plotCapacityForLevel`, `effectivePlotCapacity`, `syncPlots`.
- [x] `defaultFarmState` (monedas/semillas iniciales, casillas).
- [x] `aggregatePerks`, `perksForState`, `growthDurationMs`, `readyAtFor`, `isPlotReady`.
- [x] `harvestRewards`, `canBuy`, `canPlant`, `checkGoldenHarvest`, `conceptXpAward`,
      `addInventoryEntry`.
- [x] Export desde `packages/domain/src/index.ts`.
- [x] 11 tests de dominio en verde.

---

## Fase 3 — Application: puertos y casos de uso ✅

Archivos: `packages/application/src/ports.ts`,
`packages/application/src/farm/farm.use-case.ts` (+ test), `index.ts`.

- [x] Puertos `FarmRepository`, `ConceptQuizRepository`.
- [x] `GetFarmUseCase` (crea/refresca `activityXp` cacheado).
- [x] `PlantSeedUseCase`, `HarvestPlotUseCase`, `BuyFarmItemUseCase`,
      `EquipFarmItemUseCase`.
- [x] `GetConceptQuizUseCase` (sanea respuestas), `SubmitConceptQuizUseCase`
      (califica, premia una sola vez).
- [x] Autorización `assertFarmAccess` (solo la propia estudiante escribe; docentes leen).
- [x] 6 tests de casos de uso en verde.

---

## Fase 4 — Infrastructure: repositorios y helper de XP ✅

Archivos: `packages/infrastructure/src/firebase/farm-repositories.ts`,
`packages/infrastructure/src/firebase/gamification.ts`, `index.ts`.

- [x] `FirestoreFarmRepository` (`farms/{uid}`) con conversor.
- [x] `FirestoreConceptQuizRepository` (`conceptQuizzes/{level}`).
- [x] `computeActivityXp(...)` extraído y compartido con `getStudentGamification`.
- [x] Export desde `index.ts`.

---

## Fase 5 — Cloud Functions y reglas de Firestore ✅

Archivos: `functions/src/index.ts`, `firestore.rules`.

- [x] Callables: `getFarm`, `plantSeed`, `harvestPlot`, `buyFarmItem`, `equipFarmItem`,
      `getConceptQuiz`, `submitConceptQuiz` (con `rateLimit` y `assertCourse`).
- [x] `getStudentGamification` suma `bonusXp` + `breakdown.farm`, `progressToNext ≤ 100`.
- [x] Instanciación de repos y casos de uso en el arranque de Functions.
- [x] Reglas: `farms/{uid}` (lee la propia estudiante; escribe solo el servidor),
      `conceptQuizzes/{level}` (solo servidor).
- [x] `npm run build:functions` (bundle esbuild) OK.

---

## Fase 6 — Contenido y seed ✅

Archivos: `content/concept-quizzes.json`, `scripts/src/seed-content.ts`.

- [x] 12 niveles × 10 preguntas = **120 preguntas** de conceptos clave, alineadas a las
      12 misiones.
- [x] Seed a `conceptQuizzes/{level}` en `seed-content.ts`.
- [x] JSON validado (parseo correcto).

---

## Fase 7 — Web: composable, vistas y rutas ✅

Archivos: `apps/web/src/composables/useFarm.ts`, `features/farm/FarmView.vue`,
`features/farm/ConceptQuizView.vue`, `router/index.ts`, `App.vue`,
`services/importApi.ts`.

- [x] `useFarm` (estado reactivo, `load/plant/harvest/buy/equip`, loading/busy/error).
- [x] Wrappers de callables tipados en `importApi.ts`.
- [x] `FarmView.vue`: estadísticas, barra de nivel, parcela con temporizadores, tienda,
      inventario, perks, cosecha dorada y personaje con cosméticos.
- [x] `ConceptQuizView.vue`: preguntas, envío, resultado y explicaciones.
- [x] Rutas `/student/farm` y `/student/farm/concept/:level` (rol ESTUDIANTE).
- [x] Enlace "Granja" en la navegación del estudiante.
- [x] `build:web` OK (chunks `FarmView` y `ConceptQuizView` generados).
- [x] **Notificaciones de recompensas (toasts)**: sistema global (`useNotify.ts` +
      `AppToasts.vue`) que avisa **cada ganancia con su cantidad**: cosecha
      (+monedas/+XP/+semillas), desafío de conceptos (+XP), quiz individual (**+25 XP**
      exacto vía `submitQuizAttempt`), medallas (+15 XP c/u), medalla de misión, compras,
      regalos del docente (avatar/objeto/monedas) y **subida de nivel**.
- [x] **Regalos en vivo**: `useFarmWatch.ts` escucha `farms/{uid}` con `onSnapshot` y
      notifica los `FarmNotice` que genera `teacherGrant`, sin recargar.

---

## Fase 8 — Catálogos visuales expandidos ✅

- [x] Avatares: **10 → 29** estilos DiceBear (`useAvatar.ts`).
- [x] `Avatar.vue`: muestra vestimenta y accesorios equipados.
- [x] Loaders: **4 → 10** (`sparkle`, `leaf`, `wave`, `gear`, `coin`, `rocket`).
- [x] Iconos: **+44 SVG** (`seed`, `coin`, `shop`, `sword`, `crown`, `farm`, `tractor`,
      `flask`, `scales`, `rocket`, …).

---

## Fase 9 — Tests unitarios, typecheck, lint y build ✅

- [x] `pnpm typecheck` (web + server) OK.
- [x] `pnpm test` unitarias: **249** pasan (11 dominio granja + 6 casos de uso).
- [x] `lint` de todos los archivos nuevos: 0 errores/0 warnings.
- [x] `npm run build:web` OK.
- [x] `npm run build:functions` OK.
- [ ] (Opcional) `pnpm test:coverage` sin romper umbrales (domain/application).

> Nota: `npm run lint` global reporta warnings **preexistentes** en archivos no tocados
> (`ExitTicketView`, `StudentActivitiesView`, etc.). No forman parte de esta actualización.

---

## Fase 10 — Otorgamientos del docente (medallas manuales y regalos) ✅

El docente puede reconocer **comportamiento, colaboración, mérito y más** con medallas
manuales, y **regalar avatares premium, objetos de la granja y monedas/semillas**.

- [x] Tipos: `BadgeCategory` (`logro`, `comportamiento`, `colaboracion`, `merito`,
      `especial`), `BADGE_CATEGORY_LABELS` y criterio `MANUAL` (nunca se otorga automático).
- [x] 10 medallas manuales nuevas en `content/badges.json` (convivencia, puntualidad,
      colaboración, trabajo en equipo, apoyo entre pares, mérito, esfuerzo, creatividad,
      estrella de la semana, reconocimiento del docente). Total del catálogo: **32**.
- [x] Catálogo de avatares movido a `packages/shared/src/avatar.ts` con flag `premium`
      (17 base + 12 premium) y helpers `availableAvatarStyles` / `isAvatarStyleAvailable`.
- [x] `FarmState.unlockedAvatarStyles` (avatares premium regalados).
- [x] Caso de uso `TeacherGrantUseCase` (avatar / item / currency) con `assertStaff`.
- [x] Callable `teacherGrant` (solo PROFESOR/ADMIN/MASTER del curso; `rateLimit`).
- [x] `getStudentGamification` devuelve `unlockedAvatarStyles`.
- [x] Web: tarjeta **Regalos** en `StudentProfileView.vue`; medallas agrupadas por
      categoría (`optgroup`); el selector de avatar del estudiante bloquea los premium
      no regalados ("🔒 Regalo del profe").
- [x] Tests de `TeacherGrantUseCase` (regala avatar/objeto/monedas; rechaza a estudiantes).
- [x] `build:functions` OK.

## Fase 11 — E2E (UI) ✅

Archivo: `e2e/farm.spec.ts` (requiere emuladores + seeds).

- [x] Spec: parcela + plantar, tienda + compra real (objeto asequible), inventario y
      desafío de conceptos (10 preguntas, envío y resultado).
- [x] Login actualizado en `e2e/helpers.ts` al flujo vigente (estudiante por nombre + RUT;
      staff por email/contraseña).
- [x] `npx playwright test e2e/farm.spec.ts` → **2 passed**.
- [x] La cosecha en tiempo real se movió a la verificación backend (Fase 12) para evitar
      flakiness por la espera de crecimiento; el e2e cubre la UI de plantado/tienda.

> El spec es **tolerante a estados ya sembrados** (cultivos plantados, objetos comprados,
> quiz aprobado), para poder re-ejecutarlo.

---

## Fase 12 — Verificación local con emuladores ✅

**Ejecutada y en verde.** Evidencia: `pnpm verify:farm` → **9/9** y
`npx playwright test e2e/farm.spec.ts` → **2 passed**.

- [x] Levantar emuladores: `firebase emulators:start --only auth,firestore,functions`.
- [x] Sembrar contenido: `pnpm seed:content` (incluye `conceptQuizzes` y medallas manuales).
- [x] Sembrar cursos y usuarios: `pnpm seed:courses`, `pnpm seed:demo-teacher`,
      `pnpm seed:students-auth -- --test=3` (estudiantes de prueba con RUT).
- [x] Levantar la web: `pnpm dev:web` (lo levanta Playwright).
- [x] **Login estudiante** y abrir **Granja**.
- [x] **Plantar** un cultivo, esperar a que madure y **cosechar** → `+10🪙 +1🌰 +4XP`.
- [x] **Comprar** un objeto (`tool-hoe`, 70 → 20 monedas) y verificar inventario.
- [x] Verificar que la **barra de nivel nunca supera el 100%** (`progressToNext ≤ 100`).
- [x] Completar el **Desafío de conceptos** (10 preguntas) y ver el resultado.
- [x] Verificar **reglas**: escritura directa de la estudiante a `farms/{uid}` → **HTTP 403**.
- [x] Regalos del docente: `teacherGrant` de **avatar premium** y **monedas** verificados.
- [x] Ejecutar **e2e**: `npx playwright test e2e/farm.spec.ts` → 2 passed.

> Script de verificación: `scripts/src/verify-farm.ts` (`pnpm verify:farm`). Llama a los
> callables reales con auth real del emulador y comprueba la regla de Firestore.
> `typecheck` (web + server) y `build:web` también en verde.

---

## Fase 13 — Versionado y CHANGELOG ✅

- [x] `package.json` (raíz) y `apps/web/package.json` → `0.20.0`.
- [x] Entrada `## [0.20.0]` en `docs/CHANGELOG.md` con Added/Changed/Security/Tests.
- [x] Este documento como plan por fases.

---

## Fase 14 — Deploy a producción ✅

**Desplegado el 2026-09-13 · commit `dc934b8` · https://ciudadania-lab.web.app**

- [x] Plan Blaze y Cloud Functions/Cloud Build activos (58+ funciones v2 en `us-central1`).
- [x] **Seed dirigido** `pnpm seed:farm -- --prod` → 32 medallas + 12 desafíos de conceptos.
      *Se evitó `seed:content --prod` para no sobrescribir 37 materiales (16 editados) ni las
      13 presentaciones de producción.*
- [x] `npm run build:functions` (bundle esbuild con aliases).
- [x] `firebase deploy --only firestore:rules` (incluye `farms` y `conceptQuizzes`).
- [x] `firebase deploy --only functions` (nuevas: `getFarm`, `plantSeed`, `harvestPlot`,
      `buyFarmItem`, `equipFarmItem`, `getConceptQuiz`, `submitConceptQuiz`, `teacherGrant`).
- [x] `npm run build:web` (sin referencias a emuladores) + `firebase deploy --only hosting`.
- [x] **Smoke test** con cuenta demo: login ✓, `getFarm` (nivel 1, 60 monedas) ✓,
      `getConceptQuiz` (10 preguntas) ✓, `getStudentGamification` ✓.

## Fase 15 — Post-deploy y monitoreo 🟡

- [x] Smoke test funcional (Fase 14).
- [x] Revisar logs de Functions: **sin errores**. Se ven `getFarm`, `getConceptQuiz`,
      `getStudentGamification` (verificación de callable OK) y `studentHeartbeat` activo
      cada ~60 s (sesión de estudiante en producción).
- [x] Latencia de acciones: verificaciones del smoke en **< ~150 ms**.
- [x] **Costos/lecturas de Firestore reducidos** (~15–20×): `computeActivityXp` y
      `FirestoreActivityStatsRepository` ahora consultan **por estudiante** (~150 lecturas
      vs ~2 150). Ver `docs/COSTOS_FIRESTORE.md`. Desplegado y verificado (12/12 + E2E).
- [ ] Comunicar a estudiantes el nuevo espacio "Granja" (mensaje en
      `docs/MENSAJE_GRANJA_ESTUDIANTES.md`).

---

## Fase 15 — Post-deploy y monitoreo ⬜

- [ ] Revisar logs de Functions (errores de `getFarm`/acciones).
- [ ] Verificar latencia de las acciones de granja (deben ser rápidas: `activityXp` cacheado).
- [ ] Revisar costos/lecturas de Firestore.
- [ ] Comunicar a estudiantes el nuevo espacio "Granja".

---

# Documentación de referencia

## 1. El bucle de farmeo

1. La estudiante gana **XP** con sus misiones (aula invertida, quizzes, evidencias,
   participación, tickets y medallas).
2. Al abrir la granja, ese XP se **cachea** en su parcela (`getFarm`).
3. Con **semillas** planta **cultivos**; crecen en tiempo real.
4. Al **cosechar** gana **monedas**, **semillas** y **XP de granja**.
5. Con **monedas** compra objetos con **perks** pasivos.
6. El **quiz de conceptos** de cada nivel otorga XP la primera vez que se aprueba.
7. **Cosecha Dorada**: todas las casillas + 30 cosechas + al menos un legendario.

Niveles: `level = floor(xp / 150) + 1`, `progressToNext = min(100, round((xp % 150) / 150 * 100))`.

## 2. Categorías y perks

| Categoría | Rol | Perks típicos |
|---|---|---|
| `crop` | Cultivos | rinden monedas/XP |
| `npc` | Ayudantes | `seed_bonus`, `growth_speed`, `xp_bonus`, `unlock_plot`, `concept_hint` |
| `tool` | Herramientas | `growth_speed`, `coin_bonus`, `seed_bonus` |
| `weapon` | Talismanes | `xp_bonus`, `coin_bonus`, `growth_speed` |
| `clothing` | Vestimenta | `coin_bonus`, `xp_bonus`, `growth_speed` |
| `accessory` | Accesorios | `xp_bonus`, `coin_bonus`, `seed_bonus`, `growth_speed` |
| `decoration` | Decoración | `growth_speed`, `coin_bonus`, `unlock_plot` |

Los perks aplican **al poseer** el objeto; **equipar** es cosmético.

## 3. Modelo de datos Firestore

| Ruta | Contenido | Acceso |
|---|---|---|
| `farms/{uid}` | `FarmState` (coins, seeds, plots, inventory, equipped, activityXp, bonusXp, conceptLevelsPassed, totalHarvests, goldenHarvest) | lee la propia estudiante; escribe solo el servidor |
| `conceptQuizzes/{level}` | `ConceptQuiz` con respuestas | solo servidor |

## 4. Callables

`getFarm`, `plantSeed`, `harvestPlot`, `buyFarmItem`, `equipFarmItem`,
`getConceptQuiz`, `submitConceptQuiz` y `teacherGrant`. `getStudentGamification`
incluye `bonusXp`, `breakdown.farm` y `unlockedAvatarStyles`. Las medallas se
otorgan con `awardBadge` (manual) y `awardMissionBadge` (automática de misión).

## 4.1 Otorgamientos del docente

- **Medallas manuales** (`criterion.kind = "MANUAL"`): comportamiento, colaboración,
  mérito y especiales. Se agrupan por `Badge.category` en el `optgroup` de
  `StudentProfileView.vue`. Nunca se otorgan automáticamente.
- **Regalos** (`teacherGrant`, solo PROFESOR/ADMIN/MASTER del curso):
  - `kind: "avatar"` + `styleId` → desbloquea un avatar **premium**.
  - `kind: "item"` + `itemId` → agrega un objeto al inventario de la granja.
  - `kind: "currency"` + `coins`/`seeds` → regala monedas y/o semillas.
- El estudiante ve los avatares premium bloqueados ("🔒 Regalo del profe") hasta
  que el docente se los regala.

## 4.2 Notificaciones de recompensas

`apps/web/src/composables/useNotify.ts` + `apps/web/src/components/ui/AppToasts.vue`
(toasts flotantes, montados en `App.vue`, `aria-live="polite"`, autocierre 6 s).

| Evento | Aviso |
|---|---|
| Cosecha | "Cosechaste {cultivo}" · +N 🪙 · +N XP · +N 🌰 |
| Desafío de conceptos | "¡Desafío aprobado!" · +N XP |
| Quiz individual | "¡Quiz aprobado!" · puntaje, % y **+25 XP** (0 si ya estaba aprobado) |
| Medalla (auto) | "¡Ganaste medallas nuevas!" · nombres · +15 XP c/u |
| Medalla de misión | "¡Ganaste la medalla «X»!" |
| Compra en tienda | "Compraste {objeto}" · -N monedas |
| Regalo del docente | "¡Tu profe te regaló un avatar/objeto/monedas!" · **en vivo** |
| Subida de nivel | "¡Subiste al nivel N!" |

El **XP exacto del quiz** viene en la respuesta de `submitQuizAttempt`
(`{ attempt, xpAwarded }`, con `quizXpAward` en dominio). Los **regalos del docente** se
notifican **en vivo**: `teacherGrant` agrega un `FarmNotice` al estado y la web escucha
`farms/{uid}` con `onSnapshot` (`useFarmWatch.ts`) para avisar apenas llegan, incluso con
la pestaña abierta. Las reglas permiten a la estudiante leer su propio documento.

## 5. Cómo extender

- **Nuevo objeto:** entrada en `FARM_CATALOG` (`id`, `category`, `cost`, `levelRequired`,
  `perk?`). La tienda y los perks lo toman automáticamente.
- **Nuevo cultivo:** `category: "crop"` con `seedCost`, `growthSeconds`, `yieldCoins`, `yieldXp`.
- **Nuevo nivel de conceptos:** agregar objeto a `content/concept-quizzes.json`, actualizar
  `CONCEPT_QUIZ_MAX_LEVEL` si corresponde y volver a sembrar.
- **Economía:** `XP_PER_LEVEL`, `BASE_PLOT_CAPACITY`, `MAX_PLOTS`, `GOLDEN_HARVEST_TARGET`
  en `packages/domain/src/farm/farm.ts`.

## 6. Comandos útiles

```bash
pnpm typecheck        # web + server
pnpm test             # unitarias
pnpm verify:farm      # verificación backend local (emuladores + seeds)
pnpm test:e2e         # e2e (requiere emuladores + seeds)
pnpm seed:content     # contenido, incluye conceptQuizzes
pnpm dev:web          # web en local
npm run build:web
npm run build:functions
```
