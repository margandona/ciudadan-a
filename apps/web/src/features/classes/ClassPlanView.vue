<script setup lang="ts">
import { computed } from "vue";
import { flowGuideFor } from "./classFlowGuides";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";

const props = defineProps<{ classId: string }>();
const guide = computed(() => flowGuideFor(props.classId));

function doPrint(): void {
  window.print();
}
</script>

<template>
  <div>
    <div class="topbar">
      <RouterLink to="/teacher/classes" class="back">← Clases</RouterLink>
      <button class="btn btn-primary" @click="doPrint">Imprimir / PDF</button>
    </div>

    <AppEmptyState v-if="!guide" message="No hay guía docente definida para esta misión todavía." />

    <article v-else class="plan">
      <header class="plan-head">
        <p class="kicker">Guía para llevar la clase · uso docente</p>
        <h1>{{ guide.title }}</h1>
        <p class="goal">{{ guide.goal }}</p>
        <div class="meta">
          <span>⏱ {{ guide.minutes }}</span>
          <span>👩‍🏫 {{ guide.roles }}</span>
        </div>
      </header>

      <section class="block">
        <h2>Antes de la clase</h2>
        <ul>
          <li v-for="item in guide.classroomBefore" :key="item">{{ item }}</li>
        </ul>
      </section>

      <section class="block">
        <h2>Materiales</h2>
        <ul>
          <li v-for="m in guide.materials" :key="m">{{ m }}</li>
        </ul>
      </section>

      <section class="block">
        <h2>Flujo de la clase</h2>
        <ol class="flow">
          <li v-for="(moment, i) in guide.flow" :key="i" class="moment">
            <div class="moment-head">
              <span class="num">{{ i + 1 }}</span>
              <div>
                <strong>{{ moment.step }}</strong>
                <span class="time">{{ moment.time }}</span>
              </div>
            </div>
            <p class="foco">{{ moment.foco }}</p>
            <ul>
              <li v-for="a in moment.actions" :key="a">{{ a }}</li>
            </ul>
          </li>
        </ol>
      </section>

      <section class="block">
        <h2>Encargo y/o trabajo en casa</h2>
        <p>{{ guide.encargo }}</p>
      </section>

      <section class="block note">
        <h2>Evaluación</h2>
        <p>{{ guide.evaluation }}</p>
      </section>

      <p class="fine">Recuerda: la diapositiva/proyección es un apoyo opcional. La clase la dirige esta guía y el trabajo de las estudiantes.</p>
    </article>
  </div>
</template>

<style scoped>
.topbar { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4); }
.back { text-decoration: none; color: var(--color-text-muted); font-size: 0.9rem; }
.plan { max-width: 860px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 18px; padding: var(--space-6); box-shadow: var(--shadow); }
.plan-head { border-bottom: 2px solid var(--color-primary); padding-bottom: var(--space-4); margin-bottom: var(--space-4); }
.kicker { margin: 0 0 4px; color: var(--color-accent); font-weight: 800; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.07em; }
.plan-head h1 { margin: 0 0 8px; color: var(--color-primary); font-size: 1.5rem; }
.goal { margin: 0; font-size: 1.05rem; line-height: 1.5; }
.meta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-3); color: var(--color-text-muted); font-size: 0.85rem; }
.block { margin-bottom: var(--space-5); }
.block h2 { color: var(--color-primary); font-size: 1.05rem; margin: 0 0 var(--space-2); }
.block ul { margin: 0; padding-left: 20px; line-height: 1.6; }
.flow { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
.moment { border: 1px solid var(--color-border); border-left: 5px solid var(--color-accent); border-radius: 14px; padding: var(--space-3); background: var(--color-bg); }
.moment-head { display: flex; gap: var(--space-3); align-items: center; }
.num { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: #fff; font-weight: 800; }
.time { display: block; color: var(--color-accent); font-weight: 700; font-size: 0.85rem; }
.foco { margin: var(--space-2) 0; font-weight: 600; }
.note { background: var(--color-primary-soft); border-radius: 14px; padding: var(--space-3); }
.fine { color: var(--color-text-muted); font-size: 0.85rem; }

@media print {
  .topbar { display: none; }
  .plan { box-shadow: none; border: none; max-width: none; padding: 0; }
  .moment { break-inside: avoid; }
}
</style>
