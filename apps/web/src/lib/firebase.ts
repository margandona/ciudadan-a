import { app, auth } from "@/lib/firebaseApp";
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

/**
 * Firebase: Firestore + Functions. Se importan desde las vistas/features
 * (carga diferida), manteniendo el bundle inicial solo con app + auth.
 */
export { app, auth };

// Persistencia local (IndexedDB): permite leer offline contenido ya descargado
// (aula invertida, clases) y mantener la cola de sincronización.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
export const functions = getFunctions(app);

const useEmulators = (import.meta.env.VITE_USE_EMULATORS ?? "true") !== "false";
const forceEmulators = import.meta.env.VITE_FORCE_EMULATORS === "true";
if (useEmulators && (import.meta.env.DEV || forceEmulators)) {
  connectFirestoreEmulator(db, "127.0.0.1", 8088);
  connectFunctionsEmulator(functions, "127.0.0.1", 5002);
}
