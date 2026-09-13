<script setup lang="ts">
import { computed, ref } from "vue";
import { useSessionStore } from "@/stores/session";
import AppIcon from "./AppIcon.vue";

const session = useSessionStore();
const open = ref(false);

interface HelpGuide {
  title: string;
  items: HelpItem[];
}
interface HelpItem {
  step: string;
  text: string;
}

const guides: Record<string, { title: string; items: HelpItem[] }> = {
  ESTUDIANTE: {
    title: "Guía rápida · Estudiante",
    items: [
      { step: "Entrar", text: "Elige «Estudiante», tu curso, tu nombre y escribe tu clave (RUT sin puntos ni guiones; la K en mayúscula)." },
      { step: "Mis misiones", text: "Usa las pestañas para saltar a Misiones, Entrenamiento, Quiz en vivo y Medallero. En la misión puedes escuchar los pasos." },
      { step: "Aula invertida", text: "Lee o escucha la historia y los conceptos (misiones 7–12 son desafíos de laboratorio). Al terminar toca «Estoy lista»." },
      { step: "Guía de trabajo", text: "En cada misión abre «Guía de trabajo»: lee el material en la app, escúchalo o descárgalo en PDF/DOCX. Las guías se trabajan en clases." },
      { step: "Demostrar", text: "Entrega tu evidencia (texto, foto o audio). Cuando tu profesora la revise, verás la retroalimentación y una notificación en tu inicio." },
      { step: "Cerrar y contar", text: "«La última jugada» cierra la misión con tus palabras; «Tu voz cuenta» deja tu opinión." },
      { step: "Medallero", text: "«Ver mi medallero» abre el modal con tus medallas; toca una para ver su significado y su misión." },
      { step: "Quiz en vivo", text: "Si tu profesora inicia un quiz, escribe el código en «Quiz en vivo» y responde. El resultado se revela solo cuando ella lo permite." },
      { step: "Entrenar para la prueba", text: "En «Entrenamiento» lee el resumen, escúchalo y practica con preguntas para la evaluación." },
    ],
  },
  PROFESOR: {
    title: "Guía rápida · Docente",
    items: [
      { step: "Entrar", text: "Pestaña «Docente / equipo» con tu correo institucional." },
      { step: "Dashboard del curso", text: "Desde un curso ves: revisar entregas pendientes, seguimiento en vivo, analítica, plan de cada clase, material y centro de misiones." },
      { step: "Centro de misiones", text: "Abre cada misión para su Dashboard, Plan de la clase, Evidencias, Quizzes, Aula invertida y Presentación (apoyo opcional)." },
      { step: "Plan de la clase", text: "«Plan de la clase» y «Guía para llevar la clase» muestran el flujo (inicio, flipped, desarrollo, cierre) para dirigir los 70 minutos." },
      { step: "Evidencias", text: "Revisa cada entrega, escribe retroalimentación y nota. Al guardar, avanza a la siguiente entrega automáticamente." },
      { step: "Seguimiento en vivo", text: "Ve quién está conectado ahora, cuántas trabajaron hoy y promedios (de conectadas y del curso). Se actualiza cada 12 s." },
      { step: "Quizzes", text: "Crea un «Quiz en vivo» (código + QR). Las estudiantes responden en el celular; revela resultados cuando quieras." },
      { step: "Analítica", text: "Revisa continuidad, curva de avance, medallas, preguntas con errores frecuentes y tickets." },
      { step: "Materiales", text: "Genera, revisa y descarga guías/pruebas en PDF o DOCX. Las guías se pueden leer y descargar también desde la app de cada estudiante." },
      { step: "Consejo", text: "Usa la barra inferior: tema claro/oscuro, tamaño de letra, contraste y sonido. «¿Cómo usar?» siempre está aquí." },
    ],
  },
  EVALUADOR: {
    title: "Guía rápida · Evaluador/a",
    items: [
      { step: "Entrar", text: "Pestaña «Docente / equipo» con tu cuenta de evaluador/a." },
      { step: "Revisar material", text: "En tu panel verás los materiales asignados. Ábrelos y revisa currículo, documento y versiones." },
      { step: "Decidir", text: "Escribe tu comentario por sección y elige Aprobar, Con observaciones o Solicitar cambios." },
      { step: "Descargar", text: "Puedes descargar cada material en PDF/DOCX o todo el curso en un ZIP ordenado." },
      { step: "Probar vista estudiante", text: "Cierra sesión y entra como estudiante de prueba para comprobar que las guías se ven bien." },
    ],
  },
  PIE: {
    title: "Guía rápida · PIE",
    items: [
      { step: "Entrar", text: "Pestaña «Docente / equipo» con tu cuenta PIE." },
      { step: "Revisar accesibilidad", text: "Revisa instrucciones claras y numeradas, vocabulario simple, espacio para escribir, pocos distractores y existencia de versión DUA." },
      { step: "Decidir", text: "Deja tu decisión (Aprobar / Con observaciones / Solicitar cambios) siempre con un comentario por sección." },
      { step: "Probar vista estudiante", text: "Entra como estudiante de prueba para comprobar lectura y espacio de respuesta." },
    ],
  },
  UTP: {
    title: "Guía rápida · UTP",
    items: [
      { step: "Entrar", text: "Pestaña «Docente / equipo» con tu cuenta UTP." },
      { step: "Revisar material", text: "Revisa el material asignado (currículo, documento, versiones) y el cumplimiento de plazos (envío 7 días antes, impresión 3 días antes)." },
      { step: "Decidir", text: "Deja comentarios por sección y tu decisión: Aprobar, Con observaciones o Solicitar cambios." },
      { step: "Gestionar", text: "Descarga materiales individuales o todo el curso y monitorea estados hasta «Listo para imprimir»." },
    ],
  },
};

const guide = computed<HelpGuide>(() => {
  const g = (guides as Record<string, HelpGuide | undefined>)[session.role];
  return g ?? (guides.PROFESOR as HelpGuide);
});
</script>

<template>
  <button type="button" class="help-btn" @click="open = true"><AppIcon name="help" /> ¿Cómo usar?</button>

  <Teleport to="body">
    <div v-if="open" class="overlay" role="presentation" @click.self="open = false">
      <div class="card" role="dialog" aria-modal="true" aria-label="Cómo usar la plataforma">
        <div class="head">
          <div>
            <p class="kicker">Ayuda en línea</p>
            <h2>{{ guide.title }}</h2>
            <p class="muted small">Consejos para tu rol. También puedes usar la barra inferior para cambiar tema, letra, contraste y sonido.</p>
          </div>
          <button type="button" class="close" aria-label="Cerrar ayuda" @click="open = false">×</button>
        </div>

        <ol class="list">
          <li v-for="item in guide.items" :key="item.step">
            <strong>{{ item.step }}</strong>
            <p>{{ item.text }}</p>
          </li>
        </ol>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.help-btn {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-primary);
  padding: 6px 14px;
  font-weight: 700;
  cursor: pointer;
  font-size: 0.88rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.help-btn:hover { border-color: var(--color-primary); }
.overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(8, 15, 25, 0.65);
  backdrop-filter: blur(4px);
  display: grid;
  place-items: center;
  padding: var(--space-4);
}
.card {
  width: min(680px, 96vw);
  max-height: 88vh;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  padding: var(--space-5);
}
.head { display: flex; justify-content: space-between; gap: var(--space-3); align-items: flex-start; }
.head h2 { margin: 0 0 4px; color: var(--color-primary); }
.kicker { margin: 0 0 2px; color: var(--color-accent); font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; }
.close { border: 0; background: transparent; color: var(--color-text-muted); font-size: 1.8rem; line-height: 1; cursor: pointer; }
.list { list-style: none; margin: var(--space-4) 0 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.list li { border: 1px solid var(--color-border); border-left: 4px solid var(--color-accent); border-radius: 12px; padding: 10px 12px; }
.list p { margin: 4px 0 0; color: var(--color-text-muted); line-height: 1.55; }
</style>
