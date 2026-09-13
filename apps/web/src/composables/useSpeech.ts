import { ref } from "vue";

/**
 * Lectura en voz alta con la Web Speech API (voz en español cuando está disponible).
 * Usada por el botón «Escuchar» en textos de misiones, quizzes y documentos.
 */
export function useSpeech() {
  const speaking = ref(false);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  function pickVoice(): SpeechSynthesisVoice | null {
    if (!supported) return null;
    const voices = window.speechSynthesis.getVoices();
    const es = voices.filter((v) => /^es/i.test(v.lang));
    return (
      es.find((v) => /es[-_]CL/i.test(v.lang)) ??
      es.find((v) => /es[-_]419/i.test(v.lang)) ??
      es.find((v) => /es[-_]ES/i.test(v.lang)) ??
      es[0] ??
      null
    );
  }

  function speak(text: string, opts?: { rate?: number; onEnd?: () => void }): void {
    if (!supported || !text.trim()) return;
    stop();
    const utterance = new SpeechSynthesisUtterance(text.trim());
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang ?? "es-ES";
    utterance.rate = opts?.rate ?? 1;
    utterance.onend = () => {
      speaking.value = false;
      opts?.onEnd?.();
    };
    utterance.onerror = () => {
      speaking.value = false;
    };
    speaking.value = true;
    window.speechSynthesis.speak(utterance);
  }

  function stop(): void {
    if (!supported) return;
    window.speechSynthesis.cancel();
    speaking.value = false;
  }

  function toggle(text: string): void {
    if (speaking.value) stop();
    else speak(text);
  }

  if (supported) {
    window.speechSynthesis.onvoiceschanged = () => {
      pickVoice();
    };
  }

  return { supported, speaking, speak, stop, toggle };
}
