import archiver from "archiver";
import type { Material } from "@pclab/shared";
import { buildMaterialDocx, buildMaterialPdf } from "./material-docs";

/** Agrupación por fase para que evaluadora, PIE y UTP entiendan la organización. */
const FOLDER_BY_TYPE: { folder: string; audience: string; match: (t: string) => boolean }[] = [
  {
    folder: "01_Guias_y_trabajos",
    audience: "estudiantes (guía de la clase)",
    match: (t) => ["GUIDE", "GUIA", "WORKSHEET", "READING", "LECTURA", "SUPPORT_MATERIAL"].includes(t),
  },
  {
    folder: "02_Evaluaciones",
    audience: "estudiantes (prueba; versión DUA/PIE según adecuación)",
    match: (t) => ["WRITTEN_TEST", "ASSESSMENT", "EVALUACION", "DUA_VERSION", "PIE_VERSION", "EXIT_TICKET"].includes(t),
  },
  {
    folder: "03_Solucionarios_y_pautas",
    audience: "docente (solucionario y criterios de corrección)",
    match: (t) => ["ANSWER_KEY", "SOLUCIONARIO", "SCORING_GUIDE", "PAUTA"].includes(t),
  },
  {
    folder: "04_Rubricas",
    audience: "docente / PIE / UTP (criterios de evaluación)",
    match: (t) => ["RUBRIC", "RUBRICA"].includes(t),
  },
  {
    folder: "05_Trabajos_practicos_y_proyectos",
    audience: "estudiantes (trabajo de unidad / proyecto)",
    match: (t) => ["PRACTICAL_WORK", "PROJECT"].includes(t),
  },
];

function classOrder(m: Material): string {
  if (m.classDate) return `0-${m.classDate.slice(0, 10)}-${m.classId ?? ""}`;
  if (m.classId) return `1-${m.classId}`;
  return `2-${m.title}`;
}

function typeFolder(material: Material): { folder: string; audience: string } | null {
  const t = material.type.toUpperCase();
  return FOLDER_BY_TYPE.find((f) => f.match(t)) ?? null;
}

function fileName(material: Material, kind: "PDF" | "DOCX"): string {
  const ext = kind === "PDF" ? "pdf" : "docx";
  const base = material.title.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim();
  const classPrefix = material.classId ? `${material.classId.replace("class-", "clase-")} - ` : "";
  return `${classPrefix}${base}.${ext}`;
}

/**
 * Genera un ZIP ordenado por fases con el material del curso en un solo formato.
 * Incluye un índice (00_INDICE.txt) que explica qué contiene cada carpeta y para quién es.
 */
export async function buildMaterialsZip(
  materials: Material[],
  kind: "PDF" | "DOCX",
  courseId: string,
): Promise<{ buffer: Buffer; fileName: string }> {
  const archive = archiver("zip", { zlib: { level: 6 } });
  const chunks: Buffer[] = [];
  archive.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", resolve);
    archive.on("error", reject);
  });

  const sorted = [...materials].sort((a, b) => classOrder(a).localeCompare(classOrder(b)) || a.title.localeCompare(b.title));
  const groups: { folder: string; audience: string; files: { name: string; material: Material }[] }[] = [];
  const orphan: { name: string; material: Material }[] = [];

  for (const m of sorted) {
    const f = typeFolder(m);
    const entry = { name: fileName(m, kind), material: m };
    if (!f) {
      orphan.push(entry);
      continue;
    }
    let group = groups.find((g) => g.folder === f.folder);
    if (!group) {
      group = { folder: f.folder, audience: f.audience, files: [] };
      groups.push(group);
    }
    group.files.push(entry);
  }

  const today = new Date().toLocaleDateString("es-CL");
  groups.sort((a, b) => a.folder.localeCompare(b.folder));
  const lines: string[] = [
    "ÍNDICE DE MATERIALES PEDAGÓGICOS",
    `Curso: ${courseId}  ·  Formato: ${kind}`,
    `Generado: ${today} por la Plataforma Observatorio Ciudadano — Ovalle 2035`,
    "",
    "Materiales organizados por fases para orientar a la/el docente, evaluadora, PIE y UTP.",
    "",
  ];
  let idx = 0;
  for (const g of groups) {
    lines.push(`=== ${g.folder} === (${g.files.length}) — para ${g.audience}`);
    for (const f of g.files) {
      idx++;
      lines.push(`  ${String(idx).padStart(2, "0")}. ${f.name}`);
    }
    lines.push("");
  }
  if (orphan.length) {
    lines.push(`=== 06_Otros === (${orphan.length})`);
    for (const f of orphan) {
      idx++;
      lines.push(`  ${String(idx).padStart(2, "0")}. ${f.name}`);
    }
    lines.push("");
  }
  lines.push(`Total: ${materials.length} materiales en ${groups.length + (orphan.length ? 1 : 0)} carpetas.`);
  lines.push("");
  lines.push("Uso sugerido: imprime los materiales de 01, 02 y 05 para las estudiantes; conserva 03 y 04 para el/la docente y el equipo institucional (evaluadora · PIE · UTP).");

  archive.append(lines.join("\n"), { name: "00_INDICE.txt" });

  const build = kind === "PDF" ? buildMaterialPdf : buildMaterialDocx;
  for (const g of groups) {
    for (const f of g.files) {
      const out = await build(f.material);
      archive.append(Buffer.from(out.buffer), { name: `${g.folder}/${f.name}` });
    }
  }
  for (const f of orphan) {
    const out = await build(f.material);
    archive.append(Buffer.from(out.buffer), { name: `06_Otros/${f.name}` });
  }

  await archive.finalize();
  await done;
  return { buffer: Buffer.concat(chunks), fileName: `materiales-${courseId}-${kind.toLowerCase()}.zip` };
}
