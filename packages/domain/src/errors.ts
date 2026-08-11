/** Error de dominio (reglas de negocio violadas). */
export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}

/** Error de validación de datos de entrada. */
export class ValidationError extends DomainError {
  constructor(message: string, code = "VALIDATION_ERROR") {
    super(code, message);
  }
}
