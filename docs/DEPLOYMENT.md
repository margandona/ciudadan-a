# Despliegue y CI/CD

## 1. Entornos

| Entorno | Firebase project | Dominio sugerido | Uso |
|---|---|---|---|
| `development` | `ciudadania-lab` (emulador local) | localhost (Emulator Suite) | desarrollo local |
| `test` | `pclab-test` | — | CI (rules, integración, E2E) |
| `staging/preview` | `ciudadania-lab` (Hosting channels) | `ciudadania-lab--pr<N>.web.app` | validación por PR |
| `production` | `ciudadania-lab` | `ciudadania-lab.web.app` (o dominio institucional) | colegio |

> Se usa **un proyecto Firebase con Hosting channels** para preview/staging y el canal `live` para producción. Si se prefiere separar proyectos, añadir alias en `.firebaserc` y apuntar los workflows a `--project <alias>`.

## 2. Estructura del repositorio y Git

```
main            producción estable (push → deploy live)
feature/*       ramas por historia (PR → CI + preview channel)
```

- Commits semánticos: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`.
- Protección recomendada: PR obligatorio con revisión; `main` protegido.

## 3. Pipeline GitHub Actions (implementado)

### `ci.yml` — Control de calidad (PR y push a main/develop)
1. `lint` (ESLint)
2. `typecheck` (vue-tsc + tsc server)
3. `test:unit` + **cobertura** (umbrales ≥85%)
4. `build` (web + functions)
5. Rules + integración contra el **emulador** (`pclab-test`)
6. E2E Playwright + **accesibilidad (axe)** con emuladores + seeds

### `preview.yml` — PR → preview channel
1. Todo el CI (reutiliza `ci.yml` vía `workflow_call`)
2. Deploy de **Hosting channel** `pr<N>` (7 días) y comenta la URL en el PR
3. Se omite el deploy si no existe `FIREBASE_TOKEN` (el CI sigue corriendo)

### `deploy.yml` — push a `main` → producción
1. Todo el CI
2. `pnpm build:web` con variables de producción
3. `firebase deploy --only hosting,firestore:rules,firestore:indexes,storage:rules,functions`

### Variables de build (producción)

| Variable | Origen |
|---|---|
| `VITE_FIREBASE_API_KEY`, `AUTH_DOMAIN`, `PROJECT_ID`, `STORAGE_BUCKET`, `MESSAGING_SENDER_ID`, `APP_ID` | GitHub Secrets (`VITE_*`) |
| `VITE_RECAPTCHA_SITE_KEY` | GitHub Secret (clave web de **App Check**) |
| `VITE_USE_EMULATORS=false` | fijo en el workflow |

### Secretos de GitHub requeridos
- `GCP_SA_KEY` — base64 de la service account del proyecto real (`3ro/ciudadania-lab-firebase-adminsdk-fbsvc-74a3fa3055.json`, en `.gitignore`). Los workflows `deploy.yml` y `preview.yml` la decodifican y autentican vía `GOOGLE_APPLICATION_CREDENTIALS`.
- `VITE_FIREBASE_*` — configuración web de Firebase (`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MESSAGING_SENDER_ID` pendientes de agregar desde la consola).
- `VITE_RECAPTCHA_SITE_KEY` — activa **App Check** en producción (en pausa).

## 4. Despliegue local / manual

```bash
# desarrollo con emuladores
pnpm dev            # frontend (5199)
pnpm emulator       # Emulator Suite (auth 9098, firestore 8088, functions 5002, storage 9200)

# build de producción (sin emuladores) + preview local
$env:VITE_USE_EMULATORS="false"; pnpm build:web
pnpm -w @pclab/web preview

# build de medición contra emuladores locales (FASE 15)
$env:VITE_FORCE_EMULATORS="true"; pnpm build:web

# deploy por entorno (requiere FIREBASE_TOKEN o login)
firebase deploy --only hosting,firestore:rules,firestore:indexes,storage:rules,functions --project ciudadania-lab
firebase hosting:channel:deploy mi-preview --expires 7d --project ciudadania-lab
```

## 5. Reglas de despliegue

1. Nunca deploy de reglas/Storage sin tests de reglas verdes (el CI las ejecuta).
2. Los **seeds de contenido** (`content/`) se aplican contra emuladores para pruebas; a producción solo con revisión explícita (script `pnpm seed:content` con `--prod` autorizado).
3. Variables por entorno en `.env.*`; secretos en GitHub Secrets (nunca en el repo).
4. **App Check** activado en el build de producción vía `VITE_RECAPTCHA_SITE_KEY` (ver `apps/web/src/lib/firebaseApp.ts`).
5. Auditoría de deploys: changelog + tag; rollback documentado (deploy de versión anterior).
6. `firebase deploy` en CI usa `--only` explícito (hosting, rules, indexes, storage rules, functions).

## 6. Observabilidad

- Logger central (info/warn/error) sin secretos ni datos privados.
- Métricas de error opcionales (Sentry) solo con datos agregados y sin PII.
- Revisión de logs de Functions para rate limiting y errores 5xx en staging/producción.
