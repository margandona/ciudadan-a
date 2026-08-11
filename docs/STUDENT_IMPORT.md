# Importación de estudiantes

Cómo importar las nóminas reales de los cursos **3º Medio D** y **3º Medio E** (Educación Ciudadana, 2026) respetando privacidad y minimización de datos.

## 1. Formato soportado

- `.xlsx` / `.xls` (SheetJS).
- Se toleran variaciones de encabezados (`Nombre`, `Nombres`, `Estudiante`, `Alumna`, `Nombre completo`, `Apellidos`/`Apellido`, `Curso`/`Sección`, `Correo`/`Email`, `Nº`/`Matrícula`, `Estado`).

### Estructura detectada en las nóminas reales

| Fila | Contenido |
|---|---|
| 1 | Banner institucional (p. ej. "COLEGIO LA PROVIDENCIA") |
| 2 | Curso (p. ej. "3º Medio D") → **identifica el curso** |
| 3 | Asignatura ("Educación Ciudadana") |
| 4 | (separador) |
| 5 | Encabezados: `Nº` · `Nombre completo` · `RUN` · `Estado` |
| 6+ | Estudiantes |

- `Estado` → `active` (Matriculado = true, Retirado = false).
- `Nº` → `listNumber` (opcional, nunca es primary key).
- `RUN` → **columna sensible, NO se importa** (minimización de datos).

## 2. Flujo (preview obligatorio)

```
Excel → Parser → Normalización → Validación → Detección de duplicados
     → PREVIEW (editable) → Confirmación → Importación a Firestore
```

1. **Subir** el `.xlsx` en `/teacher/students/import` (web) o `npm run import:students -- --file=...`.
2. El sistema muestra **resumen** (archivo, curso detectado, nuevas, duplicadas, posibles duplicadas, con advertencias, bloqueadas, listas para importar, campos sensibles).
3. Tabla editable: la columna "Nombre interpretado" permite **corregir sin tocar el Excel original**. El original siempre se conserva.
4. **Confirmar** → se importa al emulador (o al entorno elegido).

> Nunca se guarda el archivo; se procesa en memoria (web) o desde ruta privada (CLI). Las credenciales y nóminas reales viven en `3ro/` (ignorado por Git).

## 3. Identificadores y modelo

- `studentId` = **UUID propio** (nunca RUT/correo/nombre como id).
- `studentId` ≠ `userId` (cuenta de Auth). El registro académico existe aunque la estudiante aún no tenga cuenta.
- Modelo normalizado: `displayName` (original, con tildes y Ñ intactas) + `normalizedSearchName` (interno para búsqueda y comparaciones) + partes opcionales (`firstName`, `middleName`, `paternalSurname`, `maternalSurname`) + `courseId` + `active` + `archivedAt` + `academicProfile`.
- Curso con id determinístico `course-3med-{sección}-{año}` y documento `courses/{id}`.

## 4. Validaciones

| Caso | Comportamiento |
|---|---|
| Nombre faltante | Bloqueado (`MISSING_NAME`) |
| Espacios duplicados / iniciales-finales | Advertencia (no corrige en silencio) |
| Mayúsculas completas | Advertencia informativa |
| RUN / teléfono / dirección / nacimiento / PIE / salud… | Columna sensible detectada y **no importada** |
| Curso no determinable | `COURSE_NOT_DETERMINED` (bloqueado); no se inventa |

## 5. Duplicados

Clasificación por `normalizedSearchName + courseId`:

- **NUEVA** — no existe en el curso.
- **DUPLICADO CONFIRMADO** — coincidencia exacta; en importación **se actualiza** (no se duplica) y se **reactiva** si estaba inactiva.
- **POSIBLE DUPLICADO** — mismo primer nombre + apellido compartido; **se omite** y se reporta (nunca se fusiona automáticamente).

## 6. Seguridad y privacidad

- Datos reales = privados: `3ro/*.xlsx`, `3ro/*.json`, `private-data/` en `.gitignore`.
- RUN y campos sensibles no se importan ni se loguean.
- Auditoría: cada importación escribe `auditLogs` con conteos y `courseIds`, **sin nombres**.
- Reglas Firestore: estudiantes legibles por PROFESOR/ADMIN del curso; escrituras solo vía Functions (`onlyServer`).
- **Nunca se importa a producción** sin `--prod` explícito y autorización: el script exige el emulador por defecto.

## 7. CLI

```bash
# requiere emulador de Firestore corriendo
$env:FIRESTORE_EMULATOR_HOST="127.0.0.1:8088"   # (PowerShell)

# preview (dry-run, no guarda)
pnpm import:students -- --file="3ro\Estudiantes 3º Medio D-Educación Ciudadana.xlsx"

# importar al emulador
pnpm import:students -- --file="3ro\Estudiantes 3º Medio D-Educación Ciudadana.xlsx" --apply
pnpm import:students -- --file="3ro\Estudiantes 3º Medio E-Educación Ciudadana.xlsx" --apply

# análisis reutilizable de cualquier nómina
pnpm analyze:roster -- --file="<ruta>.xlsx"
```

## 8. Rollback

- El import es **idempotente** (re-importar no duplica).
- Si una importación falla a mitad, las escrituras usan `batch` de Firestore (atómico por lote de 500).
- Retirar ≠ borrar: se usa **soft delete** (`active=false` + `archivedAt`); el historial se conserva.

## 9. Pruebas

- Unit: `packages/domain`, `packages/application` (parser, normalización, dedup, import).
- Component: `StudentImportView.test.ts`.
- Reglas Firestore: `tests/rules`.
- Integración + aislamiento entre cursos: `tests/integration` (emulador).
- Los fixtures de test usan **estudiantes ficticias** (`Ana Demo Uno`, …), nunca nombres reales.
