# Despliegue y CI/CD

## 1. Entornos

| Entorno | Firebase project (sugerido) | Dominio sugerido | Uso |
|---|---|---|---|
| `development` | `pclab-dev` | localhost (Emulator) | desarrollo local |
| `test` | `pclab-test` | — | CI (rules, integración, E2E) |
| `staging` | `pclab-staging` | `staging-providenciaciudadanialab.web.app` | validación pedagógica |
| `production` | `pclab-prod` | `providenciaciudadanialab.web.app` (o dominio institucional) | colegio |

- Configuración en `.firebaserc` y `firebase.json` (hosting, functions, firestore, storage, emulator).
- Proyectos separados evitan que reglas/datos de staging afecten producción.

## 2. Estructura del repositorio y Git

```
main            producción estable (deploy manual o por tag)
develop         integración continua (deploy a staging)
feature/*       ramas por historia (PR hacia develop)
```

Commits semánticos: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`. Protección: PR obligatorio + revisión; main protegido.

## 3. Pipeline GitHub Actions

### Workflow A — PR (pull_request)
1. `lint` (ESLint + Prettier)
2. `typecheck` (vue-tsc)
3. `unit` + `component` (Vitest)
4. `rules` tests (Emulator)
5. `build` (Vite)
6. `npm audit` (dependencias)

### Workflow B — push a develop
1. Todo lo anterior
2. E2E Playwright contra staging emulado (o build preview)
3. a11y (axe)
4. Deploy a **staging**

### Workflow C — tag/release (`v*`) a main
1. Todas las suites
2. Validación manual del plan (`docs/MANUAL_TEST_PLAN.md`)
3. Deploy a **production** (hosting + functions + firestore rules + storage rules + indexes)
4. Versionado de contenido: seed de `content/` al proyecto de producción (solo contenido aprobado)

## 4. Despliegue local / manual

```bash
# desarrollo con emuladores
pnpm dev            # frontend
pnpm emulator       # Emulator Suite (auth, firestore, storage, functions)

# build y preview
pnpm build && pnpm preview

# deploy por entorno
pnpm deploy:staging
pnpm deploy:prod
```

## 5. Reglas de despliegue

1. Nunca deploy de rules/Storage sin tests de reglas verdes.
2. Los seeds de contenido requieren revisión (nunca en PR automático a producción sin aprobación).
3. Variables por entorno en `.env.*`; secretos en GitHub Secrets.
4. App Check habilitado en staging y producción (clave web añadida).
5. Auditoría de deploys: changelog + tag; rollback documentado (deploy de versión anterior).
6. `firebase deploy --only hosting:prod,functions:prod` con confirmación explícita.

## 6. Observabilidad

- Logger central (info/warn/error) sin secretos ni datos privados.
- Métricas de error opcionales (Sentry) solo con datos agregados y sin PII.
- Revisión de logs de Functions para rate limiting y errores 5xx en staging.
