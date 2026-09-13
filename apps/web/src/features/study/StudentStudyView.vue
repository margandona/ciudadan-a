<script setup lang="ts">
import { computed, ref } from "vue";
import SpeakButton from "@/components/ui/SpeakButton.vue";
import AppIcon from "@/components/ui/AppIcon.vue";

type Challenge = { prompt: string; options: string[]; answer: number; explanation: string };

const challenges: Challenge[] = [
  {
    prompt: "¿Qué idea explica mejor la ciudadanía?",
    options: ["Tener un documento", "Ejercer derechos y responsabilidades participando", "Vivir en una comuna"],
    answer: 1,
    explanation: "La ciudadanía combina derechos, responsabilidades y participación en el bien común.",
  },
  {
    prompt: "Una junta de vecinos que negocia con el municipio está participando principalmente de forma…",
    options: ["Institucional y social", "Solo digital", "Económica"],
    answer: 0,
    explanation: "Es una organización social que incide mediante una relación con una institución pública.",
  },
  {
    prompt: "¿Qué significa que el territorio es una construcción social?",
    options: ["Que no cambia nunca", "Que se forma por relaciones, decisiones e historia", "Que solo es un límite administrativo"],
    answer: 1,
    explanation: "El territorio se construye con las relaciones y decisiones de quienes lo habitan.",
  },
  {
    prompt: "¿Qué hace que una respuesta a una plaza abandonada sea una buena argumentación?",
    options: ["Un eslogan", "Una postura, razones y evidencia local", "Una opinión sin explicación"],
    answer: 1,
    explanation: "La prueba pide justificar una postura usando conceptos y un ejemplo del territorio.",
  },
];

const current = ref(0);
const selected = ref<number | null>(null);
const solved = ref<number[]>([]);
const feedback = ref("");

const challenge = computed<Challenge>(() => challenges[current.value] ?? challenges[0]!);
const score = computed(() => solved.value.length);

function answer(index: number): void {
  if (selected.value !== null) return;
  selected.value = index;
  const item = challenge.value;
  if (index === item.answer) {
    feedback.value = `¡Correcto! ${item.explanation}`;
    if (!solved.value.includes(current.value)) solved.value.push(current.value);
  } else {
    feedback.value = `Aún no. ${item.explanation}`;
  }
}

function next(): void {
  current.value = (current.value + 1) % challenges.length;
  selected.value = null;
  feedback.value = "";
}

const readingText = "La prueba de la Unidad 3 evalúa ciudadanía, tradiciones de ciudadanía, formas de participación, territorio, actores y argumentación. Para responder bien, identifica el concepto, relaciónalo con un caso de Ovalle y explica tu razón con evidencia. Recuerda: una opinión se vuelve argumento cuando tiene postura, razones y evidencia.";
</script>

<template>
  <div class="study-page">
    <RouterLink to="/student" class="back">← Mis misiones</RouterLink>
    <section class="study-hero">
      <div>
        <p class="eyebrow">Sala de entrenamiento · próxima evaluación</p>
        <h1>Operación: demostrar lo que sabes</h1>
        <p>Prepárate para la <strong>Prueba Unidad 3 — Ciudadanía, participación y territorio</strong>.</p>
        <p class="small">Evaluación registrada en el sistema · 40 puntos · 70 minutos · lunes 21 de septiembre.</p>
      </div>
      <SpeakButton :text="readingText" label="Escuchar guía de estudio" />
    </section>

    <section class="study-grid">
      <article class="study-card reading-card">
        <span class="card-label">Briefing escrito</span>
        <h2>La pista para resolver la prueba</h2>
        <p>{{ readingText }}</p>
        <div class="concept-list">
          <div><strong>Ciudadanía</strong><span>derechos + responsabilidades + participación.</span></div>
          <div><strong>Participación</strong><span>institucional, social y digital; importa su incidencia.</span></div>
          <div><strong>Territorio</strong><span>espacio construido por actores, relaciones e historia.</span></div>
          <div><strong>Argumento</strong><span>postura clara + razón + evidencia local.</span></div>
        </div>
      </article>

      <article class="study-card challenge-card">
        <div class="challenge-head">
          <div><span class="card-label">Reto relámpago {{ current + 1 }}/{{ challenges.length }}</span><h2>Desbloquea la siguiente pista</h2></div>
          <strong class="score">{{ score }}/{{ challenges.length }} ★</strong>
        </div>
        <p class="prompt">{{ challenge.prompt }}</p>
        <div class="options">
          <button v-for="(option, index) in challenge.options" :key="option" class="option" :class="{ correct: selected !== null && index === challenge.answer, wrong: selected === index && index !== challenge.answer }" :disabled="selected !== null" @click="answer(index)">
            <span>{{ String.fromCharCode(65 + index) }}</span>{{ option }}
          </button>
        </div>
        <p v-if="feedback" class="feedback" role="status">{{ feedback }}</p>
        <button class="next-button" :disabled="selected === null" @click="next"><AppIcon name="arrow" /> Siguiente pista</button>
      </article>
    </section>

    <section class="study-card resources-card">
      <div>
        <span class="card-label">Kit de investigación</span>
        <h2>Lee y mira antes de jugar</h2>
        <p>Estos recursos amplían el contenido de la prueba. No reemplazan tus apuntes ni la guía de clases: sirven para comprender y citar ideas.</p>
      </div>
      <div class="resource-grid">
        <a href="https://www.bcn.cl/formacioncivica/presentacion" target="_blank" rel="noreferrer" class="resource-link">
          <strong>Lectura 1 · Guía de Formación Cívica</strong>
          <span>Biblioteca del Congreso Nacional de Chile. Ciudadanía, participación y democracia.</span>
        </a>
        <a href="https://www.mineduc.cl/wp-content/uploads/sites/19/2016/11/Orientaciones-curriculares-PFC-op-web.pdf" target="_blank" rel="noreferrer" class="resource-link">
          <strong>Lectura 2 · Orientaciones curriculares</strong>
          <span>Ministerio de Educación de Chile (2016). Formación ciudadana y participación.</span>
        </a>
        <a href="https://www.youtube.com/watch?v=Pzb6MdWnS48" target="_blank" rel="noreferrer" class="resource-link">
          <strong>Video · Formación Ciudadana en las escuelas</strong>
          <span>Ministerio de Educación de Chile. Mira cómo se practica ciudadanía en comunidades educativas.</span>
        </a>
        <a href="https://www.curriculumnacional.cl/recursos/video-educacion-ciudadana" target="_blank" rel="noreferrer" class="resource-link">
          <strong>Video · ¿Qué es la educación ciudadana?</strong>
          <span>Currículum Nacional, MINEDUC. Recurso audiovisual de introducción.</span>
        </a>
      </div>
      <p class="citation-note"><strong>Cómo citar en tu respuesta:</strong> “Según la Guía de Formación Cívica de la BCN, participar implica involucrarse activamente en decisiones públicas que repercuten en la vida de las personas” (BCN, s. f.).</p>
    </section>

    <section class="study-card measured-card">
      <div>
        <span class="card-label">Reto con registro</span>
        <h2>Juega la misión evaluable</h2>
        <p>Responde 10 preguntas, recibe retroalimentación y revisa tu resultado. El sistema guardará tus respuestas, puntaje, aciertos y preguntas que necesitas volver a practicar. Puedes intentarlo hasta tres veces.</p>
      </div>
        <RouterLink to="/student/quizzes/quiz-u3-sala-entrenamiento" class="btn-cta"><AppIcon name="lightning" /> Iniciar misión evaluable</RouterLink>
    </section>

    <section class="study-card mission-card">
      <div>
        <span class="card-label">Simulación de competencia</span>
        <h2>Desafío final: defiende una plaza</h2>
        <p>En pareja, una estudiante defiende al municipio y otra a la junta de vecinos. Tienen 60 segundos para decir una postura, una razón y una evidencia. Luego cambien de rol. Gana el equipo que escucha y mejora su propuesta, no el que habla más fuerte.</p>
      </div>
      <SpeakButton text="Desafío final: defiende una plaza. En pareja, una estudiante defiende al municipio y otra a la junta de vecinos. Tienen 60 segundos para decir una postura, una razón y una evidencia. Luego cambien de rol. Gana el equipo que escucha y mejora su propuesta, no el que habla más fuerte." label="Escuchar desafío final" />
    </section>
  </div>
</template>

<style scoped>
.study-page { display: flex; flex-direction: column; gap: var(--space-4); }
.back { color: var(--color-text-muted); text-decoration: none; }
.study-hero { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4); flex-wrap: wrap; padding: var(--space-6); border-radius: 22px; color: #fff; background: linear-gradient(135deg, #102d4b, #0e7c66); }
.study-hero h1 { margin: 0 0 var(--space-2); font-size: clamp(1.7rem, 4vw, 2.5rem); }
.study-hero p { max-width: 680px; line-height: 1.6; margin: 6px 0; }
.eyebrow, .card-label { text-transform: uppercase; letter-spacing: .07em; font-size: .75rem; font-weight: 800; }
.study-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(300px, .9fr); gap: var(--space-4); }
.study-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 18px; padding: var(--space-5); box-shadow: var(--shadow); }
.study-card h2 { margin: 6px 0 var(--space-2); color: var(--color-primary); }
.reading-card p, .mission-card p { line-height: 1.65; }
.concept-list { display: grid; gap: 10px; margin-top: var(--space-4); }
.concept-list div { display: grid; grid-template-columns: 125px 1fr; gap: 10px; padding: 10px; border-radius: 10px; background: var(--color-primary-soft); }
.concept-list span { color: var(--color-text-muted); }
.challenge-card { border-top: 5px solid var(--color-accent); }
.challenge-head { display: flex; justify-content: space-between; gap: 10px; }
.score { color: #b18300; white-space: nowrap; }
.prompt { font-size: 1.1rem; font-weight: 700; line-height: 1.45; }
.options { display: grid; gap: 10px; }
.option { display: flex; align-items: center; gap: 10px; border: 2px solid var(--color-border); background: var(--color-bg); border-radius: 12px; padding: 12px; text-align: left; cursor: pointer; font: inherit; }
.option span { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary); color: #fff; font-weight: 800; }
.option.correct { border-color: var(--color-accent); background: #e7f8f1; }
.option.wrong { border-color: var(--color-danger); background: #fdecea; }
.feedback { color: var(--color-accent); font-weight: 700; line-height: 1.45; }
.next-button { margin-top: 10px; border: 0; border-radius: 999px; padding: 11px 18px; color: #fff; background: var(--color-primary); cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
.btn-cta { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; }
.next-button:disabled { opacity: .45; cursor: not-allowed; }
.mission-card { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; }
.resources-card { border-top: 5px solid #d8a41f; }
.resource-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: var(--space-3); }
.resource-link { display: flex; flex-direction: column; gap: 5px; padding: 13px; border: 1px solid var(--color-border); border-radius: 12px; color: var(--color-text); text-decoration: none; background: var(--color-bg); }
.resource-link:hover { border-color: var(--color-primary); transform: translateY(-2px); }
.resource-link span { color: var(--color-text-muted); font-size: .9rem; line-height: 1.4; }
.citation-note { padding: 12px; border-left: 4px solid var(--color-accent); background: #eefaf6; line-height: 1.55; }
.measured-card { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap; border-color: var(--color-accent); }
.small { font-size: .9rem; opacity: .9; }
@media (max-width: 760px) { .study-grid { grid-template-columns: 1fr; } .study-card { padding: var(--space-4); } .concept-list div { grid-template-columns: 1fr; gap: 2px; } }
@media (max-width: 600px) { .resource-grid { grid-template-columns: 1fr; } }
</style>
