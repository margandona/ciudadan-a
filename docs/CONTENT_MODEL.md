# Arquitectura del contenido educativo

## 1. Principio

**Contenido ≠ código.** El contenido de las 12 misiones vive en archivos JSON versionados (`content/missions/`) y se carga a Firestore mediante **seed scripts**; también se puede editar en la app (profesor) y en Firestore sin recompilar.

## 2. Estructura de contenido

```
content/
├─ oas.json                      # catálogo curricular (OA4, OA6, OA7 con texto MINEDUC)
├─ units.json                    # U3, U4
├─ badges.json                   # 10 medallas
├─ courses.json                  # Curso Demo A / Curso Demo B
├─ students.demo.json            # estudiantes ficticias DEMO (marcadas explícitamente)
├─ materials.json                # plantillas de materiales (guía/evaluación/rúbrica/pauta/solucionario)
├─ missions/
│  ├─ 01/  flipped.json  slides.json  quiz.json  activity.json  game.json  materials.json
│  ├─ 02/ ...
│  └─ 12/ ...
└─ assets/                       # imágenes, mapas, infografías (con atribución en metadata)
```

## 3. Modelo de bloques (contenido estructurado)

Unidad mínima de contenido: `Block = { id, type, data, meta }`.

| type | data | Notas |
|---|---|---|
| `title` | texto | |
| `text` | markdown breve (sanitizado) | sin HTML arbitrario |
| `image` | url, alt, caption, attribution {author, license, source, originalUrl} | licencia verificada |
| `video` | url (YouTube/educativo), poster | |
| `map` | ref a mapa (Leaflet/GeoJSON embebido controlado) | |
| `infographic` | imagen + alt + attribution | |
| `quote` | cita, autor, fuente | |
| `data` | gráfico: tipo, dataset, fuente (INE/BCN/CEPAL…) | con atribución |
| `question` | prompt + opciones (para proyección/discusión) | |
| `quizRef` | `quizId` | motor de quizzes |
| `gameRef` | `gameId` | framework de minijuegos |
| `instruction` | pasos numerados | |
| `timer` | segundos, etiqueta | |
| `activity` | actividad, evidencia esperada, enlace a `activities/{id}` | |
| `exitTicket` | preguntas del ticket de salida | |
| `callout` | llamada de atención (informativa, no punitiva) | |
| `compare` | comparación A/B | |
| `accordion` | secciones desplegables | |
| `resource` | enlace/carga de material complementario | |

- Se renderiza con un componente `BlockRenderer` (mapa type → componente).
- **Sanitización:** los bloques se validan en Functions (esquema, tipos, URLs permitidas, lista blanca de tipos); el HTML generado es del renderer, no del editor.
- **Editor (slide builder):** paleta de bloques; guardado como JSON estructurado con versionado (`presentations/{classId}/history`).

## 4. Estructura pedagógica de la presentación (proyección)

Orden de diapositivas obligatorio (ver `docs/PRODUCT_DESIGN.md`):

1. Portada / misión → 2. Aprendizaje esperado → 3. Objetivo → 4. Ruta de aprendizaje → 5. Activación → 6+. Contenido breve → actividad → pregunta interactiva → quiz → discusión → actividad principal → evaluación formativa → síntesis → **ticket de salida**.

Se valida en el editor: la secuencia debe completarse para guardar/publicar.

## 5. Aula invertida (10–15 min)

Bloques permitidos: título de misión, objetivo, pregunta problematizadora, microcontenido, conceptos, video, imagen, mapa, infografía, lectura breve, quizRef, gameRef, reflexión, recurso, botón «Estoy lista para la misión» (cerrado automáticamente al completar los pasos). Progreso individual en `flippedProgress`.

## 6. Quizzes y minijuegos

- Motor de quizzes propio (sin branding ajeno) con tipos: selección múltiple, V/F, ordenar, emparejar, completar, respuesta breve, identificar sobre imagen, pregunta con imagen, pregunta con mapa.
- Minijuegos reutilizables: clasificar, relacionar, ordenar, decidir, dilema, presupuesto limitado, argumentos, línea de decisiones, V/F, tablero de desafíos. Cada uno declara `oaRef` (debe responder a un OA).
- El **simulador presupuestario** (Clase 8) es un juego de tipo `budget` con `config` configurable (100 unidades, 8 ramos, 5 indicadores).

## 7. Fuentes y licencias de contenido

- **Fuentes preferentes:** MINEDUC, BCN, INE, Banco Central de Chile, organismos públicos, ONU, CEPAL, UNESCO, fuentes académicas; Wikimedia Commons (licencias verificadas) para imágenes.
- Cada recurso externo guarda: `originalUrl`, `author`, `license`, `source` y se muestra atribución.
- **No** se descargan ni reutilizan imágenes sin verificar derechos.
- **Separación editorial:** los textos del profesor (editorial) se distinguen de las fuentes externas mediante `meta.provenance` (`internal` | `external`).
- Validación en seed y CI: todo `external` debe traer `license` + `originalUrl`.

## 8. Versiones DUA/PIE

Cada material puede tener `kind: GENERAL` y `kind: DUA` (misma OA). La versión DUA se genera con pauta de `docs/DUA_GUIDELINES.md` (lectura simple, apoyos visuales, alternativas de respuesta). El evaluador revisa ambas.

## 9. Seed y ciclo de vida

1. `content/missions/*/json` → `scripts/seed.ts` (usa Emulator o entorno de destino) → Firestore.
2. Los IDs de contenido son estables (`mission-01`…, `quiz-m01-*`), permitiendo actualizaciones idempotentes (`upsert`).
3. En FASE 3 se crea el contenido DEMO completo de las 12 misiones (textos y preguntas base). El detalle de audio/video/mapas reales se completa en iteraciones de contenido con el profesor.
4. Curso Demo A y Demo B con estudiantes ficticias marcadas como `DEMO`; reemplazo por listas reales en FASE 2 (import CSV/JSON).

## 10. Estado de contenido (FASE 3)

- **Sembrado en emulador:** catálogo `classes.json` (12 misiones) + `flippedLesson` de las 12 misiones (`content/missions/01–12/flipped.json`).
- Cada aula invertida incluye: título, objetivo, pregunta problematizadora, conceptos, microcontenido, lectura breve, 2 preguntas con retroalimentación, reflexión y recurso complementario; **10–15 min**; botón «Estoy lista para la misión».
- Los bloques `image/video/map/infographic` quedan como **pendientes de verificación de derechos** (`attribution.verified: false`); el reproductor muestra un aviso y no se reutiliza material sin licencia verificada.
- Edición sin recompilar: modifica los JSON y ejecuta `pnpm seed:content`.

## 11. Ejemplo (Clase 6 — Cabildo Providencia)

- `missions/06/flipped.json` → aula invertida «¿Cómo se argumenta en un cabildo?»
- `missions/06/slides.json` → presentación con evaluación auténtica.
- `missions/06/activity.json` → `type:'cabildo'`, tema fijo **«Nuestro territorio necesita…»** (corrección aplicada: no «Unser territorio necesita…»).
- `missions/06/materials.json` → rúbrica + autoevaluación + coevaluación (opcional) + evaluación docente.
