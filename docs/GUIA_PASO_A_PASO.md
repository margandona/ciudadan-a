# Instrucciones paso a paso — FASE 14 (Testing manual)

Qué tienes que hacer tú, en orden. Marca cada casilla [ ] cuando la completes. Duración estimada: **1 hora total**.

---

## Paso 0 — Antes de empezar

- [ ] Tener el proyecto clonado en `C:\Users\marga\OneDrive\Desktop\providencia`.
- [ ] Tener instalado: Node 22, pnpm, Java 21+ y el CLI de Firebase.
- [ ] Ejecutar una sola vez (si no lo tienes): `pnpm install` y `pnpm exec firebase login`.

**Credenciales demo (las usarás en toda la prueba):**

| Rol | Email | Contraseña |
|---|---|---|
| Profesor | `profesor@demo.cl` | `Demo1234` |
| Estudiante | `estudiante@demo.cl` | `Demo1234` |
| Evaluador | `evaluador@demo.cl` | `Demo1234` |

---

## Paso 1 — Levantar los emuladores

Abre **3 terminales** en `C:\Users\marga\OneDrive\Desktop\providencia`:

**Terminal 1 — Emulador de Firestore** (puerto 8088):
```
java -Duser.language=en -jar C:\Users\marga\.cache\firebase\emulators\cloud-firestore-emulator-v1.22.0.jar --host 127.0.0.1 --port 8088 --rules .\firestore.rules
```
- [ ] Aparece `Dev App Server is now running` (deja esta terminal abierta).

**Terminal 2 — Auth + Functions:**
```
pnpm exec firebase emulators:start --only auth,functions --project pclab-test
```
- [ ] Dice `Functions emulator` y `Auth emulator` en `http://127.0.0.1:9098` (deja abierta).

**Terminal 3 — App web:**
```
pnpm dev:web
```
- [ ] Dice `Local: http://localhost:5199` (deja abierta).

> ⚠️ Si `pnpm dev:web` da error de puerto ocupado, algo usa el 5199. Pregunta antes de cambiar nada.

---

## Paso 2 — Sembrar datos demo

En **Terminal 3** (nueva), sin cerrar la de la app:

```
pnpm seed:content
pnpm seed:demo-teacher
pnpm seed:demo-student
pnpm seed:demo-evaluator
```
- [ ] Cada comando termina con OK/éxito.

---

## Paso 3 — Verificación automática (5 min, opcional pero recomendada)

En una terminal:
```
pnpm lint
pnpm test
pnpm build
```
- [ ] Lint: 0 errores.
- [ ] Tests: 260 pasan.
- [ ] Build: sin errores.

---

## Paso 4 — Prueba manual (30 min)

Abre `http://localhost:5199` en el navegador y sigue **`docs/MANUAL_TEST_RUNBOOK.md`**. Comienza por la **Ronda A (profesor)**.

- [ ] **Ronda A — Profesor** (12 pasos, A1–A11). ✅/❌ en la tabla.
- [ ] **Ronda B — Estudiante** (9 pasos, B1–B9, incluye probar **offline**: quita la red, responde un quiz, reconecta).
- [ ] **Ronda C — Evaluador** (3 pasos, C1–C3).

**Regla de oro:** cada vez que algo falle, escribe en la casilla qué pasó exactamente (pantalla, mensaje, paso). No lo arregles tú.

---

## Paso 5 — Reportar resultados

Cuando termines, respóndeme en el chat con:

1. Los ✅/❌ de cada ronda (o pega el `docs/MANUAL_TEST_RUNBOOK.md` completado).
2. Cualquier **bug reproducido**, con: paso, resultado esperado, resultado obtenido.
3. Dudas o redacciones confusas que hayas visto en la app.

Yo me encargo de:
- Registrar los bugs en `docs/BACKLOG.md` → «Bugs conocidos».
- Corregir lo que se pueda.
- Actualizar `docs/CHANGELOG.md` y `docs/PROJECT_PHASES.md`.
- Avanzar a la siguiente fase.

---

## Paso 6 — Apagar todo (al terminar)

Cierra las 3 terminales. Opcional: borrar los datos del emulador con `pnpm exec firebase emulators:clear --project pclab-test`.

---

**Resumen de archivos de referencia:**
- `docs/MANUAL_TEST_RUNBOOK.md` → los pasos de la prueba manual.
- `docs/MANUAL_TEST_PLAN.md` → los 82 casos completos.
- `docs/BACKLOG.md` → registro de bugs conocidos.
