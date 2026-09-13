<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { BadgeCategory, Student, StudentBadgesOverview, StudentBadgeView } from "@pclab/shared";
import { AVATAR_STYLES, BADGE_CATEGORY_LABELS, FARM_CATALOG } from "@pclab/shared";
import { getStudentOverview, currentActor } from "@/infrastructure/appDeps";
import {
  awardBadge,
  evaluateBadges,
  getBadgesForStudent,
  getStudentEvidenceReport,
  setStudentActive,
  teacherGrant,
  type StudentEvidenceReport,
} from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import BadgeArt from "@/components/ui/BadgeArt.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";

const props = defineProps<{ courseId: string; studentId: string }>();

const student = ref<Student | null>(null);
const badges = ref<StudentBadgesOverview | null>(null);
const selectedBadge = ref("");
const grantStyle = ref("");
const grantItem = ref("");
const grantCoins = ref(50);
const grantSeeds = ref(0);
const grantMessage = ref("");
const report = ref<StudentEvidenceReport | null>(null);
const loading = ref(true);
const reportLoading = ref(false);
const error = ref("");
const busy = ref(false);
const message = ref("");

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    student.value = await getStudentOverview.run(props.courseId, props.studentId, currentActor());
    badges.value = await getBadgesForStudent(props.courseId, props.studentId);
    if (badges.value && !selectedBadge.value) {
      const locked = badges.value.badges.find((b) => !b.earned);
      if (locked) selectedBadge.value = locked.badge.id;
    }
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    loading.value = false;
  }
}

async function award(): Promise<void> {
  if (!selectedBadge.value || busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    await awardBadge(props.courseId, props.studentId, selectedBadge.value);
    badges.value = await getBadgesForStudent(props.courseId, props.studentId);
    message.value = "Medalla otorgada.";
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function runEvaluation(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    const result = await evaluateBadges(props.courseId, props.studentId);
    badges.value = result.overview;
    message.value = result.awarded.length > 0 ? `Medallas automáticas otorgadas: ${result.awarded.join(", ")}` : "Sin nuevas medallas por ahora.";
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

const premiumStyles = computed(() => AVATAR_STYLES.filter((style) => style.premium));
const grantableItems = computed(() => FARM_CATALOG.filter((item) => item.category !== "crop"));
const badgeGroups = computed(() => {
  const locked = badges.value?.badges.filter((b) => !b.earned) ?? [];
  const groups = new Map<BadgeCategory, StudentBadgeView[]>();
  for (const view of locked) {
    const cat: BadgeCategory = view.badge.category ?? "logro";
    const list = groups.get(cat) ?? [];
    list.push(view);
    groups.set(cat, list);
  }
  return [...groups.entries()].map(([cat, list]) => ({ cat, label: BADGE_CATEGORY_LABELS[cat], list }));
});

async function grantAvatar(): Promise<void> {
  if (!grantStyle.value || busy.value) return;
  busy.value = true;
  grantMessage.value = "";
  try {
    await teacherGrant({ courseId: props.courseId, studentId: props.studentId, kind: "avatar", styleId: grantStyle.value });
    grantMessage.value = "Avatar regalado.";
    grantStyle.value = "";
  } catch (e) {
    grantMessage.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function grantFarmItem(): Promise<void> {
  if (!grantItem.value || busy.value) return;
  busy.value = true;
  grantMessage.value = "";
  try {
    await teacherGrant({ courseId: props.courseId, studentId: props.studentId, kind: "item", itemId: grantItem.value });
    grantMessage.value = "Objeto de la granja regalado.";
    grantItem.value = "";
  } catch (e) {
    grantMessage.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function grantCurrency(): Promise<void> {
  if (busy.value) return;
  busy.value = true;
  grantMessage.value = "";
  try {
    await teacherGrant({
      courseId: props.courseId,
      studentId: props.studentId,
      kind: "currency",
      coins: grantCoins.value,
      seeds: grantSeeds.value,
    });
    grantMessage.value = "Monedas/semillas regaladas.";
  } catch (e) {
    grantMessage.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function toggleActive(): Promise<void> {
  if (!student.value || busy.value) return;
  busy.value = true;
  message.value = "";
  try {
    const next = !student.value.active;
    student.value = await setStudentActive(props.courseId, props.studentId, next);
    message.value = next ? "Estudiante reactivada." : "Estudiante retirada (soft delete). Se conserva el historial.";
  } catch (e) {
    message.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function loadReport(): Promise<void> {
  reportLoading.value = true;
  try {
    report.value = await getStudentEvidenceReport(props.courseId, props.studentId);
  } catch {
    report.value = null;
  } finally {
    reportLoading.value = false;
  }
}

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv(): void {
  if (!report.value) return;
  const rows: string[][] = [];
  rows.push(["Reporte de evidencia", report.value.student?.displayName ?? "", report.value.courseId, report.value.generatedAt]);
  rows.push([]);
  rows.push(["MISION", "Completada", "Progreso %", "Aciertos quiz", "Intentos", "Tiempo (s)"]);
  for (const m of report.value.missions) {
    rows.push([m.title, m.ready ? "Sí" : "No", String(m.progressPercent), String(m.quizScore ?? ""), String(m.quizAttempts), String(m.interactionSeconds)]);
  }
  rows.push([]);
  rows.push(["QUIZ", "Clase", "Puntaje", "Máximo", "Correctas", "Total", "Enviado"]);
  for (const q of report.value.quizzes) {
    rows.push([q.title, q.classId, String(q.score), String(q.maxScore), String(q.correct), String(q.total), q.submittedAt ?? ""]);
  }
  rows.push([]);
  rows.push(["PARTICIPACION", "Clase", "Habilidad", "Nivel", "Nota"]);
  for (const p of report.value.participation) {
    rows.push([p.classId, p.classId, p.skill, String(p.level), p.note ?? ""]);
  }
  rows.push([]);
  rows.push(["MEDALLAS", "", "", "", ""]);
  for (const b of report.value.badges) {
    rows.push([b.name, b.earnedAt, b.via, "", ""]);
  }
  rows.push([]);
  rows.push(["Evidencias", String(report.value.evidenceCount), "Tickets de salida", String(report.value.exitTickets)]);

  const csv = "\uFEFF" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${props.studentId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

onMounted(() => {
  load();
  loadReport();
});
</script>

<template>
  <div>
    <RouterLink :to="`/teacher/courses/${courseId}`" class="back">← Volver al curso</RouterLink>
    <h1>{{ student?.displayName ?? "Perfil" }}</h1>
    <p class="muted">{{ student?.courseId }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else-if="student">
      <p v-if="message" class="notice" role="status">{{ message }}</p>

      <div class="grid">
        <BaseCard title="Datos generales">
          <dl class="dl">
            <dt>Nombre</dt>
            <dd>{{ student.displayName }}</dd>
            <dt>Curso</dt>
            <dd>{{ student.courseId }}</dd>
            <dt>Estado</dt>
            <dd>
              <BaseBadge :tone="student.active ? 'success' : 'neutral'">
                {{ student.active ? "Activa" : "Retirada" }}
              </BaseBadge>
            </dd>
            <dt>Última actividad</dt>
            <dd>{{ student.stats?.lastActivityAt ? new Date(student.stats.lastActivityAt).toLocaleDateString("es-CL") : "—" }}</dd>
          </dl>
          <button class="btn btn-ghost" :disabled="busy" @click="toggleActive">
            {{ student.active ? "Retirar del curso" : "Reactivar" }}
          </button>
        </BaseCard>

        <BaseCard title="Progreso">
          <p class="muted">Aula invertida, misiones, quizzes, actividades y evidencias se poblarán en las Fases 3–4.</p>
          <ul class="list">
            <li>Clases completadas: {{ student.stats?.completedClasses ?? 0 }}</li>
            <li>Entregas: {{ student.stats?.submittedCount ?? 0 }}</li>
            <li>Intentos de quiz: {{ student.stats?.quizAttempts ?? 0 }}</li>
          </ul>
        </BaseCard>

        <BaseCard title="Participación">
          <p class="muted">Intervenciones, colaboración, argumentación, pensamiento crítico… (Fase 5).</p>
        </BaseCard>

        <BaseCard title="Gamificación">
          <p v-if="message" class="notice" role="status">{{ message }}</p>
          <template v-if="badges">
            <p class="muted small">{{ badges.earnedCount }}/{{ badges.totalCount }} medallas · sin impacto en la nota</p>
            <div class="badge-list">
              <span
                v-for="view in badges.badges"
                :key="view.badge.id"
                class="badge-chip"
                :class="{ earned: view.earned }"
              >
                <BadgeArt :icon="view.badge.icon" :earned="view.earned" :size="40" />
                {{ view.badge.name }}
              </span>
            </div>
            <div class="award">
              <select v-model="selectedBadge" class="select" aria-label="Medalla a otorgar">
                <optgroup v-for="group in badgeGroups" :key="group.cat" :label="group.label">
                  <option v-for="view in group.list" :key="view.badge.id" :value="view.badge.id">
                    {{ view.badge.name }}
                  </option>
                </optgroup>
              </select>
              <button class="btn btn-ghost btn-sm" :disabled="busy || !selectedBadge" @click="award">Otorgar</button>
              <button class="btn btn-ghost btn-sm" :disabled="busy" @click="runEvaluation">Evaluar automáticamente</button>
            </div>
          </template>
        </BaseCard>

        <BaseCard title="Regalos">
          <p class="muted small">Regala avatares premium, objetos de la Granja o monedas y semillas. No afecta la nota.</p>
          <p v-if="grantMessage" class="notice" role="status">{{ grantMessage }}</p>

          <div class="grant-row">
            <label class="grant-label" for="grant-avatar">Avatar premium</label>
            <div class="grant-controls">
              <select id="grant-avatar" v-model="grantStyle" class="select" aria-label="Avatar premium a regalar">
                <option value="">Elegir avatar…</option>
                <option v-for="style in premiumStyles" :key="style.id" :value="style.id">
                  {{ style.emoji }} {{ style.label }}
                </option>
              </select>
              <button class="btn btn-ghost btn-sm" :disabled="busy || !grantStyle" @click="grantAvatar">Regalar avatar</button>
            </div>
          </div>

          <div class="grant-row">
            <label class="grant-label" for="grant-item">Objeto de la granja</label>
            <div class="grant-controls">
              <select id="grant-item" v-model="grantItem" class="select" aria-label="Objeto a regalar">
                <option value="">Elegir objeto…</option>
                <option v-for="item in grantableItems" :key="item.id" :value="item.id">
                  {{ item.icon }} {{ item.name }}
                </option>
              </select>
              <button class="btn btn-ghost btn-sm" :disabled="busy || !grantItem" @click="grantFarmItem">Regalar objeto</button>
            </div>
          </div>

          <div class="grant-row">
            <span class="grant-label">Monedas / semillas</span>
            <div class="grant-controls">
              <label class="inline-field">🪙 <input v-model.number="grantCoins" type="number" min="0" step="10" class="num" aria-label="Monedas a regalar" /></label>
              <label class="inline-field">🌰 <input v-model.number="grantSeeds" type="number" min="0" step="1" class="num" aria-label="Semillas a regalar" /></label>
              <button class="btn btn-ghost btn-sm" :disabled="busy" @click="grantCurrency">Regalar</button>
            </div>
          </div>
        </BaseCard>

        <BaseCard title="Evaluaciones">
          <p class="muted">Resultados, rúbricas y retroalimentación (Fases 7 y 10).</p>
        </BaseCard>

        <BaseCard title="Tickets de salida">
          <p class="muted">Historial de tickets (Fase 4).</p>
        </BaseCard>

        <BaseCard title="Feedback">
          <p class="muted">Solo información que corresponda según permisos (Fase 9).</p>
        </BaseCard>

        <BaseCard title="Reporte de evidencia">
          <p class="muted">Progreso de misiones, respuestas de quiz, participación y medallas de la estudiante.</p>
          <button class="btn btn-ghost btn-sm" :disabled="reportLoading" @click="loadReport">
            {{ reportLoading ? "Cargando…" : "Recargar reporte" }}
          </button>
          <button class="btn btn-primary btn-sm" :disabled="!report" @click="exportCsv">Exportar CSV</button>

          <template v-if="report">
            <div class="summary">
              <span><strong>{{ report.missions.filter((m) => m.ready).length }}/{{ report.missions.length }}</strong> misiones completadas</span>
              <span><strong>{{ report.quizzes.length }}</strong> quizzes enviados</span>
              <span><strong>{{ report.participation.length }}</strong> registros de participación</span>
              <span><strong>{{ report.badges.length }}</strong> medallas</span>
              <span><strong>{{ report.evidenceCount }}</strong> evidencias</span>
              <span><strong>{{ report.exitTickets }}</strong> tickets</span>
            </div>

            <h3 class="sub">Misiones</h3>
            <div class="table-wrap">
              <table>
                <thead><tr><th scope="col">Misión</th><th scope="col">Estado</th><th scope="col">Progreso</th><th scope="col">Quiz (aciertos)</th><th scope="col">Tiempo</th></tr></thead>
                <tbody>
                  <tr v-for="m in report.missions" :key="m.classId">
                    <td>{{ m.title }}</td>
                    <td>{{ m.ready ? "Completada" : "En curso" }}</td>
                    <td>{{ m.progressPercent }}%</td>
                    <td>{{ m.quizScore ?? "—" }}</td>
                    <td>{{ Math.round(m.interactionSeconds / 60) }} min</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 class="sub">Quizzes (aprendizaje)</h3>
            <div v-if="report.quizzes.length === 0" class="muted small">Sin quizzes enviados.</div>
            <div v-for="q in report.quizzes" :key="q.quizId" class="quiz-row">
              <p><strong>{{ q.title }}</strong> — {{ q.score }}/{{ q.maxScore }} ({{ q.correct }}/{{ q.total }} correctas)</p>
              <div class="qbar" aria-hidden="true">
                <div class="qbar-fill" :style="{ width: `${q.maxScore > 0 ? Math.round((q.score / q.maxScore) * 100) : 0}%` }"></div>
              </div>
              <p class="muted small">Enviado: {{ q.submittedAt ? new Date(q.submittedAt).toLocaleString("es-CL") : "—" }}</p>
            </div>

            <h3 class="sub">Participación</h3>
            <div v-if="report.participation.length === 0" class="muted small">Sin registros.</div>
            <ul class="list">
              <li v-for="(p, i) in report.participation" :key="i">
                {{ p.classId }} · {{ p.skill }} · nivel {{ p.level }}<template v-if="p.note"> — {{ p.note }}</template>
              </li>
            </ul>
          </template>
          <p v-else class="muted small">Reporte no disponible.</p>
        </BaseCard>
      </div>
    </template>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.muted {
  color: var(--color-text-muted);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
.dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-2);
}
.dt {
  color: var(--color-text-muted);
}
.list {
  padding-left: var(--space-4);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius);
  margin-bottom: var(--space-3);
}
.badge-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
}
.badge-chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 0.85rem;
  opacity: 0.6;
}
.badge-chip.earned {
  opacity: 1;
  border-color: var(--color-accent);
  background: #e2f4ee;
}
.award {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.9rem;
}
.grant-row {
  margin: var(--space-3) 0;
}
.grant-label {
  display: block;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-primary);
  margin-bottom: 4px;
}
.grant-controls {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  flex-wrap: wrap;
}
.inline-field {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.num {
  width: 72px;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font: inherit;
}
.btn-sm {
  padding: 6px 12px;
}
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-4);
  margin: var(--space-3) 0;
  font-size: 0.9rem;
}
.sub {
  margin: var(--space-4) 0 var(--space-2);
  font-size: 1rem;
}
.table-wrap {
  display: block;
  width: 100%;
  overflow-x: auto;
  margin-bottom: var(--space-3);
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
th,
td {
  border: 1px solid var(--color-border);
  padding: 4px 8px;
  text-align: left;
}
.quiz-row {
  margin-bottom: var(--space-3);
}
.qbar {
  background: var(--color-border);
  border-radius: 999px;
  height: 8px;
  overflow: hidden;
  margin: var(--space-2) 0;
}
.qbar-fill {
  background: var(--color-accent);
  height: 100%;
  border-radius: 999px;
}
</style>
