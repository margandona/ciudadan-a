/** Generador de IDs (UUID si el entorno lo permite; fallback seguro sin datos personales). */
export function generateId(): string {
  const crypto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (crypto?.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through
    }
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
