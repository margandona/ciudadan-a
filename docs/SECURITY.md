# Seguridad, privacidad y autenticación

Población objetivo: **menores de edad** → privacidad por diseño, mínimo privilegio y cumplimiento de buenas prácticas de protección de datos (referencia general Ley 19.628 chilena; validación legal institucional en FASE 12).

## 1. Modelo de autenticación

- **Firebase Authentication** con `email/password` (proveedores externos desactivados en producción salvo decisión institucional).
- Contraseñas gestionadas por Firebase (hash + MFA opcional para roles docentes).
- **Custom claims** emitidos por Cloud Functions tras validar identidad:
  - `{ role, courses: string[], scope, exp }`
  - Claims nunca se escriben desde el cliente.
- **Flujo de alta de estudiante**: MASTER/ADMIN (o import CSV/JSON vía Functions) crea usuario con credencial temporal; primer inicio fuerza cambio de contraseña. El `uid` se vincula a `students/{studentId}` mediante campo interno controlado (`users/{uid}.studentLink`) — nunca exponer `studentId` como secret.
- **Sesión**: persistencia local, expiración manejada (idle + token refresh). Guarda de rutas por rol.
- **MODO_PROYECCION**: el profesor genera un token firmado (JWT/HMAC) con expiración corta para `/projection/:classId`. No permite acceder a otros dominios.

## 2. Autorización (RBAC)

Ver `docs/USER_ROLES.md`. Resumen de capas:

1. **Claims** → rutas, menús, permisos UI.
2. **Firestore/Storage rules** → control de datos (ver `docs/FIRESTORE_RULES.md`).
3. **Use-cases/application** → validación de permisos y reglas de negocio por acción.
4. **Cloud Functions callable** → operaciones sensibles (import, gestión usuarios, envío a revisión, aprobación, auditoría) con validación server-side y rate limiting.

## 3. Privacidad de estudiantes menores

| Medida | Implementación |
|---|---|
| Mínimo privilegio | Reglas por `courseId` y `studentId`; el EVALUADOR nunca ve perfiles individuales |
| Datos PIE/accesibilidad separados | Subcolección `students/{id}/protected` restringida a roles autorizados; fuera de listados y exports públicos |
| Separación de categorías | `students/` (académico) vs `users/` (identidad) vs `protected/` (integración) vs `settings/` (configuración) |
| Sin etiquetado | Prohibido: diagnósticos, adjetivos valorativos, alertas con juicios |
| Feedback anónimo | Agregación sin metadatos identificables cuando `anon=true` |
| Retención | Política de conservación y derecho de borrado (solicitud institucional); `anonymizeUser` function |
| Consentimiento | Nota institucional para menores; configurable por curso |
| Sin datos innecesarios | No se pide ubicación, biometría ni datos socioeconómicos personales |

## 4. Protección de la plataforma (OWASP mapeado)

| Riesgo | Mitigación |
|---|---|
| **Broken Access Control / IDOR** | Reglas por `courseId`/`studentId`; IDs opacos; verificación server-side |
| **Injection (Firestore, NoSQL)** | SDK parametrizado; validación de tipos en use-cases; sin concatenación de queries |
| **XSS** | Contenido en bloques tipados; sanitización server-side (`DOMPurify` en servidor / lista blanca de bloques); escape en render Vue; CSP en `vite`/Hosting |
| **CSRF** | Token de sesión (claims), operaciones vía callable con verificación de Auth/App Check; cabeceras seguras en Hosting |
| **Secrets** | `.env` con `.env.example`; secretos solo en GitHub Secrets y Cloud KMS/Secret Manager; nunca commitear |
| **Rate limiting** | Funciones callable con throttling por uid (import, envíos, auditoría, generación de tokens) |
| **Uploads inseguros** | Storage rules: validación de MIME permitido, tamaño máximo (p. ej. imágenes ≤ 8 MB, PDF ≤ 20 MB), nombres normalizados, URLs firmadas con expiración |
| **Log poisoning** | Logger central que nunca registra contraseñas, tokens ni datos privados |
| **App Check** | Integrado en web; bloquea accesos no autorizados fuera del dominio |
| **Dependency supply chain** | `lockfile`, audit en CI (`npm audit`), Dependabot |
| **Seguridad de entornos** | Proyectos Firebase separados; reglas de staging/prod revisadas antes del deploy |

## 5. Auditoría

- **Registro**: `auditLogs/{id}` (escritura solo `admin`/Functions) para creación, modificación, eliminación, publicación, evaluación, aprobación y cambios de permisos.
- Campos: `userId`, `action`, `entity`, `entityId`, `courseId?`, `timestamp`, `metadata` seguro.
- Lectura: solo MASTER/ADMIN. No incluye contenido sensible de estudiantes (solo referencias).

## 6. Entornos y secretos

| Entorno | Firebase project (sugerido) | Uso |
|---|---|---|
| `development` | `pclab-dev` | desarrollo local + Emulator |
| `test` | `pclab-test` | CI, pruebas de reglas y E2E |
| `staging` | `pclab-staging` | validación pedagógica pre-producción |
| `production` | `pclab-prod` | colegio |

- Archivos: `.env.development`, `.env.test`, `.env.staging`, `.env.production` + `.env.example`.
- Variables típicas: `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_ENABLE_EMULATORS`, `VITE_USE_EMULATORS`.
- El `API key` de Firebase es pública por diseño (solo identifica proyecto); los secretos reales viven en Cloud Functions + Secret Manager.

## 7. Hardening (FASE 12, implementado)

- **Rate limiting server-side** (por usuario + acción, ventana deslizante) en callables sensibles: importación (10/min), preview (30), materiales/envíos (30), tokens de proyección (30), medallas y evaluación de proyectos (30), revisión de evidencias (60), participación (120). Para múltiples instancias de producción, mover el contador a Firestore/Redis.
- **App Check**: el SDK se inicializa con `ReCaptchaV3Provider` cuando existe `VITE_RECAPTCHA_SITE_KEY`; activar la clave en la consola de Firebase para `ciudadania-lab` (producción/staging). En emulador/desarrollo no se exige.
- **Auditoría completa** en `auditLogs` (solo server): importación, activación de clases, revisión de evidencias, envío/revisión de materiales, creación de materiales/equipos/grupos, participación, medallas, evaluación de proyectos, presentaciones.
- **Límites de entrada**: texto de evidencia y comentarios (4000), nombres de adjuntos (200), 5 adjuntos; formatos PDF/DOCX ≤ 50 MB en materiales.
- **Reglas Firestore R1–R18** con suite de pruebas verde en el emulador.

## 8. Notas de la fase de nóminas (implementado)

- **Datos reales = privados**: `3ro/*.xlsx`, `3ro/*.json` (incluido el **service account** `ciudadania-lab-firebase-adminsdk-*.json`) y `private-data/` están en `.gitignore`. Nunca versionar ni exponer.
- El importador **no lee** ni importa la columna `RUN` (sensible) ni campos de integración: los reporta como `SENSITIVE_FIELD_DETECTED` y los excluye.
- La condición PIE/integración queda en `students/{id}/protected` (reglas restringidas a roles autorizados); el importador no la infiere desde la nómina.
- Auditoría de importación en `auditLogs` con conteos y `courseIds`, **sin nombres** (escritura solo desde Functions/`onlyServer`).
- El script de importación exige el **emulador** por defecto; producción requiere `--prod` explícito y autorización institucional.

## 9. Reglas para el desarrollo

1. Toda acción crítica se valida en reglas/backend (no solo ocultando el botón).
2. Nunca registrar contraseñas, tokens ni contenido privado.
3. No commitear secretos ni archivos `*.env`.
4. Las reglas se testean en el emulador en cada PR.
5. Auditoría para acciones sensibles; revisiones periódicas de reglas (fase 12 y por PR).
