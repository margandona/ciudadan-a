<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type {
  Activity,
  ClassEntity,
  ExitTicket,
  FlippedProgress,
  ParticipationOverview,
  Quiz,
  QuizAttempt,
  Student,
  Submission,
} from "@pclab/shared";
import { PARTICIPATION_SKILLS, QUIZ_ATTEMPT_STATUS_LABELS, SUBMISSION_STATUS } from "@pclab/shared";
import { useSessionStore } from "@/stores/session";
import {
  activityRepo,
  classRepo,
  exitTicketRepo,
  quizAttemptRepo,
  quizRepo,
  studentRepo,
  submissionRepo,
} from "@/infrastructure/appDeps";
import { getFlippedOverview, getParticipationOverview, reviewSubmission } from "@/services/importApi";
import BaseCard from "@/components/ui/BaseCard.vue";
import BaseBadge from "@/components/ui/BaseBadge.vue";
import SkeletonRows from "@/components/ui/SkeletonRows.vue";
import AppErrorState from "@/components/ui/AppErrorState.vue";
import AppEmptyState from "@/components/ui/AppEmptyState.vue";
import AppIcon from "@/components/ui/AppIcon.vue";

const props = defineProps<{ classId: string }>();

const session = useSessionStore();
const courseId = ref(session.courses[0] ?? "");

const cls = ref<ClassEntity | null>(null);
const students = ref<Student[]>([]);
const activities = ref<Activity[]>([]);
const submissions = ref<Submission[]>([]);
const tickets = ref<ExitTicket[]>([]);
const quizzes = ref<Quiz[]>([]);
const attemptsByQuiz = ref<Map<string, QuizAttempt[]>>(new Map());
const flipped = ref<{
  total: number;
  completed: number;
  rows: { studentId: string; displayName: string; completed: boolean; progress: FlippedProgress | null }[];
} | null>(null);
const participation = ref<ParticipationOverview | null>(null);

const loading = ref(true);
const error = ref("");
const notice = ref("");
const tab = ref<"evidencias" | "tickets" | "quizzes" | "flipped" | "participacion">("evidencias");

const reviewId = ref("");
const reviewFeedback = ref("");
const reviewScore = ref<number | null>(null);
const reviewStatus = ref<Submission["status"]>(SUBMISSION_STATUS.REVISADO);
const saving = ref(false);

const TICKET_QUESTIONS: { key: keyof ExitTicket["answers"]; label: string }[] = [
  { key: "learned", label: "¿Qué aprendí hoy?" },
  { key: "evidence", label: "¿Qué evidencia me ayudó?" },
  { key: "concept", label: "¿Qué concepto puedo explicar?" },
  { key: "question", label: "¿Qué pregunta todavía tengo?" },
  { key: "relationOvalle", label: "¿Cómo se relaciona con Ovalle?" },
];

const nameByStudent = computed(() => {
  const m = new Map<string, string>();
  for (const s of students.value) {
    m.set(s.id, s.displayName);
    if (s.userId) m.set(s.userId, s.displayName);
  }
  return m;
});

function nameOf(id: string): string {
  return nameByStudent.value.get(id) ?? id;
}

const activeStudents = computed(() => students.value.filter((s) => s.active));

const submissionsByActivity = computed(() => {
  const m = new Map<string, Submission[]>();
  for (const s of submissions.value) {
    const arr = m.get(s.activityId) ?? [];
    arr.push(s);
    m.set(s.activityId, arr);
  }
  return m;
});

const sortedActivities = computed(() => [...activities.value].sort((a, b) => a.order - b.order));
const sortedTickets = computed(() => [...tickets.value].sort((a, b) => nameOf(a.studentId).localeCompare(nameOf(b.studentId))));

const avgDifficulty = computed(() => {
  if (tickets.value.length === 0) return null;
  const sum = tickets.value.reduce((acc, t) => acc + t.difficulty, 0);
  return Math.round((sum / tickets.value.length) * 10) / 10;
});

function deliveredIds(activityId: string): Set<string> {
  return new Set((submissionsByActivity.value.get(activityId) ?? []).map((s) => s.studentId));
}

function pendingStudents(activity: Activity): Student[] {
  const delivered = deliveredIds(activity.id);
  return activeStudents.value.filter((s) => !delivered.has(s.id) && !(s.userId && delivered.has(s.userId)));
}

function contentParts(s: Submission): { label: string; value: string }[] {
  const parts: { label: string; value: string }[] = [];
  const c = s.content ?? {};
  if (c.text) parts.push({ label: "Respuesta", value: c.text });
  if (c.shortAnswer) parts.push({ label: "Respuesta breve", value: c.shortAnswer });
  if (typeof c.choice === "number") parts.push({ label: "Alternativa", value: `Opción ${c.choice + 1}` });
  if (c.formFields) {
    for (const [k, v] of Object.entries(c.formFields)) parts.push({ label: k, value: String(v) });
  }
  return parts;
}

function attachmentsOf(s: Submission) {
  return s.attachments ?? [];
}

function openReview(s: Submission): void {
  reviewId.value = s.id;
  reviewFeedback.value = s.teacherFeedback ?? "";
  reviewScore.value = s.score ?? null;
  reviewStatus.value = s.status;
  notice.value = "";
}

function cancelReview(): void {
  reviewId.value = "";
}

async function saveReview(): Promise<void> {
  if (!reviewId.value || saving.value) return;
  saving.value = true;
  notice.value = "";
  try {
    const effectiveStatus =
      reviewStatus.value === SUBMISSION_STATUS.ENTREGADO && (reviewFeedback.value.trim() || reviewScore.value !== null)
        ? SUBMISSION_STATUS.RETROALIMENTADO
        : reviewStatus.value;
    const updated = await reviewSubmission({
      submissionId: reviewId.value,
      courseId: courseId.value,
      status: effectiveStatus,
      score: reviewScore.value,
      teacherFeedback: reviewFeedback.value,
    });
    const idx = submissions.value.findIndex((s) => s.id === updated.id);
    if (idx >= 0) submissions.value[idx] = updated;
    reviewId.value = "";
    notice.value = "Revisión guardada.";
  } catch (e) {
    notice.value = (e as Error).message ?? "No se pudo guardar.";
  } finally {
    saving.value = false;
  }
}

async function load(): Promise<void> {
  if (!courseId.value) return;
  loading.value = true;
  error.value = "";
  notice.value = "";
  try {
    const [classEntity, studentList, activityList, submissionList, ticketList, quizList] = await Promise.all([
      classRepo.getById(props.classId),
      studentRepo.findByCourse(courseId.value),
      activityRepo.listByClass(props.classId),
      submissionRepo.listByClass(courseId.value, props.classId),
      exitTicketRepo.listByClass(courseId.value, props.classId),
      quizRepo.listByClass(props.classId),
    ]);
    cls.value = classEntity;
    students.value = studentList;
    activities.value = activityList;
    submissions.value = submissionList;
    tickets.value = ticketList;
    quizzes.value = [...quizList].sort((a, b) => a.order - b.order);

    const [flippedOverview, participationOverview, attemptsLists] = await Promise.all([
      getFlippedOverview(courseId.value, props.classId).catch(() => null),
      getParticipationOverview(courseId.value, props.classId).catch(() => null),
      Promise.all(quizzes.value.map((q) => quizAttemptRepo.listByQuiz(q.id).catch(() => [] as QuizAttempt[]))),
    ]);
    flipped.value = flippedOverview;
    participation.value = participationOverview;
    const map = new Map<string, QuizAttempt[]>();
    quizzes.value.forEach((q, i) => map.set(q.id, attemptsLists[i] ?? []));
    attemptsByQuiz.value = map;
  } catch (e) {
    error.value = (e as Error).message ?? "No disponible.";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <RouterLink :to="`/teacher/classes/${props.classId}/dashboard`" class="back">← Dashboard de la clase</RouterLink>
    <p class="kicker">Resultados de la misión</p>
    <h1>{{ cls?.title ?? props.classId }}</h1>
    <p class="muted">Todas las respuestas y entregas de la misión: evidencias, tickets de salida, quizzes, aula invertida y participación.</p>

    <label for="course">Curso</label>
    <select id="course" v-model="courseId" class="select" @change="load" :disabled="loading">
      <option v-for="c in session.courses" :key="c" :value="c">{{ c }}</option>
    </select>

    <p v-if="notice" class="notice" role="status">{{ notice }}</p>

    <SkeletonRows v-if="loading" />
    <AppErrorState v-else-if="error" :message="error" @retry="load" />

    <template v-else>
      <div class="stats" aria-label="Resumen de la misión">
        <BaseCard><strong>{{ submissions.length }}</strong><span>Evidencias entregadas</span></BaseCard>
        <BaseCard><strong>{{ tickets.length }}/{{ activeStudents.length }}</strong><span>Tickets de salida</span></BaseCard>
        <BaseCard><strong>{{ quizzes.length }}</strong><span>Quizzes</span></BaseCard>
        <BaseCard v-if="flipped"><strong>{{ flipped.completed }}/{{ flipped.total }}</strong><span>Aula invertida lista</span></BaseCard>
        <BaseCard><strong>{{ avgDifficulty ?? "—" }}</strong><span>Dificultad percibida (1–5)</span></BaseCard>
      </div>

      <div class="tabs" role="tablist" aria-label="Resultados de la misión">
        <button class="tab" :class="{ active: tab === 'evidencias' }" role="tab" :aria-selected="tab === 'evidencias'" @click="tab = 'evidencias'">
          <AppIcon name="file" /> Evidencias ({{ submissions.length }})
        </button>
        <button class="tab" :class="{ active: tab === 'tickets' }" role="tab" :aria-selected="tab === 'tickets'" @click="tab = 'tickets'">
          <AppIcon name="chat" /> Tickets de salida ({{ tickets.length }})
        </button>
        <button class="tab" :class="{ active: tab === 'quizzes' }" role="tab" :aria-selected="tab === 'quizzes'" @click="tab = 'quizzes'">
          <AppIcon name="lightning" /> Quizzes ({{ quizzes.length }})
        </button>
        <button class="tab" :class="{ active: tab === 'flipped' }" role="tab" :aria-selected="tab === 'flipped'" @click="tab = 'flipped'">
          <AppIcon name="book" /> Aula invertida
        </button>
        <button class="tab" :class="{ active: tab === 'participacion' }" role="tab" :aria-selected="tab === 'participacion'" @click="tab = 'participacion'">
          <AppIcon name="users" /> Participación
        </button>
      </div>

      <!-- EVIDENCIAS -->
      <section v-if="tab === 'evidencias'" aria-label="Evidencias por actividad">
        <AppEmptyState v-if="sortedActivities.length === 0" message="Esta misión no tiene actividades registradas." />

        <article v-for="activity in sortedActivities" :key="activity.id" class="activity-block">
          <header class="activity-head">
            <div>
              <h2>{{ activity.title }}</h2>
              <p class="muted small">{{ activity.description }}</p>
            </div>
            <div class="counts">
              <BaseBadge tone="success">{{ deliveredIds(activity.id).size }} entregada(s)</BaseBadge>
              <BaseBadge v-if="pendingStudents(activity).length" tone="warning">{{ pendingStudents(activity).length }} pendiente(s)</BaseBadge>
            </div>
          </header>

          <div v-if="(submissionsByActivity.get(activity.id) ?? []).length === 0" class="muted small">
            Aún no hay entregas para esta actividad.
          </div>

          <ul v-else class="deliveries">
            <li v-for="s in submissionsByActivity.get(activity.id)" :key="s.id" class="delivery">
              <div class="delivery-head">
                <strong>{{ nameOf(s.studentId) }}</strong>
                <BaseBadge :tone="s.status === SUBMISSION_STATUS.ENTREGADO ? 'warning' : 'success'">{{ s.status }}</BaseBadge>
                <span v-if="s.score !== null && s.score !== undefined" class="score">Nota: {{ s.score }}</span>
                <span class="muted small">{{ s.submittedAt ? new Date(s.submittedAt).toLocaleString("es-CL") : "" }}</span>
              </div>

              <dl v-if="contentParts(s).length" class="content">
                <template v-for="(part, i) in contentParts(s)" :key="i">
                  <dt>{{ part.label }}</dt>
                  <dd>{{ part.value }}</dd>
                </template>
              </dl>

              <div v-if="attachmentsOf(s).length" class="attachments">
                <a
                  v-for="(att, i) in attachmentsOf(s)"
                  :key="i"
                  :href="att.url"
                  target="_blank"
                  rel="noopener"
                  class="attachment"
                >{{ att.type === "audio" ? "AUDIO" : att.type === "image" ? "IMAGEN" : "ARCHIVO" }} — {{ att.name ?? att.type }}</a>
              </div>

              <p v-if="s.teacherFeedback" class="feedback">Retroalimentación: {{ s.teacherFeedback }}</p>

              <div v-if="reviewId === s.id" class="review">
                <label :for="`fb-${s.id}`">Retroalimentación</label>
                <textarea :id="`fb-${s.id}`" v-model="reviewFeedback" rows="3" class="text-input"></textarea>
                <div class="review-row">
                  <label :for="`score-${s.id}`">Nota (opcional)</label>
                  <input :id="`score-${s.id}`" v-model.number="reviewScore" type="number" min="0" class="text-input score-input" />
                  <label :for="`status-${s.id}`">Estado</label>
                  <select :id="`status-${s.id}`" v-model="reviewStatus" class="select status-select">
                    <option v-for="st in SUBMISSION_STATUS" :key="st" :value="st">{{ st }}</option>
                  </select>
                </div>
                <div class="review-actions">
                  <button class="btn btn-primary btn-sm" :disabled="saving" @click="saveReview">{{ saving ? "Guardando…" : "Guardar revisión" }}</button>
                  <button class="btn btn-ghost btn-sm" @click="cancelReview">Cancelar</button>
                </div>
              </div>
              <button v-else class="btn btn-ghost btn-sm" @click="openReview(s)">Revisar / retroalimentar</button>
            </li>
          </ul>

          <details v-if="pendingStudents(activity).length" class="pending">
            <summary>Sin entregar ({{ pendingStudents(activity).length }})</summary>
            <p class="muted small">{{ pendingStudents(activity).map((s) => s.displayName).join(" · ") }}</p>
          </details>
        </article>
      </section>

      <!-- TICKETS DE SALIDA -->
      <section v-else-if="tab === 'tickets'" aria-label="Tickets de salida">
        <AppEmptyState v-if="tickets.length === 0" message="Aún no hay tickets de salida respondidos." />
        <article v-for="t in sortedTickets" :key="t.studentId" class="ticket">
          <header class="ticket-head">
            <strong>{{ nameOf(t.studentId) }}</strong>
            <BaseBadge :tone="t.difficulty >= 4 ? 'warning' : 'neutral'">Dificultad {{ t.difficulty }}/5</BaseBadge>
            <span class="muted small">{{ new Date(t.submittedAt).toLocaleString("es-CL") }}</span>
          </header>
          <dl class="content">
            <template v-for="q in TICKET_QUESTIONS" :key="q.key">
              <dt>{{ q.label }}</dt>
              <dd>{{ t.answers?.[q.key] || "—" }}</dd>
            </template>
          </dl>
        </article>
      </section>

      <!-- QUIZZES -->
      <section v-else-if="tab === 'quizzes'" aria-label="Resultados de quizzes">
        <AppEmptyState v-if="quizzes.length === 0" message="Esta misión no tiene quizzes." />
        <article v-for="q in quizzes" :key="q.id" class="activity-block">
          <header class="activity-head">
            <h2>{{ q.title }}</h2>
            <BaseBadge tone="neutral">{{ q.questionCount }} preguntas</BaseBadge>
          </header>
          <div v-if="(attemptsByQuiz.get(q.id) ?? []).length === 0" class="muted small">Aún no hay intentos.</div>
          <div v-else class="table-wrap">
            <table class="table">
              <caption class="sr-only">Intentos de {{ q.title }}</caption>
              <thead>
                <tr>
                  <th scope="col">Estudiante</th>
                  <th scope="col">Puntaje</th>
                  <th scope="col">Correctas</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in attemptsByQuiz.get(q.id)" :key="a.studentId">
                  <td>{{ nameOf(a.studentId) }}</td>
                  <td>{{ a.score }}/{{ a.maxScore }}</td>
                  <td>{{ a.answers.filter((r) => r.correct).length }}/{{ a.answers.length }}</td>
                  <td>{{ QUIZ_ATTEMPT_STATUS_LABELS[a.status] }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <!-- AULA INVERTIDA -->
      <section v-else-if="tab === 'flipped'" aria-label="Aula invertida">
        <AppEmptyState v-if="!flipped || flipped.rows.length === 0" message="Aún no hay progreso de aula invertida." />
        <div v-else class="table-wrap">
          <table class="table">
            <caption class="sr-only">Progreso del aula invertida</caption>
            <thead>
              <tr>
                <th scope="col">Estudiante</th>
                <th scope="col">Estado</th>
                <th scope="col">Progreso</th>
                <th scope="col">Quiz</th>
                <th scope="col">Reflexión</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in flipped.rows" :key="r.studentId">
                <td>{{ r.displayName }}</td>
                <td>
                  <BaseBadge :tone="r.completed ? 'success' : 'neutral'">{{ r.completed ? "Lista" : "Pendiente" }}</BaseBadge>
                </td>
                <td>{{ r.progress?.progressPercent ?? 0 }}%</td>
                <td>{{ r.progress?.quizScore ?? "—" }}</td>
                <td class="reflection">{{ r.progress?.reflection || "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- PARTICIPACIÓN -->
      <section v-else aria-label="Participación">
        <AppEmptyState v-if="!participation" message="Aún no hay registros de participación." />
        <template v-else>
          <p class="muted">{{ participation.total }} intervenciones registradas · {{ participation.studentCount }} estudiante(s).</p>
          <div class="skills">
            <BaseCard v-for="skill of PARTICIPATION_SKILLS" :key="skill">
              <strong>{{ participation.bySkill[skill].count }}</strong>
              <span>{{ skill }} · media {{ participation.bySkill[skill].avg }}</span>
            </BaseCard>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped>
.back {
  text-decoration: none;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.kicker {
  margin: var(--space-3) 0 0;
  color: var(--color-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.muted {
  color: var(--color-text-muted);
}
.small {
  font-size: 0.85rem;
}
.select {
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  margin: var(--space-2) 0 var(--space-4);
}
.notice {
  background: var(--color-primary-soft);
  padding: var(--space-3);
  border-radius: var(--radius);
}
.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: var(--space-3);
  margin: var(--space-4) 0;
}
.stats strong {
  display: block;
  font-size: 1.4rem;
}
.stats span {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.tabs {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}
.tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-primary);
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 600;
}
.tab.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}
.activity-block,
.ticket {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}
.activity-head,
.ticket-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-3);
  flex-wrap: wrap;
}
.activity-head h2 {
  margin: 0 0 4px;
  font-size: 1.05rem;
}
.counts {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.deliveries {
  list-style: none;
  padding: 0;
  margin: var(--space-3) 0 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.delivery {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: var(--space-3);
  background: var(--color-bg);
}
.delivery-head {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-2);
}
.score {
  font-weight: 700;
  color: var(--color-accent);
}
.content {
  display: grid;
  grid-template-columns: minmax(120px, auto) 1fr;
  gap: 2px var(--space-3);
  margin: var(--space-2) 0;
}
.content dt {
  color: var(--color-text-muted);
  font-size: 0.82rem;
  font-weight: 600;
}
.content dd {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-2) 0;
}
.attachment {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 0.82rem;
  background: var(--color-surface);
  color: var(--color-primary);
}
.feedback {
  color: var(--color-accent);
  margin: var(--space-2) 0;
}
.review {
  margin-top: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.review-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}
.review-actions {
  display: flex;
  gap: var(--space-2);
}
.text-input,
.status-select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: inherit;
  font-size: 0.95rem;
}
.score-input {
  width: 90px;
}
.status-select {
  width: auto;
}
.btn-sm {
  padding: 6px 12px;
  font-size: 0.85rem;
}
.pending {
  margin-top: var(--space-3);
}
.pending summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--color-primary);
}
.table-wrap {
  overflow-x: auto;
}
.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
}
.table th,
.table td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
.table th {
  background: var(--color-primary-soft);
}
.reflection {
  max-width: 340px;
  white-space: pre-wrap;
}
.skills {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--space-2);
}
.skills strong {
  display: block;
  font-size: 1.1rem;
}
.skills span {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
</style>
