# Costos e índices de Firestore

Análisis de las consultas que introduce (y usa) la Granja Ciudadana, con estimación de
lecturas y recomendaciones. Precios de referencia: Firestore Blaze `us-central1`
≈ **$0.06 / 100 000 lecturas** de documento.

## 1. Índices

**No se requieren índices nuevos.** Todas las lecturas de la feature son:

| Colección | Acceso | Índice |
|---|---|---|
| `farms/{uid}` | `get` por id + `onSnapshot` | automático (documento) |
| `conceptQuizzes/{level}` | `get` por id | automático (documento) |
| `studentBadges/{uid}/badges` | `get` de subcolección | automático |
| `badges` | `orderBy(order)` | automático (campo único) |

Las consultas del cálculo de XP (`submissions`, `participation`, `exitTickets`,
`flippedProgress`, `quizzes`, `quizAttempts`) usan los **índices ya existentes**
(`firestore.indexes.json`) o índices de campo único automáticos.

## 2. El costo real: `computeActivityXp`

`getFarm` y `getStudentGamification` calculan el XP de actividad con `computeActivityXp`
(`packages/infrastructure/src/firebase/gamification.ts`). Recorre **13 clases** y por cada
una lee **todos los registros del curso** (no solo los de la estudiante):

```
por clase:  flippedProgress(≤S) + submissions(≤S) + participation(≤S) + exitTickets(≤S)
            + quizzes(≤2) + intentos de quiz(≤2)
+ classes.listAll(13) + studentBadges(≤32)
```

Con `S` ≈ 40 estudiantes por curso:

```
13 clases × (40+40+40+40+2+2) + 45 ≈ 2 150 lecturas por cálculo
```

> Esto es un patrón **preexistente** de la gamificación/badges; la feature lo **duplicó**
> al agregar `getFarm` (que recalcula lo mismo que `getStudentGamification`).

### Flujo de una estudiante (1 sesión)

| Pantalla | Llamadas pesadas | Lecturas aprox. |
|---|---|---|
| Inicio (home) | `getBadgesForStudent` + `getStudentGamification` | ~4 000 |
| Granja | `getFarm` | ~2 000 |
| **Total** | | **~6 000** |

### Estimación (75 estudiantes = 41 D + 34 E)

| Escenario | Lecturas/día | Lecturas/mes | Costo/mes |
|---|---|---|---|
| 1 sesión/día | ~450 000 | ~13,5 M | **~$8** |
| 2 sesiones/día | ~900 000 | ~27 M | ~$16 |

- **Escrituras**: `getFarm` guarda el doc de la granja en cada carga; cada acción
  (plantar/cosechar/comprar/equipar) es 1 lectura + 1 escritura. Escrituras ≈
  $0.18/100k → despreciable a esta escala.
- **`onSnapshot`**: 1 lectura al suscribirse + 1 por cambio del doc de la granja.
  Despreciable (solo cambios de esa estudiante).
- El **cálculo de badges del docente** (`getCourseDashboard`, `getCourseAnalytics`) es
  otro consumidor de estos escaneos amplios.

## 3. Optimizaciones recomendadas

### A. Consultas por estudiante — ✅ IMPLEMENTADA Y DESPLEGADA

`computeActivityXp` (`gamification.ts`) y `FirestoreActivityStatsRepository.getForStudent`
(`content-repositories.ts`) ahora leen **solo los registros de la estudiante** usando
métodos que ya existían en los repositorios:

| Dato | Antes (escaneo) | Después |
|---|---|---|
| Aula invertida | `flipped.listByClass` (≤S) | `flipped.get(classId, uid)` (1) |
| Participación | `participation.listByClass` (≤S) | `participation.get(courseId, classId, uid)` (1) |
| Tickets | `exitTickets.listByClass` (≤S) | `exitTickets.get(classId, uid)` (1) |
| Evidencias | `submissions.listByClass` (≤S) | `submissions.findByStudent(uid)` (1 + N) |
| Quiz | `quizAttempts.get` (≤2) | igual (≤2) |

Resultado: de **~2 150** a **~100–150 lecturas** por cálculo (**~15–20×** menos).
Costo mensual estimado: **~$0.40–0.60** (1 sesión/día).

Verificado en local con emuladores (`pnpm verify:farm` → 12/12 + E2E 2/2) y desplegado a
producción; el smoke test confirmó `getFarm`, `getStudentGamification` y
`getBadgesForStudent` funcionando. Regresión cubierta por
`packages/infrastructure/src/firebase/gamification.test.ts`.

### B. Caché de `activityXp` con TTL (rápido)

`getFarm` ya guarda `activityXp` en `farms/{uid}`. Agregar una marca de tiempo y **reusar**
ese valor (p. ej. si tiene < 10 min) tanto en `getFarm` como en `getStudentGamification`
evita recalcular dos veces por sesión. Reduce ~1/3 de los escaneos pesados sin cambiar
repositorios. Trade-off: el XP mostrado puede quedar unos minutos desactualizado.

### C. Incluir `activityXp` en `getStudentGamification`

Hacer que `getStudentGamification` calcule una vez y persista el resultado en la granja
(o en un doc `studentStats/{uid}`), y que `getFarm` solo lo lea. Combina con B.

> Recomendación: implementar **A** (mayor ganancia y sin índice nuevo). **B/C** ayudan si
> se mantiene el patrón de escaneo.

## 4. Conclusión

- **Índices**: no hay que agregar ninguno.
- **Antes**: ~$8–16/mes (75 estudiantes) por los escaneos amplios de XP/badges.
- **Ahora (optimización A aplicada)**: ~**$0.40–0.60/mes** (~15–20× menos); las acciones de
  granja quedan en 1–2 lecturas + 1 escritura cada una.
- B (caché TTL) y C (persistir el XP) ya no son necesarias, pero sirven si se vuelve a
  recalcular de más.
