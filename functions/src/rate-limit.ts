import { HttpsError } from "firebase-functions/v2/https";

/**
 * Rate limiting en memoria (ventana deslizante por usuario+acción).
 * Válido para un solo backend/emulador; para múltiples instancias de
 * producción conviene mover el contador a Firestore/Redis (ver docs).
 */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(uid: string, action: string, limit: number, windowMs = 60_000): void {
  const key = `${uid}|${action}`;
  const now = Date.now();
  const entry = windows.get(key);
  if (!entry || entry.resetAt < now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > limit) {
    throw new HttpsError("resource-exhausted", "Demasiadas solicitudes. Intenta en un momento.");
  }
}
