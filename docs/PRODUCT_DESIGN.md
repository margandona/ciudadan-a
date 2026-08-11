# Diseño de producto (UX/UI y flujos)

## 0. Identidad visual

- **Estética:** observatorio ciudadano · territorio · datos · cartografía · ciudadanía · innovación.
- Moderna, académica, tecnológica, elegante, juvenil sin ser infantil. Sin caricaturas ni branding ajeno.
- **Design system** (`components/ui/`): tokens (tipografía, spacing, colores, radios, sombras), cards, buttons, badges, navigation, modal, toast, tables, form controls, empty states, skeleton loading. Alto contraste y modo reducción de movimiento disponibles.
- **Bases responsive:** mobile-first (estudiante), desktop-first (profesor/evaluador), projection-first (presentación).

## 1. MODO PROYECCIÓN (`/projection/:classId`)

Interfaz independiente optimizada para proyector / pizarra interactiva / pantalla grande.

- **Estados:** pantalla completa, navegación siguiente/anterior, atajos de teclado (→/←/espacio/F/esc), temporizador, zoom, mostrar/ocultar respuesta, preguntas con votación, quiz colectivo (modo clase), ruleta opcional, revelar contenido, mapas, imágenes, videos, gráficos.
- **Estructura pedagógica obligatoria de slides:**
  1. Portada / misión
  2. Aprendizaje esperado
  3. Objetivo de la clase
  4. Ruta de aprendizaje
  5. Activación de conocimientos previos
  6. Contenido breve
  7. Actividad
  8. Pregunta interactiva
  9. Quiz
  10. Discusión
  11. Actividad principal
  12. Evaluación formativa
  13. Síntesis
  14. Ticket de salida
- **DUA en proyección:** todo slide muestra QUÉ / PARA QUÉ / CÓMO / CÓMO SABREMOS (según corresponda); múltiples formas de representación, participación y expresión (ver `docs/DUA_GUIDELINES.md`).
- **Acceso:** token de proyección (expiración corta); sin cuentas por alumno en el dispositivo compartido. Las interacciones colectivas (votación/quiz) se agregan vía Functions con rate limiting.

## 2. AULA INVERTIDA (estudiante)

- Título de misión → objetivo → pregunta problematizadora → microcontenido → conceptos → video/imágenes/mapas/infografía → lectura breve → quiz → minijuego → reflexión → recurso complementario → botón «Estoy lista para la misión».
- Registro: acceso, progreso por bloques, término, quiz con intentos, tiempo aproximado (no punitivo), respuesta reflexiva.
- Modo individual; tiempo no penaliza. Estado visible al profesor (quién completó).

## 3. DASHBOARD PROFESOR

- **Resumen curso:** estudiantes activas, progreso promedio, aula invertida completada, actividades entregadas, quizzes, tickets de salida, participación, clases completadas, evidencias pendientes, feedback reciente.
- **Dashboard por clase:** % aula invertida, entregas, resultados quiz, tickets, participación por habilidad, dificultad percibida.
- **Dashboard por estudiante:** perfil académico + timeline + fortalezas/aspectos por desarrollar (solo académicos) + feedback entregado + fecha última actividad.
- **Gráficos:** sobrios (barras, líneas, anillos), sin rankings.
- **Alertas pedagógicas simples:** «7 estudiantes presentan dificultades en el concepto X». Sin etiquetas ni diagnósticos.
- **Registro de participación en clase:** panel rápido, marcar múltiples estudiantes, escala 0–3 configurable, observaciones breves, filtros por clase/curso/habilidad, evolución.
- **Calendario administrativo:** alertas verde/amarillo/rojo para impresión (−3 días) y envío a evaluador (−7 días).

## 4. PORTAL EVALUADOR

- Acceso solo a material autorizado (sin datos de estudiantes).
- Cola de revisión por estado: `BORRADOR`, `EN_REVISION`, `CON_OBSERVACIONES`, `APROBADO`, `RECHAZADO`, `CORREGIR_Y_REENVIAR`.
- Vista de material: planificación, OA, objetivos, indicadores, evaluación, pauta, rúbrica, versión general, versión DUA/PIE, solucionario, material educativo, presentación proyectable, guías, material de aula invertida.
- Comentarios con historial, fechas de envío/revisión, versiones del material, registro de aprobación.
- Flujo: revisa → comenta → aprueba / solicita corrección (con observaciones).

## 5. PERFIL ESTUDIANTE

- Misiones disponibles (12), aula invertida, contenido, videos, imágenes, infografías, mapas, textos, quizzes, juegos, actividades, recursos, tareas, evidencias entregadas, retroalimentación, insignias, progreso y proyecto final.
- Aislamiento total: nunca ve datos de otras estudiantes (reglas + use-cases).
- Estados offline visibles: `SINCRONIZADO` / `PENDIENTE_DE_SINCRONIZAR` / `ERROR_DE_SINCRONIZACION`.

## 6. GAMIFICACIÓN (sobria)

- Narrativa Observatorio Ciudadano · Ovalle 2035 · 12 misiones.
- Medallas: Analista, Investigadora, Cartógrafa, Ciudadana, Mediadora, Innovadora, Defensora del Bien Común, Pensamiento Crítico, Constructora de Acuerdos, Ciudadanía Digital.
- Reglas: no modifican nota; sin rankings públicos ni comparaciones humillantes; sin penalizaciones; sin diseño infantil.
- Elementos: progreso, insignias, mensajes positivos, hitos, niveles, colecciones, desbloqueo de material.
- Otorgamiento: automático por criterios pedagógicos y manual por el profesor; registro en `studentBadges`.

## 7. FLUJOS PRINCIPALES

- **Estudiante:** login → misión actual → aula invertida → quiz → actividad/evidencia → ticket de salida → progreso + insignias → feedback (clases 1/4/7/10).
- **Profesor:** login → curso → habilitar clase → revisar evidencias → registrar participación → otorgar insignias → dashboard → exportar.
- **Evaluador:** login → cola de revisión → abrir material → comentar → aprobar / solicitar correcciones.
- **Proyección:** abrir `/projection/:classId` → deck → interacciones → ticket de salida colectivo.
- **Admin/Master:** usuarios, cursos, importación CSV/JSON, configuración, auditoría.
