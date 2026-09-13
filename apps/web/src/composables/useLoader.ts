import { ref } from "vue";

const KEY = "pclab-loader";

export interface LoaderStyle {
  id: string;
  label: string;
  emoji: string;
}

export const LOADER_STYLES: LoaderStyle[] = [
  { id: "orb", label: "Orbe líquido", emoji: "🫧" },
  { id: "dots", label: "Gotitas", emoji: "💧" },
  { id: "ring", label: "Anillo", emoji: "💫" },
  { id: "pulse", label: "Latido", emoji: "💚" },
  { id: "sparkle", label: "Destellos", emoji: "✨" },
  { id: "leaf", label: "Brote", emoji: "🌱" },
  { id: "wave", label: "Ondas", emoji: "🌊" },
  { id: "gear", label: "Engranaje", emoji: "⚙️" },
  { id: "coin", label: "Moneda", emoji: "🪙" },
  { id: "rocket", label: "Cohete", emoji: "🚀" },
];

function read(): string {
  try {
    return localStorage.getItem(KEY) || "orb";
  } catch {
    return "orb";
  }
}

export const loaderStyle = ref<string>(read());

export function chooseLoader(id: string): void {
  loaderStyle.value = LOADER_STYLES.some((s) => s.id === id) ? id : "orb";
  try {
    localStorage.setItem(KEY, loaderStyle.value);
  } catch {
    // sin almacenamiento
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pclab-loader"));
  }
}
