/**
 * Verificación local end-to-end del backend de la Granja Ciudadana.
 *
 * Requiere emuladores + seeds:
 *   firebase emulators:start --only auth,firestore,functions
 *   pnpm seed:content && pnpm seed:courses && pnpm seed:students-auth -- --test=3
 *   pnpm seed:demo-teacher
 *
 * Llama a los callables reales con auth real (Auth emulator) y verifica:
 *   getFarm, plantSeed, harvestPlot, buyFarmItem, getConceptQuiz,
 *   submitConceptQuiz y teacherGrant (avatar premium + monedas).
 *
 * Uso: pnpm verify:farm
 */

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9098";
const FN_BASE = process.env.FUNCTIONS_EMULATOR_URL ?? "http://127.0.0.1:5002/ciudadania-lab/us-central1";
const COURSE = "course-3med-d-2026";
const STUDENT = { email: "prueba-2-d@estudiante.ciudadania-lab.cl", password: "222222222" };
const TEACHER = { email: "profesor@demo.cl", password: "Demo1234" };

type Json = Record<string, unknown>;

interface FarmSnap {
  level: number;
  xp: number;
  progressToNext: number;
  plotCapacity: number;
  goldenHarvest: boolean;
  state: {
    studentId: string;
    coins: number;
    seeds: number;
    plots: { index: number; unlocked: boolean; cropId?: string; readyAt?: string }[];
    inventory: { itemId: string }[];
    unlockedAvatarStyles: string[];
    conceptLevelsPassed: number[];
    notices?: { id: string; kind: string; label: string }[];
  };
}

interface TeacherQuestion {
  id: string;
  correctIndex?: number;
  keywords?: string[];
  correctText?: string[];
}

async function signIn(email: string, password: string): Promise<string> {
  const res = await fetch(`http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const body = (await res.json()) as { idToken?: string; error?: { message?: string } };
  if (!res.ok || !body.idToken) throw new Error(`Login ${email} falló: ${body.error?.message ?? res.status}`);
  return body.idToken;
}

async function call<T = Json>(name: string, token: string, data: Json): Promise<T> {
  const res = await fetch(`${FN_BASE}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data }),
  });
  const body = (await res.json()) as { result?: T; data?: T; error?: { status?: string; message?: string } };
  if (body.error) throw new Error(`${name} → ${body.error.status}: ${body.error.message}`);
  return (body.result ?? body.data) as T;
}

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main(): Promise<void> {
  const student = await signIn(STUDENT.email, STUDENT.password);
  const teacher = await signIn(TEACHER.email, TEACHER.password);

  const farm = await call<FarmSnap>("getFarm", student, { courseId: COURSE });
  check("getFarm", typeof farm.level === "number" && farm.progressToNext <= 100, `nivel ${farm.level}, ${farm.progressToNext}%`);
  const uid = farm.state.studentId;

  const badges = await call<{ earnedCount: number; totalCount: number }>("getBadgesForStudent", student, {
    courseId: COURSE,
    studentId: uid,
  });
  check("getBadgesForStudent (por estudiante)", typeof badges.totalCount === "number", `${badges.earnedCount}/${badges.totalCount}`);

  // Plantar
  const empty = farm.state.plots.find((p) => !p.cropId);
  if (!empty) {
    check("plantSeed", false, "sin casillas libres");
  } else {
    const planted = await call<FarmSnap>("plantSeed", student, { courseId: COURSE, plotIndex: empty.index, cropId: "crop-wheat" });
    const plot = planted.state.plots.find((p) => p.index === empty.index);
    check("plantSeed", !!plot?.cropId, `casilla ${empty.index}`);
  }

  // Esperar maduración (trigo ~30 s) y cosechar
  let harvested = false;
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const snap = await call<FarmSnap>("getFarm", student, { courseId: COURSE });
    const ready = snap.state.plots.find((p) => p.cropId && p.readyAt && new Date(p.readyAt).getTime() <= Date.now());
    if (ready) {
      const res = await call<{ rewards?: { coins: number; seeds: number; xp: number }; farm: FarmSnap }>("harvestPlot", student, {
        courseId: COURSE,
        plotIndex: ready.index,
      });
      check("harvestPlot", (res.rewards?.coins ?? 0) > 0, `+${res.rewards?.coins}🪙 +${res.rewards?.seeds}🌰 +${res.rewards?.xp}XP`);
      harvested = true;
      break;
    }
    await sleep(2000);
  }
  if (!harvested) check("harvestPlot", false, "el cultivo no maduró en 45 s");

  // Tienda
  const before = await call<FarmSnap>("getFarm", student, { courseId: COURSE });
  const beforeCoins = before.state.coins;
  const itemId = before.state.inventory.some((e) => e.itemId === "tool-hoe") ? "accessory-glasses" : "tool-hoe";
  if (beforeCoins >= 50) {
    const bought = await call<{ farm: FarmSnap }>("buyFarmItem", student, { courseId: COURSE, itemId });
    check("buyFarmItem", bought.farm.state.inventory.some((e) => e.itemId === itemId), `${itemId} · monedas ${beforeCoins} → ${bought.farm.state.coins}`);
  } else {
    check("buyFarmItem", true, `omitido (monedas ${beforeCoins})`);
  }

  // Diseño: cada objeto colocado da mejora (según categoría); solo acepta objetos propios.
  const layoutRes = await call<{
    state: { layout?: Record<string, unknown> };
    placement: { objects: number; coinBonusPercent: number; xpBonusPercent: number; growthSpeedPercent: number };
  }>("saveFarmLayout", student, {
    courseId: COURSE,
    layout: { "tool-hoe": { x: 50, y: 60 }, "no-existe": { x: 10, y: 10 } },
  });
  check(
    "saveFarmLayout (mejora + validación)",
    !!layoutRes.state.layout?.["tool-hoe"] &&
      !layoutRes.state.layout?.["no-existe"] &&
      layoutRes.placement.objects === 1 &&
      layoutRes.placement.growthSpeedPercent >= 2,
    `layout ${Object.keys(layoutRes.state.layout ?? {}).length} · objetos ${layoutRes.placement.objects} · crec +${layoutRes.placement.growthSpeedPercent}%`,
  );

  // Quiz de conceptos
  const quiz = await call<{ questions: { id: string }[] }>("getConceptQuiz", student, { level: 1 });
  check("getConceptQuiz", quiz.questions.length >= 5, `${quiz.questions.length} preguntas`);
  const submitted = await call<{ result: { percent: number; xpAwarded: number } }>("submitConceptQuiz", student, {
    courseId: COURSE,
    level: 1,
    answers: quiz.questions.map((q) => ({ id: q.id, given: 0 })),
  });
  check("submitConceptQuiz", typeof submitted.result.percent === "number", `${submitted.result.percent}% · +${submitted.result.xpAwarded} XP`);

  // XP exacto al aprobar un quiz individual (primera vez = +25)
  const quizId = "quiz-class-01-ciudadania";
  const teacherQuiz = await call<{ questions: TeacherQuestion[] }>("getQuizForTeacher", teacher, { quizId });
  const quizAnswers = teacherQuiz.questions.map((q) => {
    if (typeof q.correctIndex === "number") return { qid: q.id, given: q.correctIndex };
    if (Array.isArray(q.keywords) && q.keywords.length) return { qid: q.id, given: q.keywords[0] };
    if (Array.isArray(q.correctText) && q.correctText.length) return { qid: q.id, given: q.correctText[0] };
    return { qid: q.id, given: 0 };
  });
  const quizRes = await call<{ attempt: { score: number; maxScore: number }; xpAwarded: number }>("submitQuizAttempt", student, {
    quizId,
    answers: quizAnswers,
  });
  check(
    "submitQuizAttempt (+25 XP exacto)",
    quizRes.xpAwarded === 25 && quizRes.attempt.score === quizRes.attempt.maxScore,
    `${quizRes.attempt.score}/${quizRes.attempt.maxScore} · +${quizRes.xpAwarded} XP`,
  );

  // Regalo del docente: avatar premium + monedas
  await call("teacherGrant", teacher, { courseId: COURSE, studentId: uid, kind: "avatar", styleId: "pixel-art" });
  const granted = await call<FarmSnap>("getFarm", student, { courseId: COURSE });
  check("teacherGrant avatar premium", granted.state.unlockedAvatarStyles.includes("pixel-art"));
  check(
    "aviso de regalo (notices)",
    (granted.state.notices ?? []).some((n) => n.kind === "avatar"),
    `${(granted.state.notices ?? []).length} aviso(s)`,
  );

  const coinsBefore = granted.state.coins;
  const currency = await call<FarmSnap>("teacherGrant", teacher, { courseId: COURSE, studentId: uid, kind: "currency", coins: 25, seeds: 0 });
  check("teacherGrant monedas", currency.state.coins === coinsBefore + 25, `${coinsBefore} → ${currency.state.coins}`);

  // Reglas de Firestore: la estudiante NO puede escribir su granja directamente.
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8088";
  const writeRes = await fetch(
    `http://${fsHost}/v1/projects/ciudadania-lab/databases/(default)/documents/farms/${uid}?updateMask.fieldPaths=coins`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${student}` },
      body: JSON.stringify({ fields: { coins: { integerValue: "9999" } } }),
    },
  );
  check("regla: farms solo escribe el servidor", writeRes.status === 403, `HTTP ${writeRes.status}`);

  const failed = results.filter((r) => !r.ok);
  console.log(`\n=== VERIFICACIÓN ${failed.length === 0 ? "OK" : "CON FALLOS"} (${results.length - failed.length}/${results.length}) ===`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
