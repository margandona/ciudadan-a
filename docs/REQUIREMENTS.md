# Requerimientos — Providencia Ciudadanía Lab

Convención de IDs: `FR-<n>` (funcional), `NFR-<n>` (no funcional), `RQ-<n>` (regla de negocio). Prioridad: **M** (MVP) / **V2** (post-MVP).

---

## 1. Requerimientos funcionales

### A. Autenticación y roles (RBAC)

| ID | Requerimiento | Prio |
|---|---|---|
| FR-001 | Inicio de sesión con email/contraseña (Firebase Auth). | M |
| FR-002 | Recuperación de contraseña. | M |
| FR-003 | Roles: `MASTER`, `ADMIN`, `PROFESOR`, `EVALUADOR`, `ESTUDIANTE`, `MODO_PROYECCION`; preparados `PIE`, `UTP`. | M |
| FR-004 | `MODO_PROYECCION` permite ingresar a `/projection/:classId` con token de proyección (no requiere credenciales de estudiante). | M |
| FR-005 | Cierre de sesión y expiración de sesión con redirección limpia. | M |
| FR-006 | Gestión de usuarios por MASTER/ADMIN (crear, desactivar, asignar rol y cursos). | M |
| FR-007 | Auditoría de cambios de permisos. | M |

### B. Cursos y estudiantes

| ID | Requerimiento | Prio |
|---|---|---|
| FR-010 | Múltiples cursos; cada curso tiene una lista de miembros. | M |
| FR-011 | Importación de estudiantes por CSV y/o JSON (campos: `studentId`, `firstName`, `lastName`, `preferredName`, `email`, `courseId`, `active`, `integrationSupport`, `accessibilityPreferences`). | M |
| FR-012 | `integrationSupport` y preferencias de accesibilidad son **protegidos** (solo roles autorizados); nunca visibles públicamente ni para estudiantes. | M |
| FR-013 | Altas y bajas de estudiantes con historial. | M |
| FR-014 | Datos DEMO claramente marcados (Curso Demo A / Demo B) para desarrollo; reemplazo posterior con listas reales. | M |

### C. Perfil y progreso de estudiante

| ID | Requerimiento | Prio |
|---|---|---|
| FR-020 | Perfil académico individual: nombre, curso, avatar opcional, progreso, clases realizadas/pendientes, quizzes, intentos, actividades, evidencias, participación, insignias, retroalimentaciones, tickets de salida, evolución, fortalezas y aspectos por desarrollar (solo académicos), feedback entregado, fecha de última actividad. | M |
| FR-021 | Timeline individual de actividad. | M |
| FR-022 | Prohibido: diagnósticos psicológicos automáticos, etiquetar estudiantes, comparaciones públicas. | M |
| FR-023 | Aislamiento: una estudiante NO ve notas, participación, feedback ni resultados de otras. | M |

### D. Aula invertida

| ID | Requerimiento | Prio |
|---|---|---|
| FR-030 | Cada una de las 12 clases tiene experiencia previa de 10–15 min con bloques: título de misión, objetivo, pregunta problematizadora, microcontenido, conceptos, video, imágenes, mapas, infografía, lectura breve, quiz, minijuego, reflexión, recurso complementario y botón «Estoy lista para la misión». | M |
| FR-031 | Registro de acceso, progreso, término, quiz (intentos), tiempo aproximado de interacción (no punitivo) y respuesta reflexiva. | M |
| FR-032 | Modo individual; el tiempo no penaliza. | M |

### E. Contenido, quizzes y minijuegos

| ID | Requerimiento | Prio |
|---|---|---|
| FR-040 | Motor de quizzes propio con tipos: selección múltiple, V/F, ordenar, emparejar, completar, respuesta breve, identificar sobre imagen, pregunta con imagen y con mapa. | M |
| FR-041 | Quizzes configurables: temporizador opcional, puntos, intentos, retroalimentación inmediata, explicación posterior; modo individual (aula invertida) y modo clase/proyección (colectivo). | M |
| FR-042 | Identidad visual propia (no imitar Kahoot). | M |
| FR-043 | Framework reutilizable de minijuegos: clasificar, relacionar, ordenar, tomar decisiones, dilema ciudadano, presupuesto limitado, construir argumentos, línea de decisiones, V/F, tablero de desafíos. | M |
| FR-044 | Los juegos responden a OA (no entretenimiento gratuito). | M |

### F. Evidencias y entregas

| ID | Requerimiento | Prio |
|---|---|---|
| FR-050 | Las actividades relevantes generan evidencia con tipos: texto, respuesta corta, selección múltiple, fotografía, PDF, documento, imagen, enlace, audio opcional, archivo, formulario, ticket de salida. | M |
| FR-051 | Campos de evidencia: `activityId`, `studentId`, `courseId`, `classId`, `submittedAt`, `content`, `attachments`, `status`, `teacherFeedback`, `score` opcional, `rubricData`. | M |
| FR-052 | Estados: `pendiente`, `entregado`, `revisado`, `retroalimentado`, `requiere corrección`. | M |
| FR-053 | Profesor revisa, comenta, evalúa y solicita correcciones. | M |

### G. Participación

| ID | Requerimiento | Prio |
|---|---|---|
| FR-060 | Registro de participación por habilidades: intervención oral, trabajo grupal, argumentación, colaboración, escucha, resolución de problemas, aporte de evidencia, liderazgo, mediación, pensamiento crítico. | M |
| FR-061 | Escala configurable (0 = sin evidencia, 1 = inicial, 2 = en desarrollo, 3 = logrado). No punitiva, no vigilancia. | M |
| FR-062 | Registro rápido en clase, observaciones breves, marcado múltiple; evolución por clase/curso/habilidad. | M |

### H. Modo proyección

| ID | Requerimiento | Prio |
|---|---|---|
| FR-070 | Interfaz independiente `/projection/:classId`, pantalla completa, navegación por teclado, siguiente/anterior, temporizador, zoom, mostrar/ocultar respuesta, preguntas, votaciones, quiz colectivo, ruleta opcional, revelar contenido, mapas, imágenes, videos, gráficos. | M |
| FR-071 | Estructura pedagógica obligatoria de la presentación (ver `docs/PRODUCT_DESIGN.md`). | M |
| FR-072 | Editor de presentaciones por bloques (slide builder) con tipos de bloque enumerados; contenido estructurado y sanitizado en Firestore (no HTML arbitrario). | M |

### I. Evaluador y materiales

| ID | Requerimiento | Prio |
|---|---|---|
| FR-080 | Portal evaluador con acceso solo a material autorizado (sin datos innecesarios de estudiantes). | M |
| FR-081 | Elementos revisables: planificación, OA, objetivos, indicadores, evaluación, pauta, rúbrica, versión general, versión DUA/PIE, solucionario, material educativo, presentación proyectable, guías, material de aula invertida. | M |
| FR-082 | Estados de material: `BORRADOR`, `EN REVISION`, `CON_OBSERVACIONES`, `APROBADO`, `RECHAZADO`, `CORREGIR_Y_REENVIAR`. | M |
| FR-083 | Comentario del evaluador, fechas de envío/revisión, historial de versiones y de observaciones, registro de aprobación. | M |
| FR-084 | Materiales: guía, evaluación, rúbrica, pauta, solucionario, lectura, material complementario; versiones general y DUA/adecuada evaluando el mismo OA; subir PDF/DOCX, descargar, versionar. | M |
| FR-085 | Calendario administrativo: guías → solicitud de impresión 3 días antes; evaluaciones → envío a evaluador 7 días antes; alertas verde/amarillo/rojo. | M |

### J. Gamificación

| ID | Requerimiento | Prio |
|---|---|---|
| FR-090 | Narrativa Observatorio Ciudadano Ovalle 2035, 12 misiones. | M |
| FR-091 | Medallas: Analista, Investigadora, Cartógrafa, Ciudadana, Mediadora, Innovadora, Defensora del Bien Común, Pensamiento Crítico, Constructora de Acuerdos, Ciudadanía Digital. | M |
| FR-092 | Medallas no alteran la nota. Sin rankings públicos ni comparaciones humillantes. | M |
| FR-093 | Progreso, insignias, mensajes positivos, hitos, niveles, colecciones, desbloqueo de material. | M |

### K. Feedback y ticket de salida

| ID | Requerimiento | Prio |
|---|---|---|
| FR-100 | Feedback de estudiante en clases 1, 4, 7, 10 (2 dimensiones: aplicación / aprendizaje-docencia); escalas simples + comentario abierto; privado; anónimo configurable; profesor ve tendencias agregadas sin metadatos que identifiquen anónimos. | M |
| FR-101 | Ticket de salida en cada clase (¿qué aprendí?, ¿qué evidencia me ayudó?, ¿qué concepto explico?, ¿qué pregunta tengo?, ¿cómo se relaciona con Ovalle?); dashboard de tendencias. | M |

### L. Dashboard profesor y analítica

| ID | Requerimiento | Prio |
|---|---|---|
| FR-110 | Resumen por curso: activas, progreso promedio, aula invertida, actividades, quizzes, tickets, participación, clases completadas, evidencias pendientes, feedback reciente; dashboards por clase y por estudiante; gráficos sobrios; sin rankings. | M |
| FR-111 | Indicadores: aula invertida realizada, % finalización, conceptos con mayor error, preguntas con menor rendimiento, participación, evidencias no entregadas, tickets, percepción de dificultad, feedback por clase. | M |
| FR-112 | Alertas pedagógicas simples («7 estudiantes presentan dificultades en el concepto X»); prohibido: «estudiante problemática», «bajo potencial», «riesgo psicológico». | M |

### M. PWA y offline

| ID | Requerimiento | Prio |
|---|---|---|
| FR-120 | PWA instalable; cache de interfaz, recursos básicos, aula invertida descargada y materiales permitidos. | M |
| FR-121 | Respuestas offline: almacenamiento temporal y sincronización al reconectar; estados visibles `SINCRONIZADO`, `PENDIENTE_DE_SINCRONIZAR`, `ERROR_DE_SINCRONIZACION`. | M |

### N. Auditoría

| ID | Requerimiento | Prio |
|---|---|---|
| FR-130 | Registro de creación, modificación, eliminación, publicación, evaluación, aprobación y cambios de permisos: `userId`, `action`, `entity`, `entityId`, `timestamp`, `metadata` segura. | M |

---

## 2. Requerimientos no funcionales

| ID | Requerimiento | Prio |
|---|---|---|
| NFR-001 | **Arquitectura:** Clean Architecture en capas domain / application / infrastructure / presentation; sin lógica de negocio en componentes Vue. | M |
| NFR-002 | **Monorepo** con paquetes tipados compartidos (domain, application, infrastructure, UI). | M |
| NFR-003 | **Performance:** LCP < 2.5 s, INP < 200 ms en redes móviles promedio; lazy loading de rutas y componentes pesados (mapas, videos). | M |
| NFR-004 | **Firestore:** consultas minimalistas, reglas por curso, índice de consultas, costo controlado (mínimo de lecturas por pantalla). | M |
| NFR-005 | **Seguridad:** App Check, RBAC con custom claims + reglas, validación server-side, sanitización, rate limiting, auditoría. Ver `docs/SECURITY.md`. | M |
| NFR-006 | **Privacidad menores de edad:** mínimo privilegio, datos académicos/administrativos/accesibilidad separados, datos PIE protegidos. | M |
| NFR-007 | **Accesibilidad:** WCAG 2.2 AA; teclado, contraste, focus visible, aria, reduced motion, alto contraste, no depender del color. Ver `docs/DUA_GUIDELINES.md`. | M |
| NFR-008 | **Responsive:** mobile-first (estudiante), desktop-first (profesor/evaluador), projection-first (presentación). | M |
| NFR-009 | **Disponibilidad offline parcial** con cola de sincronización y estados visibles. | M |
| NFR-010 | **Testing:** unit, componente, integración (Emulator), reglas Firestore, E2E Playwright, accesibilidad, responsive, PWA/offline. | M |
| NFR-011 | **CI/CD:** GitHub Actions con lint + typecheck + test + build + deploy por entorno (staging/prod). | M |
| NFR-012 | **Observabilidad:** logger central info/warn/error; sin secretos ni datos privados en logs. | M |
| NFR-013 | **Entornos:** development, test, staging, production con proyectos Firebase separados; `.env` / `.env.example`; sin secretos en el repo. | M |
| NFR-014 | **Mantenibilidad:** componentes < ~400 líneas, sin God Components/Services, uso de composables y use-cases. | M |
| NFR-015 | **Idioma:** interfaz y contenido en español de Chile (pronombre femenino institucional en textos dirigidos a estudiantes: «estudiante», «ciudadana»). | M |
| NFR-016 | **Contenido separado del código:** el contenido educativo se edita sin recompilar (seeds + Firestore), con atribución y licencias verificadas. | M |
| NFR-017 | **Rendimiento de proyección:** navegación fluida entre diapositivas, pre-carga de imágenes. | M |

## 3. Reglas de negocio (destacadas)

| ID | Regla | Dónde se aplica |
|---|---|---|
| RQ-001 | Una estudiante solo accede a su propio `studentId` y a su curso activo. | Reglas Firestore + use-cases |
| RQ-002 | El profesor accede solo a cursos donde es miembro con rol `PROFESOR`. | Reglas + claims |
| RQ-003 | El evaluador ve material autorizado y datos agregados, no perfiles individuales de estudiantes. | Reglas |
| RQ-004 | La condición PIE/integración es dato protegido (roles `MASTER`, `ADMIN`, `PROFESOR` del curso, `PIE`, `UTP`). | Reglas + capa de presentación |
| RQ-005 | Medallas y gamificación no modifican la nota oficial. | Aplicación |
| RQ-006 | Feedback anónimo no expone metadatos que identifiquen a quien lo envió. | Aplicación + reglas |
| RQ-007 | Los 12 materiales base (guías/evaluaciones) respetan plazos: impresión −3 días, envío a evaluador −7 días. | Calendario administrativo |
| RQ-008 | Solo contenido sanitizado y estructurado se guarda como slides (sin HTML arbitrario). | Validación server-side |
| RQ-009 | Corrección obligatoria de texto: la actividad de Clase 6 se titula «Nuestro territorio necesita…». | Seed de contenido |

## 4. Inconsistencias detectadas en los requerimientos (a resolver con el usuario)

1. **Listas reales de estudiantes ya existen localmente** en `3ro/Estudiantes 3º Medio D-Educación Ciudadana.xlsx` y `3ro/Estudiantes 3º Medio E-Educación Ciudadana.xlsx`. El requerimiento dice «proporcionadas posteriormente»: **propuesta** — en FASE 2 importar estos archivos (con autorización) en vez de solo datos DEMO. No se leerán sin tu confirmación.
2. La escala de participación usa valores 0–3; falta decidir si se agrega columna «nivel de evidencia de participación» por clase o por habilidad (se propone por habilidad, configurable por curso).
3. `MODO_PROYECCION` no es un rol de persona sino de dispositivo: se modela como acceso con token de proyección, no como usuario.
4. Auditoría: se propone log en Cloud Functions (no desde el cliente) para acciones sensibles.
5. Feedback anónimo: la modalidad anónima debe ser configurable **por curso** y no por clase.
6. Entregas offline: definir política de archivos (tamaño máximo y MIME permitidos) antes de FASE 4.

## 5. Fuera de alcance (inicial)

- Mensajería interna entre estudiantes.
- Publicación pública de la Feria Ciudadana en internet abierta.
- Notas oficiales emitidas por la plataforma (solo apoyo al registro docente).
- Correo automático de recordatorios (V2, configurable).
