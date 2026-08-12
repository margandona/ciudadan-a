# Backlog priorizado

Prioridades: **P0** (bloqueante para MVP), **P1** (MVP), **P2** (post-MVP / V2). Estimaciones relativas (S/M/L).

## MVP (P0/P1)

| # | Historia (COMO → QUIERO → PARA) | Fase | Prio | Talla |
|---|---|---|---|---|
| 1 | Como usuario quiero iniciar sesión y que el sistema reconozca mi rol para acceder a mi portal | 1 | P0 | L |
| 2 | Como MASTER/ADMIN quiero crear usuarios y asignar roles para gestionar accesos | 1 | P0 | M |
| 3 | Como ADMIN quiero importar estudiantes desde CSV/JSON protegiendo datos PIE para cargar cursos sin errores | 2 | P0 | L |
| 4 | Como PROFESOR quiero ver la lista de estudiantes y su perfil académico individual para dar seguimiento | 2 | P1 | L |
| 5 | Como PROFESOR quiero habilitar/programar clases y su aula invertida para controlar la secuencia | 3 | P0 | M |
| 6 | Como ESTUDIANTE quiero completar el aula invertida de cada misión (10–15 min) para llegar lista a la clase | 3 | P0 | L |
| 7 | Como PROFESOR quiero editar el aula invertida y el contenido de mis misiones sin recompilar | 3 | P1 | L |
| 8 | Como ESTUDIANTE quiero responder quizzes de varios tipos con retroalimentación para practicar | 4 | P0 | L |
| 9 | Como PROFESOR quiero lanzar quiz colectivo en clase para activar aprendizaje | 4/6 | P1 | M |
| 10 | Como ESTUDIANTE quiero subir evidencias (texto/imagen/PDF/enlace) y ver su estado para demostrar aprendizaje | 4 | P0 | L |
| 11 | Como PROFESOR quiero revisar, comentar y retroalimentar evidencias para apoyar a cada estudiante | 4 | P0 | M |
| 12 | Como ESTUDIANTE quiero responder el ticket de salida en cada clase para cerrar el ciclo | 4 | P0 | S |
| 13 | Como PROFESOR quiero registrar participación rápida (escala 0–3) para evaluación formativa | 5 | P0 | L |
| 14 | Como PROFESOR quiero un dashboard de curso/clase/estudiante sin rankings para tomar decisiones | 5 | P1 | L |
| 15 | Como PROFESOR quiero ver alertas del calendario (impresión −3, evaluador −7) para cumplir plazos | 5 | P1 | M |
| 16 | Como PROFESOR quiero proyectar una presentación interactiva con la estructura pedagógica para guiar la clase | 6 | P0 | XL |
| 17 | Como PROFESOR quiero editar las diapositivas por bloques para adaptar el material | 6 | P1 | L |
| 18 | Como PROFESOR quiero enviar material (general y DUA) a revisión para cumplir el flujo institucional | 7 | P0 | L |
| 19 | Como EVALUADOR quiero revisar, comentar y aprobar/rechazar material asignado para asegurar calidad | 7 | P0 | L |
| 20 | Como ESTUDIANTE quiero ver mis medallas y progreso (sin impacto en nota) para motivarme | 8 | P1 | M |
| 21 | Como PROFESOR quiero otorgar medallas manualmente para reconocer logros | 8 | P1 | S |
| 22 | Como ESTUDIANTE quiero dar feedback privado en clases 1/4/7/10 para mejorar la experiencia | 9 | P1 | M |
| 23 | Como PROFESOR quiero ver tendencias agregadas del feedback y analítica simple para ajustar | 9 | P1 | L |
| 24 | Como ESTUDIANTE quiero desarrollar el proyecto Ovalle 2035 con mi equipo para presentarlo en la feria | 10 | P1 | L |
| 25 | Como PROFESOR quiero evaluar el proyecto/cabildo con rúbrica, autoevaluación y coevaluación | 10 | P1 | M |
| 26 | Como ESTUDIANTE quiero trabajar offline y sincronizar al reconectar para no perder mi trabajo | 11 | P1 | L |
| 27 | Como ADMIN quiero registros de auditoría para trazabilidad de acciones sensibles | 12 | P1 | M |

## V2 (P2)

| # | Historia | Prio | Talla |
|---|---|---|---|
| 28 | Como ESTUDIANTE quiero recibir notificaciones push de plazos para no olvidar tareas | P2 | M |
| 29 | Como PROFESOR quiero exportar reportes institucionales (documento/PDF) para entregar a UTP | P2 | L |
| 30 | Como PROFESOR quiero versionar visualmente los contenidos para conservar historial | P2 | M |
| 31 | Como ADMIN quiero recordatorios por correo configurables para institucionalizar avisos | P2 | M |
| 32 | Como equipo quiero soporte multilingüe (español/inglés/mapuzugun) para inclusión | P2 | L |
| 33 | Como PIE/UTP quiero módulos formales para seguimiento de integración y coordinación | P2 | L |
| 34 | Como PROFESOR quiero recursos docentes compartidos entre colegas para colaborar | P2 | M |
| 35 | Como equipo quiero analítica predictiva opt-in con revisión humana para anticipar dificultades | P2 | XL |

## Bugs conocidos / deuda de testing

Registro vivo de hallazgos (de FASE 14 y posteriores). Se mueven aquí los bugs confirmados; los sospechosos se documentan en su observación del plan manual.

| # | Descripción | Severidad | Estado |
|---|---|---|---|
| B1 | Suite E2E Playwright **lenta/flaky en Windows** (workers=1, estado compartido del emulador); full-green reproducible solo vía job de CI en Linux | P1 | Documentado |
| B2 | Quiz con límite de intentos: una vez agotados, el UI mantiene el botón hasta recargar (la respuesta queda bloqueada en backend) | P2 | Pendiente de confirmar |
| B3 | Acciones offline no idempotentes entre corridas: re-ejecutar la misma acción puede duplicar registro si el cliente no refresca estado tras sincronizar | P2 | Pendiente de confirmar |
| B4 | Emulador de Firestore exige `-Duser.language=en` en Windows (crash con locale `es_CL`) | P3 | Workaround documentado |
| B5 | El `webServer` del config de Playwright se cuelga al arrancar Vite automáticamente en esta máquina; hay que levantar Vite a mano (`pnpm dev:web`) | P3 | Workaround documentado |
| B6 | **Callables no mapean errores de dominio**: `createTeam` con estudiantes ya en equipos devuelve 500 INTERNAL sin mensaje (la UI muestra error genérico). Recomendación: convertir `ValidationError` a `HttpsError` con mensaje en `functions/src` | P1 | Documentado (hallado en FASE 14) |
| B7 | **Cola offline rota por proxies de Vue**: `enqueue` fallaba con «could not be cloned» en IndexedDB y las respuestas offline nunca sincronizaban | P0 | **Corregido** (JSON-clone en `enqueue`) y verificado |
| B8 | **Reglas «rules are not filters» + wildcards**: listados de `courses` con wildcard de ruta → «Null value error»; queries del cliente no filtradas por el campo que leen las reglas (courses, submissions estudiante) | P0 | **Corregido** (reglas + repos) y verificado |

## Deuda técnica / tareas de soporte

- **Contenido editorial completo**: 12 misiones con aula invertida, quiz y actividad ✅ (10 quizzes + 9 actividades añadidos en 0.16.1). Pendiente solo **atribución de imágenes/gráficos** (INE/BCN/CEPAL) y licencias antes de habilitar bloques visuales/video.
- **Atribución de imágenes y gráficos** de datos (INE/BCN/CEPAL) en cada bloque; verificar licencias antes de habilitar bloques visuales/video.
- **Proyecto Firebase real de producción** + App Check (clave reCAPTCHA) + Storage bucket + usuario docente con claims.
- **Secretos de GitHub** (`FIREBASE_TOKEN`, `VITE_FIREBASE_*`, `VITE_RECAPTCHA_SITE_KEY`) y primer deploy end-to-end (`docs/GUIA_PRIMER_DEPLOY.md`).
- **Sesión de prueba manual con el/la docente** sobre producción (`docs/MANUAL_TEST_RUNBOOK.md`) — la FASE 14 la ejecutó el harness, falta la validación humana.
- **BUG-6** pendiente: mapear `ValidationError` de dominio a `HttpsError` con mensaje en `functions/src` (crear equipo con estudiantes ya asignadas muestra error genérico).
- Confirmar **B2** (UI de intentos agotados) y **B3** (idempotencia offline entre corridas).
- E2E full-green estable: el job está cableado en CI, pero en Windows es flaky (ver B1); validar en Linux/CI.
- Actualización de `docs/CHANGELOG.md` por release.
