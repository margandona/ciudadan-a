# Plan de Pruebas Manuales Frontend

Formato: **ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones**

> Plantilla para copiar a hoja de cálculo o mantener como checklist en cada release. `Estado`: ✅/❌/⏳.

## IMPORTACIÓN DE NÓMINAS (FASE 2)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| IMP-01 | Subir archivo | Emulador con Auth (profesor@demo.cl / Demo1234) | Abrir `/teacher/students/import` y subir un `.xlsx` | Aparece preview con resumen (curso detectado, nuevas, duplicadas, sensibles) | | | |
| IMP-02 | Preview editable | Preview cargado | Corregir un nombre en "Nombre interpretado" | El Excel original no cambia; el valor editable se usa al importar | | | |
| IMP-03 | Campo sensible | Archivo con columna RUN | Subir archivo | Aparece aviso "columna sensible no importada"; RUN ausente de la tabla | | | |
| IMP-04 | Importar | Preview OK | Pulsar "Importar N estudiante(s)" | Resultado con importadas/actualizadas/desactivadas; curso creado | | | |
| IMP-05 | Dashboard curso | Curso importado | Abrir `/teacher/courses/course-3med-d-2026` | Resumen (total/activas/retiradas) y listado; sin estudiantes del otro curso | | | |
| IMP-06 | Perfil + soft delete | Dashboard | Abrir perfil de una estudiante y pulsar "Retirar del curso" | Estado → Retirada; aparece mensaje de soft delete; historial conservado | | | |

## CLASES Y AULA INVERTIDA (FASE 3)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F3-01 | Programar clase | Login profesor (profesor@demo.cl / Demo1234) | Abrir `/teacher/classes`, elegir curso, poner una misión en OPEN con aula invertida y Guardar | Estado guardado; aparece aviso; auditoría en `classSchedules` | | | |
| F3-02 | Ventana de disponibilidad | Clase SCHEDULED | Definir startAt futuro y guardar | La estudiante ve la misión como "Próximamente" (locked) | | | |
| F3-03 | Home estudiante | Cuenta estudiante con claims courseId/studentId | Abrir `/student` | Saludo, "Tu próxima misión" con barra de progreso y lista de misiones | | | |
| F3-04 | Aula invertida | Misión OPEN con flipped | Entrar a `/student/missions/class-01/flipped` | Bloques en orden; progreso avanza; retroalimentación en preguntas | | | |
| F3-05 | Reflexión + botón listo | Recorrido completo | Escribir reflexión y pulsar "Estoy lista para la misión" | Se marca lista; completedAt y ready=true en Firestore | | | |
| F3-06 | Overview profesor | Estudiante completó | Abrir `/teacher/classes/class-01/flipped` | Resumen total/completadas y listado por estudiante | | | |
| F3-07 | Clase DRAFT | Clase sin programar | Intentar abrir su flipped como estudiante | Acceso denegado / no disponible | | | |

## PWA / OFFLINE (FASE 11)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F11-01 | Instalación | HTTPS + manifest | Instalar la app | Se instala; abre standalone | | | |
| F11-02 | Shell offline | App cargada una vez | Cortar red y recargar | Shell y recursos básicos cargan | | | |
| F11-03 | Respuesta offline | Aula invertida descargada | Responder quiz/evidencia/ticket/feedback sin red | Cola guarda; banner PENDIENTE | | | |
| F11-04 | Reconexión | Acciones en cola | Restaurar red | Sincroniza; banner SINCRONIZADO; sin pérdida | | | |
| F11-05 | Error | Sin red al sincronizar | Intentar sincronizar | Banner ERROR + reintento | | | |

## PROYECTO Y FERIA (FASE 10)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F10-01 | Equipos | Profesor | `/teacher/teams` → crear equipo con integrantes | Equipo creado; sin mezclar cursos | | | |
| F10-02 | Grupos aleatorios | Estudiantes sin equipo | Generar grupos | Grupos creados sin repetir asignadas | | | |
| F10-03 | Proyecto estudiante | Estudiante con equipo | `/student/missions/class-11/project` → completar 11 campos → Entregar | Proyecto guardado/entregado por equipo | | | |
| F10-04 | Revisión con rúbrica | Proyecto entregado | `/teacher/projects` → evaluar con rúbrica | Puntaje validado; estado REVISADO; auditoría | | | |
| F10-05 | Feria | Proyectos presentados | `/teacher/fair` | Tarjetas con problema/territorio/propuesta/actores | | | |
| F10-06 | Aislamiento | Sesión estudiante | Editar proyecto ajeno | Denegado (solo integrantes del equipo) | | | |

## FEEDBACK Y ANALÍTICA (FASE 9)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F9-01 | Feedback estudiante | Clase 1/4/7/10 | `/student/missions/class-01/feedback` → enviar (anónimo) | Confirmación; guardado privado | | | |
| F9-02 | Tendencias | Feedback enviado | `/teacher/feedback` | Promedios por clase y comentarios (anónimos sin identidad) | | | |
| F9-03 | Anonimato | Feedback anónimo | Ver tendencias | No se muestra quién envió | | | |
| F9-04 | Analítica | Datos de clase | `/teacher/analytics` | Flipped %, pendientes, dificultad, preguntas de menor rendimiento | | | |
| F9-05 | Alertas descriptivas | Evidencias pendientes / dificultad alta | Ver analítica | Alertas sin etiquetas ("N evidencias…", "Dificultad alta…") | | | |

## GAMIFICACIÓN (FASE 8)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F8-01 | Medallas automáticas | Estudiante con actividad (flipped/quiz) | Home estudiante → "Evaluar medallas" | Se otorgan medallas cuyo criterio se cumple; aviso "¡Nueva medalla!" | | | |
| F8-02 | Galería | Medallas ganadas | Ver home estudiante | Colección con estado ganada/bloqueada; sin ranking | | | |
| F8-03 | Otorgar manual | Profesor | Perfil estudiante → seleccionar medalla → Otorgar | Medalla visible en la colección; auditoría | | | |
| F8-04 | Sin nota | Medallas ganadas | Ver notas/evidencias | Las medallas no alteran ninguna nota | | | |
| F8-05 | Mensaje positivo | Actividad reciente | Home estudiante | Mensaje positivo específico al contexto | | | |
| F8-06 | Idempotencia | Medalla ya ganada | Re-evaluar | No se duplica | | | |

## MATERIALES Y EVALUADOR (FASE 7)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F7-01 | Crear material | Login profesor | `/teacher/materials` → crear "Evaluación Cabildo" con DUA | Aparece en lista como Borrador | | | |
| F7-02 | Versionar | Material creado | Agregar versión GENERAL (PDF) y versión DUA | Contador de versiones crece; formato validado | | | |
| F7-03 | Enviar a revisión | Material en Borrador | Ingresar evaluador@demo.cl y Enviar | Estado → En revisión; evaluador lo ve | | | |
| F7-04 | Portal evaluador | Login evaluador (evaluador@demo.cl / Demo1234) | `/evaluator` → abrir material | Versiones GENERAL+DUA y sin datos de estudiantes | | | |
| F7-05 | Revisar | Material en revisión | Comentar y Aprobar | Estado → Aprobado; historial de observaciones; auditoría | | | |
| F7-06 | Historial | Material revisado | Ver detalle | Versiones y comentarios en orden | | | |

## MODO PROYECCIÓN (FASE 6)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F6-01 | Proyección | Deck sembrado (presentations) | Abrir `/projection/class-01` (profesor) | Deck inicia en portada; estructura pedagógica en orden | | | |
| F6-02 | Navegación/teclado | Deck abierto | ←/→/espacio/F/H | Avanza, retrocede, fullscreen y revela respuestas | | | |
| F6-03 | Votación digital | Slide pregunta | Estudiante vota desde la PWA | Resultado agregado (sin identidad) en la proyección | | | |
| F6-04 | Modo sin dispositivos | Slide pregunta | Profesor ingresa conteos manuales y guarda | Conteo agregado visible | | | |
| F6-05 | Token de proyección | Profesor autenticado | Crear token y abrir `/projection/class-01?token=…` sin sesión | Se ve el deck sin login | | | |
| F6-06 | Editor | Profesor | Abrir `/teacher/classes/class-01/presentation`, editar y guardar | Estructura validada; sin HTML arbitrario; versión +1 | | | |

## DASHBOARD Y PARTICIPACIÓN (FASE 5)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F5-01 | Registro en vivo | Login profesor, estudiantes cargadas | Abrir `/teacher/live/class-01`, seleccionar varias, pulsar "+ Argumentó" | Registros guardados; aviso "N registro(s) guardados"; resumen por habilidad actualizado | | | |
| F5-02 | Escala/observación | En vivo | Cambiar nivel y agregar observación | Se registra con nivel y nota | | | |
| F5-03 | Dashboard curso | Curso con datos | Abrir `/teacher/courses/course-3med-d-2026` | Tarjetas: flipped %, evidencias pendientes, participación, tickets, dificultad; sin rankings | | | |
| F5-04 | Dashboard clase | Clase con datos | Abrir `/teacher/classes/class-01/dashboard` | Resumen de la clase + participación por habilidad + link en vivo | | | |
| F5-05 | Calendario | Materiales con plazos sembrados | Abrir `/teacher/calendar` | Alertas verde/amarillo/rojo según días restantes | | | |
| F5-06 | Aislamiento | Sesión profesor de otro curso | Intentar registrar en curso ajeno | Denegado | | | |

## QUIZZES, EVIDENCIAS Y TICKET (FASE 4)

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| F4-01 | Quiz estudiante | Quiz sembrado (quiz-class-01-ciudadania) | Abrir `/student/quizzes/quiz-class-01-ciudadania` (con cuenta estudiante) | Preguntas sin respuestas visibles; se responde y al enviar aparece resultado con explicaciones | | | |
| F4-02 | Límite de intentos | Quiz con attempts=2 | Enviar 2 veces | El 3.er envío se rechaza | | | |
| F4-03 | Evidencia estudiante | Actividad sembrada (act-class-01-dilemas) | Abrir `/student/missions/class-01/activities` y entregar | Estado ENTREGADO; re-entrega permitida si pide corrección | | | |
| F4-04 | Revisión profesor | Evidencia entregada | Abrir `/teacher/classes/class-01/submissions`, seleccionar y guardar estado+nota+feedback | Se actualiza; mensaje "Revisión guardada"; auditoría | | | |
| F4-05 | Ticket de salida | Clase abierta | Abrir `/student/missions/class-01/exit-ticket` y enviar | Confirmación; el profesor lo lista | | | |
| F4-06 | Resultados quiz | Intentos existentes | Abrir `/teacher/classes/class-01/quizzes` | Listado de intentos por estudiante | | | |
| F4-07 | Aislamiento | Sesión estudiante | Intentar leer `quizAttempts` de otra vía URL | 403 / no visible | | | |

## AUTH

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| AUTH-01 | Login | Usuario creado y activo | Ingresar email y contraseña correctos | Acceso a su dashboard según rol | | | |
| AUTH-02 | Login | — | Ingresar contraseña incorrecta | Mensaje de error claro; sin acceso | | | |
| AUTH-03 | Logout | Sesión activa | Cerrar sesión | Redirección a login; sesión invalidada | | | |
| AUTH-04 | Sesión | Sesión inactiva > timeout | Reintentar acción | Token expirado → prompt de re-login / redirección | | | |
| AUTH-05 | Roles | Cuenta PROFESOR y cuenta ESTUDIANTE | Intentar acceder a rutas de otro rol | 403/redirect; guardas funcionan | | | |

## ESTUDIANTE

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| EST-01 | Dashboard | Curso con 12 misiones | Ver dashboard | Misiones visibles según disponibilidad; misión actual destacada | | | |
| EST-02 | Aula invertida | Misión habilitada con flipped | Completar bloques y quiz | Progreso avanza; «Estoy lista para la misión» se habilita al completar | | | |
| EST-03 | Quiz | Quiz publicado | Responder individual | Retroalimentación inmediata y explicación; intentos registrados | | | |
| EST-04 | Juego | Minijuego publicado | Jugar | Puntaje registrado; corresponde a OA | | | |
| EST-05 | Evidencia | Actividad con evidencia | Subir archivo (imagen/PDF) | Adjunto validado (tipo/tamaño); estado `ENTREGADO` | | | |
| EST-06 | Feedback | Clase 1/4/7/10 | Enviar feedback (y anónimo) | Se guarda; se muestra confirmación; docente ve tendencia agregada | | | |
| EST-07 | Ticket de salida | Clase habilitada | Responder ticket | Se guarda; dashboard docente lo refleja | | | |
| EST-08 | Insignias | Criterio cumplido o profesor otorga | Ver galería | Medalla aparece; colección se completa | | | |
| EST-09 | Aislamiento | Sesión de estudiante | Navegar URL de evidencia ajena | 403 / no visible (regla) | | | |
| EST-10 | Responsive | Mobile | Ver dashboard, flipped, quiz, evidencia en 360–640 px | Layout usable, sin desbordes | | | |

## PROFESOR

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| PRO-01 | Cursos | Cuenta con curso asignado | Abrir cursos | Solo ve sus cursos | | | |
| PRO-02 | Estudiantes | Curso con lista | Abrir lista y perfil | Perfil académico completo + timeline | | | |
| PRO-03 | Clases | — | Habilitar/deshabilitar clase y programar | Disponibilidad cambia para estudiantes | | | |
| PRO-04 | Evidencia | Entregas pendientes | Revisar y comentar | Estado → `RETROALIMENTADO`/`REQUIERE_CORRECCION` | | | |
| PRO-05 | Participación | Clase en curso | Registrar múltiples estudiantes con escala y nota | Registros guardados; evolución visible | | | |
| PRO-06 | Insignias | — | Otorgar medalla | Aparece en perfil de la estudiante (sin tocar nota) | | | |
| PRO-07 | Material | Material en BORRADOR | Subir PDF/DOCX y enviar a revisión | Estado → `EN_REVISION`; evaluador lo ve | | | |
| PRO-08 | Dashboard | Datos de clase | Revisar resumen y gráficos | Métricas correctas; sin rankings | | | |
| PRO-09 | Calendario | Materiales con fechas | Ver alertas verde/amarillo/rojo | Plazos −3/−7 días se reflejan | | | |
| PRO-10 | Exportar | — | Exportar guía/evaluación/rúbrica/material DUA | Descarga correcta | | | |

## EVALUADOR

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| EVAL-01 | Cola | Materiales en EN_REVISION asignados | Abrir portal | Solo ve material autorizado; sin datos de estudiantes | | | |
| EVAL-02 | Material | — | Abrir evaluación y versión DUA | Visualiza ambas versiones (misma OA) | | | |
| EVAL-03 | Comentarios | Material en revisión | Comentar | Comentario guardado con historial y fechas | | | |
| EVAL-04 | Rechazo | Material revisado | Rechazar con observaciones | Estado → `CORREGIR_Y_REENVIAR` o `RECHAZADO`; profesor lo ve | | | |
| EVAL-05 | Aprobación | Material corregido | Aprobar | Estado → `APROBADO`; registro de aprobación | | | |

## PROYECCIÓN

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| PROY-01 | Deck | Presentación publicada | Abrir `/projection/:classId` | Pantalla completa, slide 1 | | | |
| PROY-02 | Navegación | Deck abierto | Siguiente/anterior | Slides avanzan en orden pedagógico | | | |
| PROY-03 | Teclado | Deck abierto | ←/→/espacio/F/esc | Navegación y fullscreen funcionan | | | |
| PROY-04 | Quiz colectivo | Slide quiz | Lanzar quiz | Estudiantes votan/responden; resultados agregados | | | |
| PROY-05 | Pregunta/votación | Slide pregunta | Lanzar votación | Conteo visible; ruleta opcional funciona | | | |
| PROY-06 | Temporizador | Slide con timer | Iniciar | Temporizador corre y muestra fin | | | |
| PROY-07 | Ticket de salida | Slide final | Recoger respuestas | Ticket colectivo registrado | | | |

## PWA / OFFLINE

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| PWA-01 | Instalación | HTTPS + manifest | Instalar desde navegador | Se instala; abre como app | | | |
| PWA-02 | Shell offline | App cargada al menos una vez | Cortar red y recargar | Shell y recursos básicos cargan | | | |
| PWA-03 | Respuesta offline | Aula invertida descargada | Responder quiz/ticket sin red | Cola guarda; estado `PENDIENTE_DE_SINCRONIZAR` | | | |
| PWA-04 | Reconexión | Respuestas en cola | Restaurar red | Sincroniza; estado `SINCRONIZADO`; sin pérdida | | | |
| PWA-05 | Error de red | Sin red en sincronización | Intentar sincronizar | Estado `ERROR_DE_SINCRONIZACION` + reintento | | | |

## ESTADOS GLOBALES

| ID | Módulo | Precondición | Acción | Resultado esperado | Resultado obtenido | Estado | Observaciones |
|---|---|---|---|---|---|---|---|
| ESTADOS-01 | Empty | Lista sin datos | Ver vista | Empty state claro con acción | | | |
| ESTADOS-02 | Loading | Carga lenta | Ver pantalla | Skeleton/loading visible | | | |
| ESTADOS-03 | Error | Red/backend caído | Accionar | Error + botón reintentar | | | |
| ESTADOS-04 | 403 | Sin permiso | Abrir ruta restringida | Pantalla 403 | | | |
| ESTADOS-05 | 404 | Ruta inexistente | Abrir | Pantalla 404 | | | |

## ACCESIBILIDAD (checklist manual)

| ID | Criterio | Resultado esperado | Estado | Observaciones |
|---|---|---|---|---|
| A11Y-01 | Navegación por teclado completa en rutas críticas | Funciona sin mouse | | |
| A11Y-02 | Foco visible en todos los elementos interactivos | Indicador claro | | |
| A11Y-03 | Labels/aria en controles con icono | Anunciados correctamente | | |
| A11Y-04 | Contraste ≥ 4.5:1 | Cumple | | |
| A11Y-05 | Zoom 200–400% sin pérdida de contenido | Cumple | | |
| A11Y-06 | reduced motion desactiva animaciones | Cumple | | |
| A11Y-07 | Lector de pantalla (NVDA/VoiceOver) en estudiante y proyección | Flujo legible | | |
