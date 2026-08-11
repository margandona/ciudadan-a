import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

/**
 * Firebase: app + auth (parte crítica que sí carga en el login).
 * firestore/functions viven en `lib/firebase.ts` (se cargan con las vistas).
 * En desarrollo apunta al Emulator Suite (nunca a producción).
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

// App Check: se activa cuando existe VITE_RECAPTCHA_SITE_KEY (producción/staging).
// En desarrollo/emulador se omite (se puede usar un debug token local).
const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
if (siteKey) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

const useEmulators = (import.meta.env.VITE_USE_EMULATORS ?? "true") !== "false";
// VITE_FORCE_EMULATORS=true: build de staging/medición que conecta al Emulator
// Suite local aunque no esté en dev (nunca en producción).
const forceEmulators = import.meta.env.VITE_FORCE_EMULATORS === "true";
if (useEmulators && (import.meta.env.DEV || forceEmulators)) {
  connectAuthEmulator(auth, "http://127.0.0.1:9098", { disableWarnings: true });
}
