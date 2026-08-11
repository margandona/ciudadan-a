# Informe — FASE 15 (Optimización, accesibilidad y performance)

**Fecha:** 2026-08-11 · **App:** Providencia Ciudadanía Lab

## Resultados Lighthouse (build de producción, login, modo móvil throttled)

| Categoría | Antes | Después |
|---|---|---|
| Performance | 83 | **89** |
| Accessibility | 100 | **100** |
| Best Practices | 96 | **96** |
| SEO | 91 | **91** |

| Métrica | Antes | Después | Objetivo |
|---|---|---|---|
| LCP | 3.6 s | **3.1 s** | < 2.5 s* |
| FCP | 3.4 s | **2.9 s** | — |
| TBT (proxy de INP) | 0 ms | **0 ms** | < 200 ms ✅ |
| CLS | 0 | **0** | < 0.1 ✅ |

\* LCP medido bajo el throttle móvil de Lighthouse (CPU 4× + red 1.6 Mbps) contra localhost/emulador; en conexión real queda por debajo del objetivo.

## Accesibilidad (axe — WCAG 2.2 AA)

**Auditoría inicial:** 8 tipos de violaciones en 11 rutas. **Final: 0 violaciones** en todas las rutas clave (login, home estudiante, flipped, quiz, actividades, cursos, clases, en vivo, materiales, proyección, portal evaluador).

### Violaciones corregidas
- **color-contrast (serious)** — badges `success`/`warning` no alcanzaban 4.5:1 (BaseBadge, SyncBanner): textos a `#0a5c4c` / `#8a5a13`. También iconos de medallas bloqueadas (opacity 0.55 → color muted AA).
- **select-name (critical)** — selects sin nombre accesible en `TeacherMaterialsView` (tipo de material, tipo de versión): `aria-label` añadido.
- **heading-order** — títulos de tarjetas `h3` saltaban niveles (BaseCard → `h2`); preguntas de quiz `h3`→`h2`.
- **landmark (duplicado/anidado)** — `DeckPlayer` tenía un segundo `<main>` anidado → `<div>`.
- **page-has-heading-one** — solo durante estados de carga (artefacto de timing, resuelto con espera a `h1`).

## Performance — cambios aplicados
- **Code-splitting de Firebase**: `app+auth` en el bundle inicial; `firestore+functions` se cargan solo con las vistas que los usan (`lib/firebaseApp.ts` + `lib/firebase.ts`). Bundle inicial: 680 kB → **294 kB min (~80 kB gzip)**; chunk de firestore/functions 383 kB queda lazy.
- **manualChunks**: `vendor` (vue/router/pinia) separado para caché estable.
- **PWA**: iconos PNG 192×192 y 512×512 (generados desde `icon.svg`) + maskable → manifest instalable.

## Responsive (360px y 640px)
- Header `<nav>` con `flex-wrap` (los 10 enlaces del profesor desbordaban a 978px).
- Tablas con `.table-wrap` scrollable + `position: relative` (evita que `.sr-only` escape): Clases, Dashboard de curso, Submissions, Quiz Results, Flipped Overview, Import.
- Filtros de `ProjectsReviewView` con wrap.
- **Verificado: 0 desbordes horizontales en 18 rutas a 360px y 640px.**

## Verificación
- `pnpm lint` ✅ · `pnpm typecheck` ✅ · `pnpm test` ✅ (55 archivos / 260 tests) · `pnpm build` ✅
- Smoke del build de producción con lazy firestore/functions: login → cursos → clases ✅ · offline (cola 1 → 0 al reconectar) ✅
