export interface ClassMoment {
  step: string;
  time: string;
  foco: string;
  actions: string[];
}

export interface ClassFlowGuide {
  classId: string;
  title: string;
  goal: string;
  minutes: string;
  roles: string;
  materials: string[];
  classroomBefore: string[];
  flow: ClassMoment[];
  encargo: string;
  evaluation: string;
}

const base = {
  "class-01": { title: "Misión 01 — ¿Qué significa ser ciudadana?", goal: "Comprender la ciudadanía como derechos y responsabilidades que se ejercen participando." },
  "class-02": { title: "Misión 02 — Tres tradiciones de ciudadanía", goal: "Comparar republicanismo, liberalismo y comunitarismo frente a un problema local." },
  "class-03": { title: "Misión 03 — ¿Participamos realmente?", goal: "Clasificar espacios de participación institucional, social y digital según su incidencia." },
  "class-04": { title: "Misión 04 — Territorio, actores y escalas", goal: "Reconocer el territorio como construcción social con actores en distintas escalas." },
  "class-05": { title: "Misión 05 — Expediente Ciudadano", goal: "Investigar un problema local con fuentes y evidencia organizada." },
  "class-06": { title: "Misión 06 — Cabildo Providencia", goal: "Deliberar y proponer para el territorio con argumentos y evidencia." },
  "class-07": { title: "Misión 07 — ¿Quién debe resolver los problemas?", goal: "Evaluar qué actor (Estado, mercado, ciudadanía o colaboración) resuelve cada problema." },
  "class-08": { title: "Misión 08 — Gobernar Ovalle (presupuesto)", goal: "Decidir prioridades de presupuesto público y analizar su efecto en bienestar y desigualdad." },
  "class-09": { title: "Misión 09 — Laboratorio Ciudadano de Datos", goal: "Interpretar datos de pobreza y desigualdad sin etiquetar personas." },
  "class-10": { title: "Misión 10 — Agua, territorio y desarrollo en Limarí", goal: "Analizar usos del agua en competencia y proponer acuerdos sostenibles." },
  "class-11": { title: "Misión 11 — Proyecto Ovalle 2035", goal: "Diseñar una propuesta ciudadana con impacto social y ambiental." },
  "class-12": { title: "Misión 12 — Feria Ciudadana Ovalle 2035", goal: "Presentar el proyecto del equipo y evaluar el proceso con rúbrica." },
} as const;

const studentActivity: Record<string, string> = {
  "class-01": "Guía de aprendizaje + ticket. En casa: aula invertida y quiz de la misión.",
  "class-02": "Guía: simular el consejo sobre la plaza Los Aromos y registrar argumentos.",
  "class-03": "Guía: mapa de participación y debate sobre el «like».",
  "class-04": "Guía: cartografía social (lugar, problema, actores, escala, evidencia).",
  "class-05": "Guía: completar el Expediente Ciudadano con 2 fuentes.",
  "class-06": "Guía del cabildo: propuesta + argumento + autoevaluación con rúbrica.",
  "class-07": "Guía 07 (casos salud, áreas verdes, transporte, seguridad, vivienda): asignar actor y criterio.",
  "class-08": "Guía ABJ: repartir 100 unidades en 8 áreas y justificar decisiones.",
  "class-09": "Guía de datos + Misión IA (copilota): verificar una fuente y escribir la conclusión propia.",
  "class-10": "Guía del agua: actores, intereses y propuesta de acuerdo sostenible.",
  "class-11": "Guía: redactar los 11 campos del proyecto con el equipo.",
  "class-12": "Instrucciones de la feria: presentación de 3 min + rúbrica.",
};

function plan(
  mission: { title: string; goal: string },
  focusMain: string,
  extraInicio: string[],
  desarrollo: string[],
  cierreFoco: string,
  encargoExtra = "",
): ClassFlowGuide {
  const numMatch = mission.title.match(/Misi[oó]n\s+(\d+)/);
  const classId = numMatch?.[1] ? `class-${numMatch[1].padStart(2, "0")}` : "";
  return {
    classId,
    title: mission.title,
    goal: mission.goal,
    minutes: "45–90 min (según bloque)",
    roles: "La profesora guía; las estudiantes son protagonistas del aprendizaje.",
    materials: [
      "Guía de trabajo de la misión (descargable por las estudiantes en la app)",
      "Aula invertida revisada en casa (porcentajes visibles en el seguimiento en vivo)",
      "Panel de seguimiento en vivo (presencia y avance)",
      "Preguntas/retos de la misión y rúbrica si corresponde",
    ],
    classroomBefore: [
      "Revisa quién completó el aula invertida (Seguimiento en vivo / Aula invertida).",
      "Ten lista la guía impresa o comparte el acceso desde la app.",
      "Define parejas/equipos y roles (moderadora, secretaria, cronometrista si deliberan).",
      "Prepara el cierre y el ticket de salida.",
    ],
    flow: [
      { step: "Inicio · activación", time: "5–8 min", foco: "Conectar con la vida cotidiana y activar lo que traen de casa.", actions: extraInicio },
      { step: "Revisión del aula invertida", time: "5–8 min", foco: "Verificar conceptos clave sin volver a explicar todo.", actions: ["Pregunta 2–3 conceptos del flipped (Estado, bien público, territorio, dato, actor…).", "Corrige ideas erróneas brevemente y valida aportes."] },
      { step: "Desarrollo · actividad principal", time: "25–35 min", foco: focusMain, actions: desarrollo },
      { step: "Aplicación en la guía y evidencias", time: "10–12 min", foco: "Lo que se resuelve hoy se transforma en evidencia.", actions: ["Cada estudiante completa la sección de la guía asignada.", "Quienes terminan, responden en la app (Entrega tu evidencia)."] },
      { step: "Cierre · síntesis y última jugada", time: "6–8 min", foco: cierreFoco, actions: ["Plenaria de 2–3 min: 1 idea por grupo o 1 conclusión colectiva.", "Responden «La última jugada» (ticket) en la app."] },
    ],
    encargo: `${studentActivity[classId] ?? ""} ${encargoExtra}`.trim(),
    evaluation: "Formativa: aula invertida, participación registrada, evidencia de la guía y ticket. La medalla de misión se otorga al completar el recorrido (sin nota).",
  };
}

export const CLASS_FLOW_GUIDES: Record<string, ClassFlowGuide> = {
  "class-01": plan(base["class-01"], "Construir juntas qué es la ciudadanía y en qué espacios se ejerce.",
    ["Proyecta un caso cercano (plaza, juna de vecinos, like) y pregunta: ¿aquí se es ciudadana?", "Lluvia rápida de ideas con post-it o pizarra."],
    ["Lectura breve de la guía sobre ciudadanía y bien común.", "Análisis de un caso de participación en Ovalle.", "Votación: ¿un like es participación? Justifican."],
    "La ciudadanía se ejerce participando, en muchas escalas."),
  "class-02": plan(base["class-02"], "Ensayar el consejo: tres miradas para un mismo problema.",
    ["Plantea el problema de la plaza Los Aromos.", "Asigna equipos con una tradición (republicana, liberal, comunitaria)."],
    ["Cada grupo propone desde su tradición usando la guía.", "Debate breve y tabla de argumentos.", "Puesta en común: ¿qué aporta cada tradición?"],
    "Las tradiciones se complementan al pensar el bien común."),
  "class-03": plan(base["class-03"], "Levantar el mapa de participación de Ovalle.",
    ["Pregunta: ¿dónde participamos en Ovalle?", "Define institucional, social y digital."],
    ["En equipos ubican al menos 5 espacios y los clasifican.", "Miden incidencia: informar vs decidir.", "Debate: ¿el like es participación?"],
    "Participar es incidir en decisiones, no solo opinar."),
  "class-04": plan(base["class-04"], "Construir la cartografía social del territorio.",
    ["Presenta datos simples del Censo/INE sobre Ovalle.", "Define actor y escala."],
    ["Cada equipo completa lugar/problema/oportunidad/actor-escala/evidencia.", "Socializan y cruzan actores con un problema común."],
    "El territorio se construye con relaciones, decisiones e historia."),
  "class-05": plan(base["class-05"], "Armar el Expediente Ciudadano con evidencia.",
    ["Muestra un ejemplo de expediente completo.", "Revisa técnicas: entrevista, encuesta, foto, archivo."],
    ["Cada equipo investiga su problema local.", "Completan secciones del expediente y citan 2 fuentes.", "Contraste entre pares de evidencia."],
    "Un problema bien documentado es más fácil de resolver."),
  "class-06": plan(base["class-06"], "Cabildo: deliberar, proponer y autoevaluarse.",
    ["Relee la frase: «Nuestro territorio necesita…».", "Explica rúbrica y roles de mesa."],
    ["Cada integrante presenta su propuesta con argumento y evidencia.", "Preguntas y ajustes entre pares.", "Votación/priorización de propuestas del curso."],
    "El cabildo cierra con acuerdos, no con ganadores.",
    "Recuerda: evaluación auténtica con autoevaluación (rúbrica)."),
  "class-07": plan(base["class-07"], "Mesa de actores: decidir quién resuelve cada problema.",
    ["Proyecta un problema (calle sin alumbrado, plaza, transporte) y pregunta quién debería pagarlo.", "Presenta los 4 roles: Estado, mercado, ciudadanía, colaboración."],
    ["Cada equipo recibe un caso y defiende una postura con criterio (igualdad, eficiencia, participación).", "Rondas cortas de argumentos con evidencia local.", "Cierran con una colaboración concreta por caso."],
    "La mejor respuesta suele ser la colaboración entre actores."),
  "class-08": plan(base["class-08"], "Simulador presupuestario: gobernar Ovalle con 100 unidades.",
    ["Pregunta: ¿qué le falta a tu comuna? Relaciónalo con el presupuesto.", "Explica costo de oportunidad con un ejemplo."],
    ["En equipos distribuyen 100 unidades en las 8 áreas.", "Comparan resultados (bienestar, desigualdad, aprobación).", "Justifican prioridades con un criterio."],
    "Gobernar es decidir con recursos limitados y rendir cuentas."),
  "class-09": plan(base["class-09"], "Laboratorio de datos: leer, interpretar, cuestionar y proponer.",
    ["Muestra un gráfico (pobreza o Gini) y pide: ¿qué observan?", "Recuerda: los datos describen, no etiquetan."],
    ["Aplican Observo–Interpreto–Cuestiono–Propongo con datos citados (CASEN/INE).", "Misión IA (copilota): comparan una respuesta con la fuente.", "Presentan una propuesta de equidad para el territorio."],
    "Dato + contexto + propuesta = acción ciudadana."),
  "class-10": plan(base["class-10"], "Consejo del agua: negociar un acuerdo para el Limarí.",
    ["Pregunta: si el año es seco, ¿quién prioriza?", "Mapea actores: regantes, municipio, comunidades, ambiente, DGA."],
    ["Cada grupo representa un actor e identifica necesidades.", "Negociación guiada para repartir el caudal.", "Propuesta de acuerdo con criterio de sostenibilidad."],
    "El acuerdo sostenible considera presente y futuro."),
  "class-11": plan(base["class-11"], "Diseñar Ovalle 2035: del problema a la propuesta.",
    ["Revisa los 11 campos del proyecto con un ejemplo.", "Cada equipo define el problema que quiere resolver."],
    ["Trabajo en equipo para completar los campos (problema, evidencia, actores, recursos, impactos).", "Checklist entre equipos con la rúbrica.", "Ajustan la propuesta con retroalimentación de pares."],
    "Una propuesta sólida es clara, realizable y con impacto."),
  "class-12": plan(base["class-12"], "Feria Ciudadana: ensayo y presentación final.",
    ["Explica la rúbrica y el formato de la feria.", "Organiza tiempos y roles de la presentación."],
    ["Ensayo de 3 min por equipo con cronómetro.", "Presentación ante la comunidad (presencial o registrada).", "Autoevaluación del proceso con la rúbrica."],
    "Comunicar es participar: se muestra el proceso y la propuesta."),
};

export function flowGuideFor(classId: string): ClassFlowGuide | null {
  return CLASS_FLOW_GUIDES[classId] ?? null;
}
