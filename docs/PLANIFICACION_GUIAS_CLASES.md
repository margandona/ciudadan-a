# Planificación de las guías de las 12 clases — desde el lunes 17 de agosto de 2026

## Carpeta de las guías (dónde modificarlas)

- **Contenido editable (fuente):** `content/material-content.json` — aquí se editan los textos, ítems, rúbricas, referencias y fechas de cada material **sin tocar código**.
- **Documentos PDF/DOCX:** se generan automáticamente desde ese JSON al pulsar **PDF / DOCX** en `Materiales` (no se editan a mano).
- **Vista web del material:** `/teacher/materials/:id` (Contenido, Referencias, versiones, revisiones).

## Calendario semanal (inicio lunes 17-08-2026)

| Clase | Fecha | Guía / trabajo | Tipo |
|---|---|---|---|
| 1 | lunes 17-08 | Guía 01 — Presentación del curso + Diagnóstico U1–U2 + Ticket | GUIDE + WRITTEN_TEST (diagnóstico) + EXIT_TICKET |
| 2 | lunes 24-08 | Guía 02 — Consejo Ciudadano (+ rúbrica formativa) | GUIDE |
| 3 | lunes 31-08 | Guía 03 — Mapa de participación ciudadana | GUIDE |
| 4 | lunes 07-09 | Guía 04 — Cartografía social | GUIDE |
| 5 | lunes 14-09 | Guía 05 — Expediente Ciudadano | GUIDE |
| 6 | lunes 21-09 | Cabildo Providencia — «Nuestro territorio necesita…» | PRACTICAL_WORK |
| — | lunes 28-09 | **Prueba Unidad 3** (general + DUA + solucionario) | WRITTEN_TEST / DUA / ANSWER_KEY |
| 7 | lunes 28-09 | Guía 07 — ¿Quién debe resolver los problemas? | GUIDE |
| 8 | lunes 05-10 | Guía 08 — Gobernar Ovalle: presupuesto comunal (ABJ) | WORKSHEET |
| 9 | lunes 12-10 | Guía 09 — Laboratorio Ciudadano de Datos | GUIDE |
| 10 | lunes 19-10 | Guía 10 — Agua, territorio y desarrollo en Limarí | GUIDE |
| 11 | lunes 26-10 | Guía 11 — Proyecto Ovalle 2035 (+ rúbrica) | GUIDE |
| 12 | lunes 02-11 | Feria Ciudadana Ovalle 2035 (instrucciones + rúbrica) | PRACTICAL_WORK |
| — | lunes 09-11 | **Prueba Unidad 4** (general + DUA + solucionario) | WRITTEN_TEST / DUA / ANSWER_KEY |

## Estructura de cada guía de trabajo (documento)

1. **Encabezado**: membrete · Colegio La Providencia · Ovalle — Educación Ciudadana · Prof. Marcos Argandoña · Clase · Unidad · Fecha.
2. **Título + tipo** (Guía de Aprendizaje / Evaluación / Rúbrica / Solucionario…).
3. **Currículo**: OA · Objetivo de la clase · Indicadores.
4. **Contenido / Lectura**: texto breve del tema con **referencias**.
5. **Instrucciones** (numeradas y segmentadas).
6. **Actividad**: caso concreto con su **cita** (fuente real o marcado «Caso construido para la actividad») + consigna.
7. **Espacio de respuesta** (líneas pautadas).
8. **Cierre / reflexión**.
9. **Referencias** (bibliografía).
10. **Recomendaciones de completitud** (para el autor; se eliminan al imprimir).

## Actividad por clase (qué debe contener)

| Clase | Actividad de la guía |
|---|---|
| 1 | Presentación + 3 preguntas iniciales (barrio, ciudadanía, problema de Ovalle) |
| 2 | Simular un consejo: defender republicanismo/liberalismo/comunitarismo sobre la plaza Los Aromos; tabla de argumentos + reflexión |
| 3 | Levantar mapa de participación (5 espacios, clasificar I/S/D) y debatir si un «like» es participación |
| 4 | Cartografía social: Lugar / Problema / Oportunidad / Actor-escala / Evidencia (contexto INE Censo 2017) |
| 5 | Expediente Ciudadano: 8 secciones (problema, ubicación, población, causas, actores, evidencia, institución, propuesta) |
| 6 | Cabildo: completar «Nuestro territorio necesita…» + argumento con evidencia + autoevaluación (rúbrica) |
| 7 | Tabla de casos (salud, áreas verdes, transporte, seguridad, vivienda) → actor + criterio |
| 8 | Presupuesto ABJ: repartir 100 unidades en 8 áreas (tabla decisión/costo/justificación/impacto) |
| 9 | Método Observo–Interpreto–Cuestiono–Propongo con datos citados (CASEN, OCDE, INE) |
| 10 | Caso agua del Limarí: actores/intereses (tabla), evidencia (CR2/DGA), pregunta argumentativa |
| 11 | Proyecto: 11 campos (problema → propuesta) + rúbrica |
| 12 | Feria: presentación de 3 min + ticket final + rúbrica |

## Pruebas (misma estructura en todas)

Portada (asignatura, curso, unidad, OA, puntaje 30, tiempo 40 min) · 11 ítems (SM, V/F fundamentado, caso, respuesta breve) con puntaje · tabla de especificaciones · solucionario con justificación · pauta docente · versión DUA (menos distractores, instrucciones en pasos).

## Nota

- Los materiales duplicados/legados (E2E, moldes antiguos) se eliminaron; queda **1 material coherente por clase** + las pruebas de unidad. Recarga la página con **Ctrl+F5** para limpiar la caché local si aún ves materiales viejos.
- Para modificar una guía: edita `content/material-content.json` → `pnpm seed:content` (emulador) → descarga PDF/DOCX. En producción, el seed se aplica con autorización.
