# FASE 0 — Plan de los documentos institucionales (PDF/DOCX) de materiales

**Estado:** ✅ IMPLEMENTADO (0.17.1) — membrete y plantilla institucional aplicados en `functions/src/material-docs.ts`.
**Objetivo:** definir la planificación de **cada documento pedagógico** (guías, pruebas, rúbricas, pautas, solucionarios, DUA/PIE, tablas de especificaciones) para **completarlos y dejarlos listos**, incorporando el **membrete institucional** (Imagen1.png) y un formato institucional formal.

---

## 1. Diagnóstico (revisión de los documentos generados)

Los PDF/DOCX generados actualmente son **funcionales pero incompletos** para uso institucional. Verificado con muestras reales:

| # | Problema detectado | Detalle |
|---|---|---|
| D1 | **Falta el membrete** | No se incluye la imagen `Imagen1.png` (334×146 px) en el encabezado. |
| D2 | **Cabecera institucional incompleta** | No muestra fecha, nombre del curso, unidad completa ni OA en bloque; duplica el título y la línea «Colegio La Providencia». |
| D3 | **Sin portada en pruebas** | Las evaluaciones no muestran bloque de portada (asignatura, curso, unidad, OA, puntaje, instrucciones, tiempo) al inicio. |
| D4 | **Espacios de respuesta sin líneas** | Los bloques «Espacio de respuesta» salen vacíos (sin pauta de escritura/líneas). |
| D5 | **Tablas sin formato** | En PDF las tablas se imprimen como texto con «|»; en DOCX la tabla es mínima (sin bordes/anchura). |
| D6 | **Sin pie de página** | No hay pie con número de página, nombre del material ni referencia institucional. |
| D7 | **Rúbrica/solucionario/tabla de especificaciones** | Se listan como texto plano; no como tablas formales con columnas. |
| D8 | **Respuestas de ítems** | Las alternativas se imprimen, pero no el puntaje por ítem en la portada ni la suma total (pruebas). |

## 2. Membrete institucional

- Imagen: `Imagen1.png` (334×146 px) — se colocará **arriba a la izquierda** del documento (o centrada según el diseño del membrete), seguida de los datos institucionales.
- En PDF (pdfkit): `doc.image(path, x, y, { width: 110 })`.
- En DOCX (docx): `ImageRun` con `transformation` (ancho 140–160 px).
- El archivo debe residir en `functions/src/assets/` o `functions/assets/` (se copia en el deploy) — alternativa: usar `public/icon` no corresponde; se añadirá `functions/src/Imagen1.png` y se referencia con `path.join(__dirname, ...)`.
  - ⚠️ Es un archivo binario; se agregará al repo (no es secreto).

## 3. Plantilla institucional del documento (estructura común)

**Encabezado (todas las páginas):**
1. Membrete (Imagen1.png) + línea institucional «Colegio La Providencia · Ovalle — Educación Ciudadana · Prof. Marcos Argandoña».
2. Fila de datos: **Curso | Unidad | Fecha | Nº de clase**.
3. Título del documento + tipo (Guía de Aprendizaje / Evaluación / Rúbrica / Pauta / Solucionario / Ticket).
4. Bloque curricular: **OA · Objetivo de la clase · Indicadores** (cuando existan).

**Cuerpo:**
- Secciones (títulos numerados, textos, listas, tablas con bordes, espacios de respuesta con líneas).
- Ítems de evaluación (con puntaje y alternativas).
- Rúbrica (tabla: criterios × niveles), solucionario (tabla), tabla de especificaciones (tabla).

**Pie de página:**
- Nombre del material + vN · página X de Y · «Plataforma Observatorio Ciudadano — Ovalle 2035».

## 4. Plan por tipo de documento

### 4.1 Guía de Aprendizaje (GUIDE / WORKSHEET / READING / LECTURA)
| Elemento | Acción |
|---|---|
| Encabezado | Membrete + datos + título + bloque curricular (OA/objetivo/indicadores) |
| Instrucciones | Lista numerada, segmentada |
| Actividad | Texto/caso del contenido |
| Espacio de respuesta | Líneas pautadas (6–8 líneas) para escritura |
| Cierre / reflexión | Texto + líneas |
| Tablas | Con bordes y anchura completa |
| Páginas | 1–3 máx (según tipo) |

### 4.2 Evaluación escrita (WRITTEN_TEST / ASSESSMENT / EVALUACION)
| Elemento | Acción |
|---|---|
| **Portada** | Asignatura, curso, unidad, OA, puntaje total, instrucciones, tiempo (40 min) |
| Ítems | Alternativas (a,b,c), V/F, caso, respuesta breve — cada uno con puntaje visible |
| **Tabla de especificaciones** | Tabla formal (OA, indicador, contenido, habilidad, ítem, puntos, nivel) |
| **Solucionario** | Tabla (ítem, respuesta, puntos, justificación) |
| **Pauta** | Instrucciones de aplicación y criterios |
| Versión DUA/PIE | Misma prueba con menos distractores, instrucciones segmentadas, más espacio, tipografía mayor |

### 4.3 Rúbrica (RUBRIC)
| Elemento | Acción |
|---|---|
| Encabezado | Datos + título |
| Escala | Tabla o línea: 4 Logrado destacado · 3 Logrado · 2 En desarrollo · 1 Inicial |
| Criterios | **Tabla**: criterio × niveles (descriptores observables) |

### 4.4 Pauta / Solucionario (ANSWER_KEY / SCORING_GUIDE / PAUTA)
| Elemento | Acción |
|---|---|
| Encabezado | Datos + referencia al material |
| Solucionario | Tabla (ítem, respuesta correcta, puntos, justificación/criterio) |
| Pauta docente | Instrucciones de aplicación, nota = puntaje × 7, criterios |

### 4.5 DUA / PIE (DUA_VERSION / PIE_VERSION)
| Elemento | Acción |
|---|---|
| Encabezado | Igual + nota «Versión DUA/adecuada» |
| Instrucciones | Segmentadas, paso a paso |
| Ítems | Menos distractores, lenguaje claro, más espacio |
| Tipografía | Tamaño mayor, interlineado amplio |

### 4.6 Ticket de salida (EXIT_TICKET) / Trabajo (PRACTICAL_WORK) / Proyecto (PROJECT)
- Ticket: preguntas + espacio pautado.
- Trabajo/Proyecto: portada (producto), instrucciones, campos numerados, rúbrica vinculada.

## 5. Plan por clase (ajustes a completar)

| Clase | Documento(s) | Faltante a completar en el documento |
|---|---|---|
| 1 | Diagnóstico + pauta + ticket | Portada del diagnóstico con puntaje/tabla de especificaciones; ticket con líneas |
| 2 | Consejo Ciudadano + rúbrica | Tabla de argumentos con bordes; rúbrica como tabla formal |
| 3 | Mapa de participación | Tabla «Espacio / Tipo / Incidencia» con bordes; espacio de argumento con líneas |
| 4 | Cartografía social | Campos con líneas pautadas; croquis sugerido |
| 5 | Expediente Ciudadano | 8 secciones con líneas; tabla de fuentes/evidencia |
| 6 | Cabildo (trabajo + rúbrica + pauta + espec.) | Portada del trabajo; rúbrica y tabla de especificaciones formales; autoevaluación con líneas |
| 7 | ¿Quién resuelve? | Tabla de casos con bordes; cierre con líneas |
| 8 | Presupuesto comunal (ABJ) | Tabla DECISIÓN/COSTO/JUSTIFICACIÓN/IMPACTO con bordes |
| 9 | Laboratorio de Datos | Bloques OBSERVO/INTERPRETO/CUESTIONO/PROPONGO con líneas |
| 10 | Agua Limarí | Tabla de actores/intereses con bordes; pregunta argumentativa con líneas |
| 11 | Proyecto 2035 + rúbrica | 11 campos con líneas; rúbrica formal |
| 12 | Feria (instrucciones + rúbrica + pauta + ticket) | Portada; rúbrica formal; ticket final con líneas |
| U3 | Prueba general + DUA + solucionario | **Portada**; ítems con puntaje; tabla de especificaciones; solucionario formal |
| U4 | Prueba general + DUA + solucionario | Ídem |

## 6. Criterios de completitud (checklist por documento)

- [ ] Membrete visible en el encabezado.
- [ ] Datos institucionales: asignatura, curso, unidad, fecha, nº de clase, profesor.
- [ ] Bloque curricular: OA, objetivo, indicadores.
- [ ] Título + tipo del documento.
- [ ] Instrucciones claras y numeradas.
- [ ] Espacios de respuesta con líneas.
- [ ] Tablas con bordes y anchura completa.
- [ ] Pruebas: portada con puntaje/tiempo, ítems con puntaje, tabla de especificaciones, solucionario.
- [ ] Rúbricas: escala + criterios × niveles.
- [ ] Pie de página con página X de Y y referencia.
- [ ] Versión DUA/PIE con instrucciones segmentadas y tipografía mayor.
- [ ] 1–3 páginas según tipo (breve).

## 7. Archivos a modificar / crear

| Archivo | Acción |
|---|---|
| `functions/src/material-docs.ts` | Reescritura: membrete, plantilla institucional, tablas con bordes, líneas de respuesta, portada de pruebas, pie de página, tipografía DUA |
| `functions/src/assets/Imagen1.png` | Copiar el membrete (se referencia en el generador) |
| `functions/package.json` | Sin cambios de deps (pdfkit/docx ya instalados) |
| `packages/shared/src/material.ts` | (opcional) campos `classNumber`, `classDate` ya existen |
| `docs/INFORME_IMPLEMENTACION_MATERIALES.md` | Actualizar tras implementar |
| `content/material-content.json` | (si se detectan textos/estructuras a corregir por clase) |

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| No poder verificar visualmente el membrete (modelo sin visión) | Se coloca en posición estándar (arriba izquierda) con tamaño fijo; se puede ajustar con feedback |
| pdfkit requiere el binario del membrete en el bundle | Se referencia con `--external:fs` no aplica; se usa `path.join(__dirname, 'assets/Imagen1.png')` y se incluye en el deploy |
| DOCX con imagen | `ImageRun` requiere bytes; se lee el archivo y se inserta |
| Regresión de pruebas | Se conservan tests existentes; se añaden tests de generación (PDF/DOCX no vacíos, con membrete) |

---

**¿Apruebas esta Fase 0 (plan de completitud de los documentos con membrete) para proceder a implementarla?**
