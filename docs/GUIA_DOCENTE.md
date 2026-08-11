# Guía de puesta en marcha para el/la docente

Cómo usar **Providencia Ciudadanía Lab** en el aula (3º Medio, Educación Ciudadana). Los pasos suponen que la app ya está desplegada o corriendo en emuladores locales (`http://localhost:5199`).

## 1. Acceso y roles

| Rol | Qué puede hacer | Cómo entra |
|---|---|---|
| Profesor/a | Programar clases, ver dashboards, registrar participación, enviar material, equipos y proyectos | Email + contraseña |
| Estudiante | Aula invertida, quizzes, evidencias, tickets, medallas, proyecto | Email + contraseña |
| Evaluador/a | Revisar y aprobar material asignado (sin ver datos de estudiantes) | Email + contraseña |

Demo local: `profesor@demo.cl`, `estudiante@demo.cl`, `evaluador@demo.cl` — contraseña `Demo1234`.

## 2. Antes de la primera clase (una vez por semestre)

1. **Importar la nómina**: `Cursos → Importar estudiantes` → subir el Excel del curso. Se crean los cursos y perfiles (datos sensibles como RUN no se importan).
2. **Revisar el dashboard del curso**: total de estudiantes, activas/retiradas y perfil de cada una.
3. **Programar las misiones**: `Clases` → para cada misión elige estado (`Lista`, `Programada`, `Abierta`, …) y guarda. Solo lo que esté disponible se ve en la app de las estudiantes.
4. **Calendario administrativo**: revisa alertas de impresión (guías, −3 días) y envío al evaluador (evaluaciones, −7 días).

## 3. Secuencia de una clase (flujo recomendado, ~45 min)

### Antes (10–15 min en casa)
- La estudiante completa el **aula invertida** de la misión (vídeo/lectura + mini-quiz + reflexión) y llega «lista».

### En clase
1. **Abrir la misión** (`Clases → Proyección`) → se proyecta la presentación con la estructura pedagógica (portada, pregunta, conceptos, caso, preguntas). Usa ←/→, `F` (pantalla completa), `H` (revelar respuestas).
2. **Votación interactiva** en las preguntas: las estudiantes votan desde su PWA; los resultados aparecen agregados en la proyección (sin identidad). Si no hay dispositivos, usa **conteo manual**.
3. **Quiz colectivo o individual**: la estudiante responde desde su dispositivo; la corrección es automática (con explicaciones) y los intentos quedan registrados.
4. **Participación en vivo** (`En vivo`): registra con 1–2 clics `+ Participó`, `+ Argumentó`, `+ Colaboró`, `+ Evidencia`, `+ Pregunta`, `+ Liderazgo`, con escala 0–3. El resumen por habilidad se actualiza al instante.
5. **Evidencia** (si aplica): la estudiante entrega su evidencia (texto/enlace/archivo) y el docente la revisa y retroalimenta desde `Clases → Evidencias`.
6. **Ticket de salida** (últimos 5 min): cierra la clase; verás la tendencia en el dashboard.
7. **Feedback** (clases 1, 4, 7 y 10): la estudiante responde (opcionalmente anónimo); tú ves tendencias agregadas en `Feedback`.

## 4. Trabajo con el equipo evaluador (materiales)

- `Materiales → Crear material`: crea guías/evaluaciones/rúbricas y añade versiones **GENERAL** y **DUA** (PDF/DOCX).
- `Enviar a revisión` con el correo de la evaluadora → el portal del evaluador muestra solo lo asignado (sin datos de estudiantes) para comentar, aprobar, pedir correcciones o rechazar.
- Las versiones y observaciones quedan en el historial del material.

## 5. Proyecto Ovalle 2035 (Misión 11) y Feria (Misión 12)

1. `Equipos`: crea equipos (o **grupos aleatorios** que nunca mezclan cursos).
2. La estudiante completa los **11 campos** del proyecto con su equipo y lo entrega.
3. `Proyectos`: revisa y evalúa con **rúbrica** (rúbricas de Cabildo, Proyecto y Feria).
4. `Feria`: presenta las tarjetas de cada proyecto.

## 6. Gamificación (sin tocar notas)

- Las estudiantes ganan **medallas** automáticamente (Analista, Investigadora, Cartógrafa, Ciudadana, …) o tú las otorgas desde el perfil. No impactan la nota y **no hay rankings**.

## 7. Offline

- Las estudiantes pueden responder quiz/ticket/evidencia/feedback **sin conexión**; se guarda en su dispositivo y **sincroniza automáticamente** al reconectar (banner PENDIENTE → SINCRONIZADO).

## 8. Consejos rápidos

- Todo está pensado **sin rankings ni etiquetas**: las métricas son descriptivas para decidir.
- La analítica (`Analítica`) muestra % de aula invertida, evidencias pendientes, dificultad percibida y preguntas de menor rendimiento por clase.
- Si algo falla: `docs/GUIA_PASO_A_PASO.md` (levantar emuladores) y `docs/GUIA_PRUEBAS_LOCALES.md`.
