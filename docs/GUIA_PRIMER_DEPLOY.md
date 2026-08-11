# Guía del primer deploy (paso a paso)

Pipeline listo en el repo; esto configura Firebase, los secretos de GitHub y ejecuta el **primer despliegue** de `Providencia Ciudadanía Lab`.

> Requisitos: cuenta de Google, proyecto clonado, Node 22 + pnpm, y acceso de administrador al repositorio de GitHub.

---

## Paso 1 — Crear/validar el proyecto Firebase

1. Ir a [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
   - Nombre sugerido: `ciudadania-lab` (debe coincidir con `.firebaserc` → `default`).
   - Google Analytics: opcional (puede omitirse).
2. En el proyecto, **Agregar app → Web** (icono `</>`).
   - Anota `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
3. Habilita los servicios que usa la app:
   - **Authentication** → Sign-in method → **Email/Password**.
   - **Firestore Database** → Create database → modo **production** → región cercana (p. ej. `us-central1` o `southamerica-east1`).
   - **Storage** → create bucket (misma región).
   - **Functions** → upgrade a plan Blaze (pay-as-you-go) — obligatorio para Cloud Functions.
   - **Hosting** → Get started (más tarde, el CLI la crea).

## Paso 2 — Activar App Check (requisito de FASE 16)

1. Firebase console → **App Check** → **Apps** → tu app web → **Enforce** (o «Test» primero).
2. **Providers → reCAPTCHA v3** → registra la app y obtén la **Site Key** (clave web).
3. Guarda la `VITE_RECAPTCHA_SITE_KEY`.
4. (Recomendado) En la pestaña de App Check, activa la **aplicación forzosa** (Enforce) una vez verificado.

## Paso 3 — Autenticación del CLI

```powershell
pnpm exec firebase login:ci   # abre navegador; devuelve un token
```
Guarda ese token: es `FIREBASE_TOKEN` (secreto de GitHub).

> Alternativa recomendada: crear una **Service Account** en IAM con rol Editor y usar `GCP_SA_KEY`.

## Paso 4 — Desplegar las reglas e índices (una vez)

Desde la raíz del repo (con las nóminas listas en el proyecto):

```powershell
# autenticado en la consola
pnpm exec firebase deploy --only firestore:rules,firestore:indexes,storage:rules --project ciudadania-lab
```

Esto aplica `firestore.rules` (R1–R18), `firestore.indexes.json` y `storage.rules` a producción. **Nunca** desplegar reglas sin tests verdes (el CI las ejecuta).

## Paso 5 — Configurar secretos de GitHub

Repo en GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `FIREBASE_TOKEN` | token de `firebase login:ci` (Paso 3) |
| `VITE_FIREBASE_PROJECT_ID` | `ciudadania-lab` |
| `VITE_FIREBASE_API_KEY` | de la app web (Paso 1) |
| `VITE_FIREBASE_AUTH_DOMAIN` | p. ej. `ciudadania-lab.firebaseapp.com` |
| `VITE_FIREBASE_STORAGE_BUCKET` | p. ej. `ciudadania-lab.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | del proyecto |
| `VITE_FIREBASE_APP_ID` | de la app web |
| `VITE_RECAPTCHA_SITE_KEY` | Site Key de App Check (Paso 2) |

## Paso 6 — Sembrar datos de producción (contenido + cursos + usuario)

Con reglas ya desplegadas y usando el emulador para validar previamente:

```powershell
# contenido (12 misiones, quizzes, actividades, presentaciones, medallas, rúbricas)
pnpm exec firebase emulators:exec --only firestore "pnpm seed:content"   # validar en emulador

# a producción SOLO con autorización explícita
$env:FIRESTORE_EMULATOR_HOST=""; pnpm seed:courses --prod
pnpm seed:content --prod
```

Crear el usuario del docente (Authentication → Add user → email/contraseña) y asignar claims `role=PROFESOR` + `courses` (se puede hacer con un script admin o consola de Firebase).

> ⚠️ Las **nóminas reales** (`3ro/*.xlsx`) se importan a producción con `pnpm import:students --file=... --apply --prod` SOLO con autorización y tras validar el preview en el emulador.

## Paso 7 — Primer deploy (CI/CD)

1. **Push a `main`** (o un PR → `preview.yml` generará una URL de preview).
2. El workflow **`deploy.yml`** hace: lint → typecheck → unit + cobertura → build → reglas/integración → E2E+a11y → `pnpm build:web` con tus secretos → `firebase deploy`.
3. Cuando termine, verifica:
   - **Hosting**: `https://ciudadania-lab.web.app` carga y es instalable (PWA).
   - **Login** funciona (usuario creado en Paso 6).
   - **App Check**: en consola, la app web muestra «Requisito de la clave de app aprobado» (App Check emite tokens).
   - **Functions** aparecen en Functions (con `us-central1` como región por defecto).
4. Rollback si algo falla: redeployar un commit anterior o `firebase hosting:clone <canal-live> --project ciudadania-lab`.

## Paso 8 — Validación final

- Correr el **runbook de pruebas manuales** (`docs/MANUAL_TEST_RUNBOOK.md`) contra producción con credenciales reales.
- Confirmar **sin errores de consola** y **App Check activo** (sin ello, la app funciona en modo test pero no está endurecida).
- Actualizar `docs/CHANGELOG.md` con la versión desplegada y etiquetar: `git tag v1.0.0`.
