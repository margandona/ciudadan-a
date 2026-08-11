# DUA y Accesibilidad — Estrategia

## 1. Marco

Diseño Universal para el Aprendizaje (DUA) + **WCAG 2.2 AA**. La tecnología amplía el acceso sin reemplazar la pedagogía.

## 2. DUA en el diseño instruccional

Cada clase explicita **4 preguntas** (también en proyección):

1. **QUÉ vamos a aprender** — aprendizaje esperado y objetivo.
2. **PARA QUÉ** — propósito, conexión con Ovalle/bien común.
3. **CÓMO** lo vamos a trabajar — ruta de aprendizaje.
4. **CÓMO sabremos si lo aprendimos** — criterios, rúbrica, evaluación formativa.

**Múltiples formas de representación:**
- texto + imágenes + mapas + esquemas/organizadores + audio opcional + video con subtítulos.
- Lectura clara, lenguaje simple, glosario de conceptos clave por misión.

**Múltiples formas de participación:**
- individual, pareja, grupo; oral, escrita; discusión, juego, simulación.
- Modo colectivo (proyección) y modo individual (aula invertida).

**Múltiples formas de expresión:**
- respuesta escrita, oral, esquema, organizador gráfico, producto visual cuando corresponda.
- Versiones GENERAL y DUA/adecuada del material (mismo OA).

## 3. Accesibilidad técnica (WCAG 2.2 AA)

| Área | Requisitos |
|---|---|
| **Teclado** | Navegación completa sin mouse; foco visible; orden lógico (2.1) |
| **Contraste** | ≥ 4.5:1 texto normal; ≥ 3:1 componentes (1.4.3/1.4.11) |
| **Texto** | Tamaños escalables (rem), sin pérdida de contenido al zoom 200–400% (1.4.4) |
| **Focus** | Indicador claro en todos los elementos interactivos (2.4.7) |
| **aria / landmarks** | `aria-label` en controles con icono, roles de landmark, encabezados correctos |
| **reduced motion** | `prefers-reduced-motion` desactiva animaciones no esenciales (2.3.3) |
| **Alto contraste** | Modo alto contraste como preferencia configurable (se suma a WCAG) |
| **No depender del color** | Estados también con icono/texto (color no único canal) (1.4.1) |
| **Imágenes** | `alt` descriptivo; infografías con alternativa textual |
| **Videos** | Subtítulos y transcripción cuando el recurso lo permite |
| **Formularios** | Labels asociadas, errores descriptivos, estados visibles (3.3) |
| **Proyección** | Letra grande, contraste alto, atajos de teclado, zoom, reducir motion |
| **Lenguaje** | Instrucciones simples, pasos numerados, español de Chile |

## 4. Preferencias de accesibilidad (protegidas)

- Se guardan en `students/{id}/protected/accessibilityPreferences` (solo roles autorizados).
- La estudiante puede ajustar: fuente legible, alto contraste, reducción de movimiento, tamaño de texto, apoyos visuales, audio opcional.

## 5. DUA en proyección

Cada diapositiva puede incluir el bloque «Para quién» (QUÉ/PARA QUÉ/CÓMO/CÓMO SABREMOS) y ofrece: lectura del texto (opcional), imágenes/mapas de apoyo, instrucciones numeradas, y alternativas de respuesta (oral/escrita/esquema).

## 6. Verificación

- Tests de accesibilidad automatizados (axe-core) en componentes y E2E (ver `docs/TEST_STRATEGY.md`).
- Checklist manual de teclado, foco, contraste, zoom, reduced motion en `docs/MANUAL_TEST_PLAN.md`.
- Prueba con lectores de pantalla (NVDA/VoiceOver) en las rutas críticas (estudiante, proyección).
