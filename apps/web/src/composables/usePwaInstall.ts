import { ref } from "vue";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/** Prompt de instalación PWA (cuando el navegador lo permita). */
export function usePwaInstall() {
  const canInstall = ref(false);
  let deferred: BeforeInstallPromptEvent | null = null;

  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferred = e as BeforeInstallPromptEvent;
      canInstall.value = true;
    });
    window.addEventListener("appinstalled", () => {
      canInstall.value = false;
      deferred = null;
    });
  }

  async function install(): Promise<void> {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    deferred = null;
    canInstall.value = false;
  }

  return { canInstall, install };
}
