import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

/**
 * Config Firebase del proyecto ciudadania-lab.
 * En desarrollo apunta a Emulator Suite (nunca a producción).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "dev-only",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "ciudadania-lab.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "ciudadania-lab",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "ciudadania-lab.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "dev-only",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ?? "",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Persistencia local (IndexedDB): permite leer offline contenido ya descargado
// (aula invertida, clases) y mantener la cola de sincronización.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),
});
export const functions = getFunctions(app);

const useEmulators = (import.meta.env.VITE_USE_EMULATORS ?? "true") !== "false";
if (useEmulators && import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8088);
  connectFunctionsEmulator(functions, "127.0.0.1", 5002);
}
