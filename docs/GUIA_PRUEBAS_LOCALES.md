# Guía de pruebas locales — Providencia Ciudadanía Lab

Documento operativo: qué levantar, con qué credenciales y qué probar. El detalle por casos (ID/Acción/Resultado) está en [`MANUAL_TEST_PLAN.md`](./MANUAL_TEST_PLAN.md).

## 1. Qué necesitas corriendo

| Servicio | Puerto | Cómo iniciarlo |
|---|---|---|
| Emulador Firestore | `127.0.0.1:8088` | `java -Duser.language=en -jar C:\Users\marga\.cache\firebase\emulators\cloud-firestore-emulator-v1.22.0.jar --host 127.0.0.1 --port 8088 --rules .\firestore.rules` |
| Emulador Auth | `127.0.0.1:9098` | `pnpm exec firebase emulators:start --only auth` |
| Web (dev) | `http://localhost:5199` | `pnpm dev` |

> Los puertos 8088/9098/5199 son **propios del proyecto** para no chocar con tus otros emuladores (8080/9099) y con `demo-fidelity-friends` (5173/5174).

Estado actual de los emuladores (verificado): **Firestore 8088 ✅ · Auth 9098 ✅**.

## 2. Credenciales

### Profesor (portal docente)
- **Usuario:** `profesor@demo.cl`
- **Contraseña:** `Demo1234`
- **Rol/claims:** `PROFESOR` · cursos `course-3med-d-2026` (3º Medio D) y `course-3med-e-2026` (3º Medio E).
- Regenerar si es necesario: `pnpm seed:demo-teacher`

### Estudiantes
- **Usuario demo:** `estudiante@demo.cl` / `Demo1234` (claims `ESTUDIANTE` · curso `course-3med-d-2026` · `studentId` = uid). Se regenera con `pnpm seed:demo-student`.
- Los perfiles académicos de las nóminas ya están importados (D: 41 · E: 34). La vista de estudiante funciona con la cuenta demo y está cubierta por tests automáticos.

## 3. Pruebas recomendadas (FASE 1–3)

### A. Autenticación
1. Abrir `http://localhost:5199` → te redirige a `/login`.
2. Entrar con `profesor@demo.cl` / `Demo1234`.
3. Probar `Salir` → vuelve al login. Probar contraseña incorrecta → mensaje de error.

### B. Cursos y nóminas (FASE 2)
4. `/teacher` → ver los dos cursos (3º Medio D y E).
5. `/teacher/courses/course-3med-d-2026` → resumen (41 estudiantes: 37 activas + 4 retiradas) y listado. No debe aparecer ninguna estudiante de E.
6. Abrir un perfil → `Retirar del curso` (soft delete) → el historial se conserva.
7. `/teacher/students/import` → subir una nómina `.xlsx` (o la real `3ro/Estudiantes 3º Medio D-Educación Ciudadana.xlsx`): debe mostrar preview con resumen, el aviso de columna `RUN` sensible (no importada) y tabla editable. `Importar` es idempotente.

### C. Clases y aula invertida (FASE 3)
8. `/teacher/classes` → elige `course-3med-d-2026`. Para una misión, pon estado **OPEN**, marca `Aula invertida` y Guardar (aparece «Guardado»).
9. Prueba ventana de disponibilidad: pon `Disponible desde` en el futuro y guarda.
10. `/teacher/classes/class-01/flipped` → resumen de completitud del aula invertida.
11. (Vista estudiante, con cuenta habilitada) `/student` → «Tu próxima misión» con barra de progreso → `/student/missions/class-01/flipped` → recorrer bloques, responder preguntas (retroalimentación inmediata), escribir reflexión y pulsar **«Estoy lista para la misión»**.

### D. Contenido
12. Sembrar/re-sembrar contenido: `pnpm seed:content` (12 misiones + 12 aulas invertidas + 2 quizzes + 3 actividades).

### E. Quizzes, evidencias y ticket (FASE 4)
13. Quiz de estudiante: con cuenta estudiante habilitada, abrir `/student/quizzes/quiz-class-01-ciudadania` → responder → enviar → ver resultado y explicaciones. Reintentar (límite `attempts`) → se rechaza.
14. Evidencia de estudiante: `/student/missions/class-01/activities` → entregar el dilema → estado `ENTREGADO`.
15. Revisión del profesor: `/teacher/classes/class-01/submissions` → seleccionar → estado `RETROALIMENTADO`, nota y feedback → «Revisión guardada».
16. Resultados de quiz del profesor: `/teacher/classes/class-01/quizzes`.
17. Ticket de salida: `/student/missions/class-01/exit-ticket` → enviar las 5 respuestas + dificultad.

### F. Dashboard y participación (FASE 5)
18. Registro en vivo: `/teacher/live/class-01` → seleccionar estudiantes → "+ Argumentó" → aviso y resumen por habilidad.
19. Dashboard de curso: `/teacher/courses/course-3med-d-2026` → tarjetas de resumen.
20. Dashboard de clase: `/teacher/classes/class-01/dashboard` → flipped %, evidencias, participación, dificultad.
21. Calendario: `/teacher/calendar` → alertas verde/amarillo/rojo (materiales sembrados).

### G. Modo proyección (FASE 6)
22. Proyección: `/projection/class-01` (profesor) → navegar con teclado, fullscreen (F), revelar (H).
23. Votación: en la diapositiva pregunta, votar desde la PWA (estudiante) o registrar conteo manual (profesor).
24. Token: desde el editor/proyección crear token y abrir `/projection/class-01?token=…` sin sesión.
25. Editor: `/teacher/classes/class-01/presentation` → editar bloques → Guardar (valida estructura).

### H. Materiales y evaluador (FASE 7)
26. Profesor: `/teacher/materials` → crear material, agregar versión GENERAL y DUA, enviar a `evaluador@demo.cl`.
27. Evaluador: login `evaluador@demo.cl` / `Demo1234` → `/evaluator` → abrir material → comentar y aprobar.
28. Verificar historial de versiones y observaciones en el detalle.

### I. Gamificación (FASE 8)
29. Estudiante: `/student` → "Evaluar medallas" → galería con estado ganada/bloqueada y mensaje positivo.
30. Profesor: perfil de estudiante → otorgar medalla manualmente → aparece en la colección.
31. Verificar que las medallas no alteran notas ni muestran rankings.

### J. Feedback y analítica (FASE 9)
32. Estudiante: `/student/missions/class-01/feedback` → enviar (anónimo por defecto).
33. Profesor: `/teacher/feedback` → tendencias por clase y comentarios (anónimos sin identidad).
34. Profesor: `/teacher/analytics` → flipped %, pendientes, dificultad y preguntas de menor rendimiento con alertas descriptivas.

### K. Proyecto y feria (FASE 10)
35. Profesor: `/teacher/teams` → crear equipo o generar grupos aleatorios.
36. Estudiante: `/student/missions/class-11/project` → completar los 11 campos y entregar.
37. Profesor: `/teacher/projects` → evaluar con rúbrica (y ver autoevaluación/coevaluación).
38. Profesor: `/teacher/fair` → tarjetas de los proyectos presentados.

### L. PWA / offline (FASE 11)
39. Instalar la app (manifest) y probar recarga sin conexión (shell + aula invertida ya vista).
40. Con la red cortada, responder un quiz/evidencia/ticket/feedback → banner `PENDIENTE`.
41. Restaurar la red → sincroniza; banner `SINCRONIZADO`; sin pérdida de respuestas.
42. Forzar un fallo de red al sincronizar → banner `ERROR` + botón `Reintentar`.

## 4. Comandos útiles

```powershell
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8088"
$env:FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:9098"
pnpm dev                        # web en http://localhost:5199
pnpm seed:demo-teacher          # crea/actualiza profesor demo
pnpm seed:content               # catálogo + aulas invertidas (lee content/)
pnpm import:students -- --file="3ro\Estudiantes 3º Medio D-Educación Ciudadana.xlsx" --apply
pnpm lint ; pnpm typecheck ; pnpm test ; pnpm build
```

## 5. Suite automatizada (resumen)

`pnpm test` → **104/104**: unit (domain/application) · componentes Vue · reglas Firestore (R1–R14, requiere emulador) · integración (import + aislamiento + flujo flipped).

## 6. Notas de seguridad

- Las credenciales y nóminas reales viven en `3ro/` y `private-data/` (ignorados por Git). No versionar ni pegar la nómina en el chat.
- El importador solo escribe en el emulador; producción requiere `--prod` explícito.
