# Riesgos

## Riesgos técnicos

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| T1 | Reglas Firestore mal configuradas → fuga de datos entre estudiantes | Media | Alto | Tests de reglas por PR (R1–R18), revisión en FASE 12, mínimo privilegio |
| T2 | Comportamiento de proyección en hardware del colegio (proyector, pizarra, navegador viejo) | Media | Medio | Pruebas en dispositivo real, fallback teclado/mouse, soporte navegadores modernos |
| T3 | Sincronización offline conflictiva (duplicados, IDs locales) | Media | Alto | IDs idempotentes, reconciliación en Functions, tests FLOW 8 |
| T4 | Costos de Firestore (lecturas/escrituras) al crecer | Media | Medio | Agregados denormalizados, consultas mínimas, presupuesto y alertas |
| T5 | Dependencia de proveedores (Firebase) y cambios de precios/API | Baja | Medio | Adapter pattern en infrastructure; documentación |
| T6 | Emulador vs producción: diferencias de comportamiento | Baja | Medio | CI corre contra Emulator y staging idéntico |
| T7 | Ataques: rate limiting insuficiente en Functions | Media | Alto | Throttling por uid, App Check, revisión periódica |
| T8 | Contenido grande (mapas/videos) degradando performance en colegio | Media | Medio | Pre-carga, lazy loading, optimización de assets, proyección-first |
| T9 | Windows: rutas/CORS/emuladores en desarrollo | Media | Bajo | Scripts dedicados, docs, pnpm |

## Riesgos pedagógicos

| # | Riesgo | Mitigación |
|---|---|---|
| P1 | La tecnología reemplaza la conversación pedagógica | Principio explícito: herramienta de preparación/registro; proyección guía, no sustituye al docente |
| P2 | Gamificación mal calibrada (competencia, presión) | Medallas sin nota, sin rankings, mensajes positivos, diseño sobrio |
| P3 | Registro de participación visto como vigilancia | Escala formativa, observaciones breves, no punitiva, sin juicios |
| P4 | Etiquetado/estigmatización de estudiantes | Prohibido diagnósticos automáticos y adjetivos; indicadores solo académicos |
| P5 | Datos PIE/integración expuestos | Dato protegido, roles autorizados, nunca visible para estudiantes/evaluador |
| P6 | Carga cognitiva alta en aula invertida | 10–15 min, DUA, pasos claros, sin tiempos punitivos |
| P7 | Feedback anónimo mal implementado (identificación por metadatos) | Agregación sin metadatos, revisión en tests |
| P8 | Contenido poco situado en Ovalle/Limarí | Seeds revisados con el profesor; fuentes locales (INE/BCN/plan comunal) |
| P9 | Desigualdad de acceso a dispositivos/conectividad | PWA instalable + offline parcial + versiones imprimibles de guías |
| P10 | Evaluación auténtica sin rúbricas claras | Rúbricas, autoevaluación y coevaluación definidas en contenido (Clases 6 y 12) |

## Riesgos de privacidad/legal (menores de edad)

- Recolección mínima de datos; consentimiento institucional; derecho de borrado.
- Cumplimiento de referencia Ley 19.628 (validación legal institucional antes de producción).
- Procesamiento de datos personales de estudiantes solo dentro del dominio institucional.
