import { INTERACTIVE_BLOCK_TYPES, type FlippedBlock, type FlippedProgress } from "@pclab/shared";

/** IDs de los bloques que la estudiante debe recorrer para completar. */
export function requiredBlockIds(blocks: FlippedBlock[]): string[] {
  return blocks.filter((b) => INTERACTIVE_BLOCK_TYPES.has(b.type)).map((b) => b.id);
}

/** Progreso inicial de un aula invertida. */
export function newProgress(
  classId: string,
  studentId: string,
  courseId: string,
  now: string,
): FlippedProgress {
  return {
    classId,
    studentId,
    courseId,
    startedAt: now,
    completedAt: null,
    progressPercent: 0,
    blocksVisited: [],
    interactionSeconds: 0,
    quizAttempts: 0,
    quizScore: null,
    reflection: undefined,
    ready: false,
    updatedAt: now,
  };
}

/** Recalcula porcentaje, ready y completedAt a partir de los bloques visitados. */
export function recomputeProgress(p: FlippedProgress, requiredCount: number, now: string): FlippedProgress {
  const visited = new Set(p.blocksVisited);
  const pct = requiredCount === 0 ? 100 : Math.round((visited.size / requiredCount) * 100);
  const ready = visited.size >= requiredCount;
  const completedAt = ready && !p.completedAt ? now : p.completedAt;
  return { ...p, progressPercent: pct, ready, completedAt, updatedAt: now };
}

/** Marca un bloque como visitado (idempotente). */
export function visitBlock(p: FlippedProgress, blockId: string, requiredCount: number, now: string): FlippedProgress {
  if (p.blocksVisited.includes(blockId)) return { ...p, updatedAt: now };
  const next = { ...p, blocksVisited: [...p.blocksVisited, blockId], startedAt: p.startedAt ?? now };
  return recomputeProgress(next, requiredCount, now);
}

/** Registra un intento de pregunta del aula invertida (retroalimentación inmediata). */
export function answerQuestion(
  p: FlippedProgress,
  blockId: string,
  correct: boolean,
  score: number,
  requiredCount: number,
  now: string,
): FlippedProgress {
  const visited = p.blocksVisited.includes(blockId) ? p.blocksVisited : [...p.blocksVisited, blockId];
  const quizScore = correct ? Math.max(p.quizScore ?? 0, score) : p.quizScore ?? 0;
  const next: FlippedProgress = {
    ...p,
    blocksVisited: visited,
    quizAttempts: p.quizAttempts + 1,
    quizScore: quizScore || null,
    startedAt: p.startedAt ?? now,
  };
  return recomputeProgress(next, requiredCount, now);
}

/** Guarda la respuesta reflexiva y marca su bloque como visitado. */
export function setReflection(
  p: FlippedProgress,
  blockId: string,
  text: string,
  requiredCount: number,
  now: string,
): FlippedProgress {
  const visited = p.blocksVisited.includes(blockId) ? p.blocksVisited : [...p.blocksVisited, blockId];
  return recomputeProgress({ ...p, blocksVisited: visited, reflection: text, startedAt: p.startedAt ?? now }, requiredCount, now);
}

/** Botón «Estoy lista para la misión»: cierra el aula invertida. */
export function completeReady(p: FlippedProgress, requiredCount: number, now: string): FlippedProgress {
  return recomputeProgress(p, requiredCount, now);
}
