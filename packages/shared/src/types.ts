import type {
  CourseLevel,
  DuplicateKind,
  ImportIssueCode,
  IssueLevel,
  ParticipationSkill,
} from "./constants";

/** Marca de tiempo ISO (string) usada en la capa de dominio/aplicación. */
export type IsoTimestamp = string;

/** Entidad Course (curso real). */
export interface Course {
  id: string;
  /** Nombre visible, p. ej. "3º Medio D". */
  name: string;
  level: CourseLevel;
  /** Sección: "D", "E", … */
  section: string;
  subject: string;
  year: number;
  teacherId?: string;
  active: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  /** Configuración por curso (evolutivo). */
  settings?: {
    participationScale?: number[];
    feedbackAnonymous?: boolean;
  };
}

/** Perfil académico de la estudiante (datos de integración van en subcolección protegida). */
export interface AcademicProfile {
  participationTrackingEnabled: boolean;
  gamificationEnabled: boolean;
}

/** Entidad Student (registro académico; NO es la cuenta de autenticación). */
export interface Student {
  id: string;
  /** uid de Firebase Auth cuando la estudiante ya tiene cuenta. Vacío si aún no. */
  userId?: string;
  firstName?: string;
  middleName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  /** Nombre tal como aparece en la nómina (con tildes y Ñ intactas). */
  displayName: string;
  preferredName?: string;
  /** Campo interno SOLO para búsquedas (minúsculas, sin tildes, espacios colapsados). */
  normalizedSearchName: string;
  courseId: string;
  /** Nº de lista si la nómina lo provee. Nunca es primary key. */
  listNumber?: number;
  active: boolean;
  archivedAt?: IsoTimestamp | null;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
  academicProfile: AcademicProfile;
  stats?: {
    lastActivityAt?: IsoTimestamp;
    completedClasses?: number;
    submittedCount?: number;
    quizAttempts?: number;
    badgesCount?: number;
  };
}

/** Fila cruda de un archivo importado (antes de normalizar). */
export interface ParsedRow {
  /** Índice de fila dentro de la hoja (para el preview). */
  rowIndex: number;
  cells: string[];
}

/** Resultado del parser de una hoja. */
export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: ParsedRow[];
  structuralRows: string[][];
  /** Valores categóricos detectados en la columna de curso (si existe). */
  courseCandidates: string[];
}

/** Resultado del parser de un archivo completo. */
export interface ParsedWorkbook {
  fileName: string;
  sheets: ParsedSheet[];
}

/** Detección de una columna del archivo hacia el modelo. */
export interface ColumnDetection {
  /** Índice de columna en la hoja. */
  index: number;
  header: string;
  /** Campo de destino: fullName | firstName | surnames | course | email | id | estado | other */
  field: string;
  confidence: "alta" | "media" | "low";
  sensitive: boolean;
}

/** Mapeo de columnas detectado para una hoja. */
export interface ColumnMapping {
  sheetName: string;
  detections: ColumnDetection[];
  /** Índices de columna relevantes resueltos (por campo). */
  columns: {
    fullName?: number;
    surnames?: number;
    course?: number;
    estado?: number;
    email?: number;
    id?: number;
  };
}

/** Advertencia del importador. */
export interface ImportIssue {
  code: ImportIssueCode;
  level: IssueLevel;
  message: string;
  /** Índice de fila afectada (opcional). */
  rowIndex?: number;
  /** Valor enmascarado para no exponer PII en logs/preview. */
  maskedValue?: string;
}

/** Estudiante candidata tras parsear y normalizar. */
export interface CandidateStudent {
  /** Índice de fila de origen. */
  rowIndex: number;
  originalName: string;
  displayName: string;
  normalizedSearchName: string;
  firstName?: string;
  middleName?: string;
  paternalSurname?: string;
  maternalSurname?: string;
  courseId: string;
  courseName: string;
  listNumber?: number;
  active: boolean;
  duplicateKind: DuplicateKind;
  issues: ImportIssue[];
  /** Valores editables por el profesor en el preview (nunca tocan el Excel). */
  editable: {
    displayName: string;
    active: boolean;
  };
}

/** Resumen numérico del preview de importación. */
export interface ImportSummary {
  fileName: string;
  courseDetected: string | null;
  courseNotDetermined: boolean;
  totalRows: number;
  newStudents: number;
  duplicateConfirmed: number;
  possibleDuplicate: number;
  withWarnings: number;
  blocked: number;
  readyToImport: number;
  sensitiveFieldsDetected: number;
}

/** Resultado del caso de uso de preview. */
export interface ImportPreview {
  summary: ImportSummary;
  rows: CandidateStudent[];
  issues: ImportIssue[];
}

/** Resultado de la importación confirmada. */
export interface ImportResult {
  imported: number;
  updated: number;
  deactivated: number;
  skippedDuplicates: number;
  courseIds: string[];
}

/** Evento de auditoría. */
export interface AuditLog {
  id?: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  courseId?: string;
  timestamp: IsoTimestamp;
  /** Metadatos seguros (sin PII completa). */
  metadata: Record<string, unknown>;
}

/** Preferencias de accesibilidad/integración (protegidas). */
export interface StudentProtectedData {
  integrationSupport: boolean;
  accessibilityPreferences: {
    fonts?: string[];
    contrast?: boolean;
    audio?: boolean;
    visualSupports?: boolean;
  };
  /** Solo roles autorizados. */
  notes?: string;
  visibility: { roles: string[] };
}

export type { ParticipationSkill };
