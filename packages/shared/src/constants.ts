/** Roles del sistema (RBAC). MODO_PROYECCION no es una persona sino un dispositivo. */
export const ROLES = {
  MASTER: "MASTER",
  ADMIN: "ADMIN",
  PROFESOR: "PROFESOR",
  EVALUADOR: "EVALUADOR",
  ESTUDIANTE: "ESTUDIANTE",
  MODO_PROYECCION: "MODO_PROYECCION",
  PIE: "PIE",
  UTP: "UTP",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/** Estados de una estudiante en la nómina/curso. */
export const STUDENT_ACTIVE_STATES = {
  ACTIVE: "ACTIVE",
  RETIRED: "RETIRED",
} as const;

export type StudentActiveState = (typeof STUDENT_ACTIVE_STATES)[keyof typeof STUDENT_ACTIVE_STATES];

/** Nivel académico de los cursos soportados. */
export const COURSE_LEVELS = {
  TERCERO_MEDIO: "Tercero Medio",
} as const;

export type CourseLevel = (typeof COURSE_LEVELS)[keyof typeof COURSE_LEVELS];

/** Asignatura institucional fija de la plataforma en esta fase. */
export const SUBJECT_EDUCACION_CIUDADANA = "Educación Ciudadana";

/** Estados de una clase. */
export const CLASS_STATUS = {
  DRAFT: "DRAFT",
  READY: "READY",
  SCHEDULED: "SCHEDULED",
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  CLOSED: "CLOSED",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;

export type ClassStatus = (typeof CLASS_STATUS)[keyof typeof CLASS_STATUS];

/** Estados de una evidencia (submission). */
export const SUBMISSION_STATUS = {
  PENDIENTE: "PENDIENTE",
  ENTREGADO: "ENTREGADO",
  REVISADO: "REVISADO",
  RETROALIMENTADO: "RETROALIMENTADO",
  REQUIERE_CORRECCION: "REQUIERE_CORRECCION",
} as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUS)[keyof typeof SUBMISSION_STATUS];

/** Habilidades registrables de participación. */
export const PARTICIPATION_SKILLS = [
  "intervencionOral",
  "trabajoGrupal",
  "argumentacion",
  "colaboracion",
  "escucha",
  "resolucionProblemas",
  "aporteEvidencia",
  "liderazgo",
  "mediacion",
  "pensamientoCritico",
] as const;

export type ParticipationSkill = (typeof PARTICIPATION_SKILLS)[number];

/** Escala de participación por defecto (0 = sin evidencia … 3 = logrado). */
export const PARTICIPATION_SCALE = [0, 1, 2, 3] as const;

export type ParticipationLevel = (typeof PARTICIPATION_SCALE)[number];

/** Estados de un material en el flujo de revisión institucional (profesor → evaluadora → PIE → UTP). */
export const MATERIAL_STATUS = {
  BORRADOR: "BORRADOR",
  LISTO_PARA_REVISION: "LISTO_PARA_REVISION",
  ENVIADO_A_REVISION: "ENVIADO_A_REVISION",
  EN_REVISION: "EN_REVISION",
  OBSERVACIONES: "OBSERVACIONES",
  REQUIERE_CAMBIOS: "REQUIERE_CAMBIOS",
  CORREGIDO: "CORREGIDO",
  REENVIADO: "REENVIADO",
  APROBADO: "APROBADO",
  APROBADO_FINAL: "APROBADO_FINAL",
  READY_TO_PRINT: "READY_TO_PRINT",
  RECHAZADO: "RECHAZADO",
  ARCHIVED: "ARCHIVED",
  // Compatibilidad con el flujo FASE 7.
  CON_OBSERVACIONES: "CON_OBSERVACIONES",
  CORREGIR_Y_REENVIAR: "CORREGIR_Y_REENVIAR",
} as const;

export type MaterialStatus = (typeof MATERIAL_STATUS)[keyof typeof MATERIAL_STATUS];

/** Tipos de material pedagógico (institucional). Incluye los legados de FASE 7. */
export const MATERIAL_TYPE = {
  GUIA: "guia",
  EVALUACION: "evaluacion",
  RUBRICA: "rubrica",
  PAUTA: "pauta",
  SOLUCIONARIO: "solucionario",
  LECTURA: "lectura",
  COMPLEMENTARIO: "complementario",
  GUIDE: "GUIDE",
  ASSESSMENT: "ASSESSMENT",
  WRITTEN_TEST: "WRITTEN_TEST",
  PRACTICAL_WORK: "PRACTICAL_WORK",
  PROJECT: "PROJECT",
  RUBRIC: "RUBRIC",
  ANSWER_KEY: "ANSWER_KEY",
  SCORING_GUIDE: "SCORING_GUIDE",
  DUA_VERSION: "DUA_VERSION",
  PIE_VERSION: "PIE_VERSION",
  READING: "READING",
  WORKSHEET: "WORKSHEET",
  EXIT_TICKET: "EXIT_TICKET",
  SUPPORT_MATERIAL: "SUPPORT_MATERIAL",
} as const;

export type MaterialType = (typeof MATERIAL_TYPE)[keyof typeof MATERIAL_TYPE];

/** Clasificación de una fila importada según duplicación. */
export const DUPLICATE_KIND = {
  NEW: "NEW",
  DUPLICATE_CONFIRMED: "DUPLICATE_CONFIRMED",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
} as const;

export type DuplicateKind = (typeof DUPLICATE_KIND)[keyof typeof DUPLICATE_KIND];

/** Nivel de gravedad de una advertencia del importador. */
export const ISSUE_LEVEL = {
  INFO: "INFO",
  WARNING: "WARNING",
  BLOCKER: "BLOCKER",
} as const;

export type IssueLevel = (typeof ISSUE_LEVEL)[keyof typeof ISSUE_LEVEL];

/** Tipos de advertencia del importador (códigos estables para tests). */
export const IMPORT_ISSUE_CODE = {
  EMPTY_FILE: "EMPTY_FILE",
  EMPTY_SHEET: "EMPTY_SHEET",
  NO_HEADERS: "NO_HEADERS",
  MISSING_NAME: "MISSING_NAME",
  EMPTY_ROW: "EMPTY_ROW",
  DOUBLE_SPACE: "DOUBLE_SPACE",
  LEADING_TRAILING_SPACE: "LEADING_TRAILING_SPACE",
  SUSPICIOUS_NAME: "SUSPICIOUS_NAME",
  COMPOUND_NAME_AMBIGUOUS: "COMPOUND_NAME_AMBIGUOUS",
  DUPLICATE_CONFIRMED: "DUPLICATE_CONFIRMED",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
  SENSITIVE_FIELD_DETECTED: "SENSITIVE_FIELD_DETECTED",
  UNMAPPED_COLUMN: "UNMAPPED_COLUMN",
  COURSE_NOT_DETERMINED: "COURSE_NOT_DETERMINED",
  RETIRED_STUDENT: "RETIRED_STUDENT",
} as const;

export type ImportIssueCode = (typeof IMPORT_ISSUE_CODE)[keyof typeof IMPORT_ISSUE_CODE];

/** Acciones auditables. */
export const AUDIT_ACTIONS = {
  STUDENT_IMPORT: "STUDENT_IMPORT",
  STUDENT_UPDATE: "STUDENT_UPDATE",
  STUDENT_DEACTIVATE: "STUDENT_DEACTIVATE",
  COURSE_ASSIGNMENT: "COURSE_ASSIGNMENT",
  CLASS_ACTIVATION: "CLASS_ACTIVATION",
  SUBMISSION_REVIEW: "SUBMISSION_REVIEW",
  ASSESSMENT_APPROVAL: "ASSESSMENT_APPROVAL",
  ROLE_CHANGE: "ROLE_CHANGE",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** Plazos administrativos configurables (días antes de la actividad). */
export const ADMIN_DEADLINES = {
  PRINT_REQUEST_DAYS: 3,
  EVALUATOR_REVIEW_DAYS: 7,
} as const;
