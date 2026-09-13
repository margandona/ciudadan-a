/** Catálogo de estilos de avatar (DiceBear). Compartido por web y servidor. */

export interface AvatarStyle {
  id: string;
  label: string;
  emoji: string;
  /** Los estilos premium se desbloquean cuando el docente los regala. */
  premium: boolean;
}

export const AVATAR_STYLES: AvatarStyle[] = [
  { id: "adventurer", label: "Aventurera", emoji: "🧗‍♀️", premium: false },
  { id: "adventurer-neutral", label: "Aventura neutral", emoji: "🙂", premium: false },
  { id: "big-ears", label: "Orejitas", emoji: "👂", premium: false },
  { id: "big-ears-neutral", label: "Orejitas neutral", emoji: "😶", premium: false },
  { id: "big-smile", label: "Sonrisa grande", emoji: "😄", premium: false },
  { id: "bottts-neutral", label: "Robot neutral", emoji: "🦾", premium: false },
  { id: "croodles-neutral", label: "Garabato neutral", emoji: "🖊️", premium: false },
  { id: "icons", label: "Icono", emoji: "🔷", premium: false },
  { id: "identicon", label: "Identicon", emoji: "🟦", premium: false },
  { id: "initials", label: "Iniciales", emoji: "🔤", premium: false },
  { id: "lorelei", label: "Lorelei", emoji: "🧜‍♀️", premium: false },
  { id: "lorelei-neutral", label: "Lorelei neutral", emoji: "🧜", premium: false },
  { id: "micah", label: "Micah", emoji: "🙋‍♀️", premium: false },
  { id: "notionists", label: "Notionista", emoji: "🧑‍🎨", premium: false },
  { id: "notionists-neutral", label: "Notionista neutral", emoji: "🎨", premium: false },
  { id: "open-peeps", label: "Crew", emoji: "🧑‍🤝‍🧑", premium: false },
  { id: "rings", label: "Anillos", emoji: "💍", premium: false },
  { id: "avataaars", label: "Clásica", emoji: "🧑", premium: true },
  { id: "avataaars-neutral", label: "Clásica neutral", emoji: "😐", premium: true },
  { id: "bottts", label: "Robot", emoji: "🤖", premium: true },
  { id: "croodles", label: "Garabato", emoji: "✏️", premium: true },
  { id: "dylan", label: "Dylan", emoji: "🧑‍🎤", premium: true },
  { id: "fun-emoji", label: "Emoji divertido", emoji: "😜", premium: true },
  { id: "glass", label: "Cristal", emoji: "🔮", premium: true },
  { id: "miniavs", label: "Mini", emoji: "🐣", premium: true },
  { id: "personas", label: "Personas", emoji: "🧑‍💼", premium: true },
  { id: "pixel-art", label: "Pixel", emoji: "👾", premium: true },
  { id: "pixel-art-neutral", label: "Pixel neutral", emoji: "🕹️", premium: true },
  { id: "shapes", label: "Formas", emoji: "🟣", premium: true },
  { id: "thumbs", label: "Pulgares", emoji: "👍", premium: true },
];

export const AVATAR_STYLE_BY_ID: Record<string, AvatarStyle> = Object.fromEntries(
  AVATAR_STYLES.map((style) => [style.id, style]),
);

export const DEFAULT_AVATAR_STYLE = "adventurer";

/** Estilos disponibles para una estudiante según los premium que le regalaron. */
export function availableAvatarStyles(premiumUnlocked: string[]): AvatarStyle[] {
  return AVATAR_STYLES.filter((style) => !style.premium || premiumUnlocked.includes(style.id));
}

export function isAvatarStyleAvailable(id: string, premiumUnlocked: string[]): boolean {
  const style = AVATAR_STYLE_BY_ID[id];
  if (!style) return false;
  return !style.premium || premiumUnlocked.includes(id);
}
