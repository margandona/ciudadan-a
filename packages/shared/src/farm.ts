import type { IsoTimestamp } from "./types";

/** Categorías de objetos de la Granja Ciudadana (skills/plugins). */
export type FarmItemCategory =
  | "crop"
  | "npc"
  | "tool"
  | "weapon"
  | "clothing"
  | "accessory"
  | "decoration";

export type FarmRarity = "common" | "rare" | "epic" | "legendary";

/** Efecto pasivo que otorga un objeto. */
export type FarmPerkKind =
  | "xp_bonus"
  | "coin_bonus"
  | "growth_speed"
  | "seed_bonus"
  | "unlock_plot"
  | "concept_hint";

export interface FarmPerk {
  kind: FarmPerkKind;
  /** Porcentaje para bonus/velocidad; unidades para semillas/casillas. */
  value: number;
}

/** Objeto del catálogo (configurable). */
export interface FarmItem {
  id: string;
  name: string;
  description: string;
  category: FarmItemCategory;
  icon: string;
  rarity: FarmRarity;
  /** Costo en monedas (0 = no comprable: recompensa). */
  cost: number;
  levelRequired: number;
  perk?: FarmPerk;
  /** Solo cultivos. */
  seedCost?: number;
  growthSeconds?: number;
  yieldCoins?: number;
  /** XP de granja al cosechar (solo cultivos). */
  yieldXp?: number;
}

export interface InventoryEntry {
  itemId: string;
  acquiredAt: IsoTimestamp;
  quantity: number;
}

export interface FarmPlot {
  index: number;
  unlocked: boolean;
  cropId?: string;
  plantedAt?: IsoTimestamp;
  readyAt?: IsoTimestamp;
}

/** Aviso generado al regalar algo (lo consume la estudiante para notificarse en vivo). */
export interface FarmNotice {
  id: string;
  kind: "avatar" | "item" | "coins";
  label: string;
  at: IsoTimestamp;
}

/** Estado persistido de la granja de una estudiante (server-authoritative). */
export interface FarmState {
  studentId: string;
  coins: number;
  seeds: number;
  plots: FarmPlot[];
  inventory: InventoryEntry[];
  /** Slot (categoría) -> itemId equipado (solo cosmético). */
  equipped: Partial<Record<FarmItemCategory, string>>;
  /** Estilos de avatar premium desbloqueados (regalados por el docente). */
  unlockedAvatarStyles: string[];
  /** XP de actividad cacheado (lo refresca getFarm, no lo escribe el cliente). */
  activityXp: number;
  /** Avisos pendientes (regalos del docente) para notificar en vivo. */
  notices: FarmNotice[];
  /** XP extra ganado en la granja (cosechas + quiz de conceptos). */
  bonusXp: number;
  /** Niveles cuyo quiz de conceptos ya fue aprobado. */
  conceptLevelsPassed: number[];
  totalHarvests: number;
  goldenHarvest: boolean;
  createdAt: IsoTimestamp;
  updatedAt: IsoTimestamp;
}

export interface FarmRewards {
  coins: number;
  seeds: number;
  xp: number;
}

/** Instantánea calculada que recibe la web. */
export interface FarmSnapshot {
  state: FarmState;
  level: number;
  xp: number;
  progressToNext: number;
  plotCapacity: number;
  perks: {
    xpBonusPercent: number;
    coinBonusPercent: number;
    growthSpeedPercent: number;
    seedBonus: number;
    unlockPlots: number;
    conceptHints: number;
  };
  goldenHarvest: boolean;
}

export interface FarmActionResult {
  farm: FarmSnapshot;
  rewards?: FarmRewards;
  message?: string;
}

export interface BuyFarmItemResult extends FarmActionResult {
  item: FarmItem;
}

/** Catálogo de la Granja Ciudadana. */
export const FARM_CATALOG: FarmItem[] = [
  // ── Cultivos ───────────────────────────────────────────────
  { id: "crop-wheat", name: "Trigo", description: "Cosecha rápida y confiable.", category: "crop", icon: "🌾", rarity: "common", cost: 0, levelRequired: 1, seedCost: 4, growthSeconds: 30, yieldCoins: 10, yieldXp: 4 },
  { id: "crop-carrot", name: "Zanahoria", description: "Crece bajo tierra, siempre lista.", category: "crop", icon: "🥕", rarity: "common", cost: 0, levelRequired: 1, seedCost: 7, growthSeconds: 60, yieldCoins: 18, yieldXp: 6 },
  { id: "crop-tomato", name: "Tomate", description: "Fruto del trabajo colectivo.", category: "crop", icon: "🍅", rarity: "rare", cost: 0, levelRequired: 2, seedCost: 12, growthSeconds: 120, yieldCoins: 32, yieldXp: 9 },
  { id: "crop-sunflower", name: "Girasol", description: "Mira siempre al sol.", category: "crop", icon: "🌻", rarity: "rare", cost: 0, levelRequired: 3, seedCost: 20, growthSeconds: 240, yieldCoins: 58, yieldXp: 14 },
  { id: "crop-corn", name: "Maíz", description: "Alimento del territorio.", category: "crop", icon: "🌽", rarity: "epic", cost: 0, levelRequired: 5, seedCost: 32, growthSeconds: 420, yieldCoins: 96, yieldXp: 22 },
  { id: "crop-grape", name: "Uva", description: "Paciencia que da frutos.", category: "crop", icon: "🍇", rarity: "epic", cost: 0, levelRequired: 7, seedCost: 50, growthSeconds: 720, yieldCoins: 170, yieldXp: 34 },
  { id: "crop-golden", name: "Trigo dorado", description: "La cosecha legendaria del Observatorio.", category: "crop", icon: "🌾", rarity: "legendary", cost: 0, levelRequired: 10, seedCost: 90, growthSeconds: 1200, yieldCoins: 320, yieldXp: 60 },

  // ── NPCs / ayudantes ───────────────────────────────────────
  { id: "npc-gardener", name: "Hortelana", description: "+1 semilla por cosecha.", category: "npc", icon: "🧑‍🌾", rarity: "common", cost: 60, levelRequired: 1, perk: { kind: "seed_bonus", value: 1 } },
  { id: "npc-bee", name: "Colmena viajera", description: "+10% velocidad de crecimiento.", category: "npc", icon: "🐝", rarity: "rare", cost: 120, levelRequired: 3, perk: { kind: "growth_speed", value: 10 } },
  { id: "npc-shepherd", name: "Pastora", description: "+10% monedas al cosechar.", category: "npc", icon: "🐑", rarity: "rare", cost: 140, levelRequired: 4, perk: { kind: "coin_bonus", value: 10 } },
  { id: "npc-teacher", name: "Maestra rural", description: "+10% XP de granja.", category: "npc", icon: "👩‍🏫", rarity: "epic", cost: 260, levelRequired: 6, perk: { kind: "xp_bonus", value: 10 } },
  { id: "npc-scientist", name: "Científica", description: "Pista extra en el quiz de conceptos.", category: "npc", icon: "👩‍🔬", rarity: "epic", cost: 300, levelRequired: 7, perk: { kind: "concept_hint", value: 1 } },
  { id: "npc-mayor", name: "Alcaldesa", description: "+1 casilla de granja.", category: "npc", icon: "🧑‍⚖️", rarity: "legendary", cost: 520, levelRequired: 9, perk: { kind: "unlock_plot", value: 1 } },

  // ── Herramientas ───────────────────────────────────────────
  { id: "tool-hoe", name: "Azadón", description: "+10% velocidad de crecimiento.", category: "tool", icon: "⛏️", rarity: "common", cost: 50, levelRequired: 1, perk: { kind: "growth_speed", value: 10 } },
  { id: "tool-watering", name: "Regadera", description: "+15% velocidad de crecimiento.", category: "tool", icon: "🚿", rarity: "rare", cost: 110, levelRequired: 2, perk: { kind: "growth_speed", value: 15 } },
  { id: "tool-sickle", name: "Hoz", description: "+10% monedas al cosechar.", category: "tool", icon: "🌙", rarity: "rare", cost: 130, levelRequired: 3, perk: { kind: "coin_bonus", value: 10 } },
  { id: "tool-greenhouse", name: "Invernadero", description: "+25% velocidad de crecimiento.", category: "tool", icon: "🏕️", rarity: "epic", cost: 280, levelRequired: 5, perk: { kind: "growth_speed", value: 25 } },
  { id: "tool-tractor", name: "Tractor", description: "+30% velocidad de crecimiento.", category: "tool", icon: "🚜", rarity: "epic", cost: 360, levelRequired: 7, perk: { kind: "growth_speed", value: 30 } },
  { id: "tool-drone", name: "Dron sembrador", description: "+2 semillas por cosecha.", category: "tool", icon: "🛸", rarity: "legendary", cost: 480, levelRequired: 8, perk: { kind: "seed_bonus", value: 2 } },

  // ── Armas / talismanes ─────────────────────────────────────
  { id: "weapon-pencil", name: "Lápiz espada", description: "+10% XP de granja.", category: "weapon", icon: "✏️", rarity: "common", cost: 70, levelRequired: 1, perk: { kind: "xp_bonus", value: 10 } },
  { id: "weapon-shield", name: "Escudo cívico", description: "+5% monedas al cosechar.", category: "weapon", icon: "🛡️", rarity: "common", cost: 80, levelRequired: 2, perk: { kind: "coin_bonus", value: 5 } },
  { id: "weapon-quill", name: "Pluma firme", description: "+10% XP de granja.", category: "weapon", icon: "🪶", rarity: "rare", cost: 150, levelRequired: 3, perk: { kind: "xp_bonus", value: 10 } },
  { id: "weapon-compass", name: "Brújula del bien común", description: "+15% XP de granja.", category: "weapon", icon: "🧭", rarity: "epic", cost: 290, levelRequired: 5, perk: { kind: "xp_bonus", value: 15 } },
  { id: "weapon-torch", name: "Antorcha", description: "+10% velocidad de crecimiento.", category: "weapon", icon: "🔥", rarity: "rare", cost: 160, levelRequired: 4, perk: { kind: "growth_speed", value: 10 } },
  { id: "weapon-key", name: "Llave dorada", description: "+25% XP de granja.", category: "weapon", icon: "🗝️", rarity: "legendary", cost: 600, levelRequired: 10, perk: { kind: "xp_bonus", value: 25 } },

  // ── Vestimenta ─────────────────────────────────────────────
  { id: "clothing-overol", name: "Overol de campo", description: "Ropa de trabajo de la granja.", category: "clothing", icon: "🧵", rarity: "common", cost: 40, levelRequired: 1, perk: { kind: "coin_bonus", value: 5 } },
  { id: "clothing-poncho", name: "Poncho de Ovalle", description: "Abrigo del valle.", category: "clothing", icon: "🧣", rarity: "common", cost: 55, levelRequired: 2, perk: { kind: "coin_bonus", value: 5 } },
  { id: "clothing-raincoat", name: "Impermeable", description: "La lluvia no detiene la siembra.", category: "clothing", icon: "🧥", rarity: "rare", cost: 120, levelRequired: 3, perk: { kind: "growth_speed", value: 10 } },
  { id: "clothing-labcoat", name: "Delantal de laboratorio", description: "Curiosidad científica.", category: "clothing", icon: "🥼", rarity: "rare", cost: 130, levelRequired: 4, perk: { kind: "xp_bonus", value: 10 } },
  { id: "clothing-uniform", name: "Uniforme ciudadano", description: "Identidad del Observatorio.", category: "clothing", icon: "👕", rarity: "epic", cost: 240, levelRequired: 6, perk: { kind: "coin_bonus", value: 15 } },
  { id: "clothing-cape", name: "Capa del bien común", description: "Vuela hacia la comunidad.", category: "clothing", icon: "🦸", rarity: "epic", cost: 320, levelRequired: 7, perk: { kind: "xp_bonus", value: 15 } },
  { id: "clothing-golden", name: "Túnica dorada", description: "Vestimenta de la cosecha dorada.", category: "clothing", icon: "👘", rarity: "legendary", cost: 560, levelRequired: 10, perk: { kind: "coin_bonus", value: 25 } },

  // ── Accesorios ─────────────────────────────────────────────
  { id: "accessory-glasses", name: "Gafas de estudio", description: "+5% XP de granja.", category: "accessory", icon: "👓", rarity: "common", cost: 45, levelRequired: 1, perk: { kind: "xp_bonus", value: 5 } },
  { id: "accessory-hat", name: "Sombrero de paja", description: "+5% monedas al cosechar.", category: "accessory", icon: "👒", rarity: "common", cost: 50, levelRequired: 2, perk: { kind: "coin_bonus", value: 5 } },
  { id: "accessory-backpack", name: "Mochila viajera", description: "+1 semilla por cosecha.", category: "accessory", icon: "🎒", rarity: "rare", cost: 140, levelRequired: 3, perk: { kind: "seed_bonus", value: 1 } },
  { id: "accessory-medal", name: "Medalla ciudadana", description: "+10% XP de granja.", category: "accessory", icon: "🎖️", rarity: "rare", cost: 170, levelRequired: 4, perk: { kind: "xp_bonus", value: 10 } },
  { id: "accessory-star", name: "Estrella del Observatorio", description: "+15% XP de granja.", category: "accessory", icon: "🌟", rarity: "epic", cost: 310, levelRequired: 6, perk: { kind: "xp_bonus", value: 15 } },
  { id: "accessory-aura", name: "Aura arcoíris", description: "+10% monedas al cosechar.", category: "accessory", icon: "🌈", rarity: "epic", cost: 330, levelRequired: 7, perk: { kind: "coin_bonus", value: 10 } },
  { id: "accessory-wings", name: "Alas del bien común", description: "+10% velocidad de crecimiento.", category: "accessory", icon: "🕊️", rarity: "legendary", cost: 500, levelRequired: 9, perk: { kind: "growth_speed", value: 10 } },
  { id: "accessory-crown", name: "Corona cívica", description: "+25% XP de granja.", category: "accessory", icon: "👑", rarity: "legendary", cost: 640, levelRequired: 10, perk: { kind: "xp_bonus", value: 25 } },

  // ── Decoración ─────────────────────────────────────────────
  { id: "deco-tree", name: "Árbol nativo", description: "Un quillay para la parcela.", category: "decoration", icon: "🌳", rarity: "common", cost: 35, levelRequired: 1 },
  { id: "deco-flowerbed", name: "Jardín de flores", description: "Color para el territorio.", category: "decoration", icon: "🌷", rarity: "common", cost: 45, levelRequired: 2 },
  { id: "deco-bench", name: "Banca comunitaria", description: "Espacio para conversar.", category: "decoration", icon: "🪑", rarity: "common", cost: 55, levelRequired: 2 },
  { id: "deco-lamp", name: "Farol del Observatorio", description: "Ilumina de noche.", category: "decoration", icon: "🏮", rarity: "rare", cost: 100, levelRequired: 3 },
  { id: "deco-scarecrow", name: "Espantapájaros", description: "Cuida la siembra.", category: "decoration", icon: "🎃", rarity: "rare", cost: 115, levelRequired: 4 },
  { id: "deco-fountain", name: "Fuente de agua", description: "El bien común que fluye.", category: "decoration", icon: "⛲", rarity: "epic", cost: 250, levelRequired: 5, perk: { kind: "growth_speed", value: 5 } },
  { id: "deco-windmill", name: "Molino de viento", description: "Energía del valle.", category: "decoration", icon: "🌬️", rarity: "epic", cost: 300, levelRequired: 6, perk: { kind: "coin_bonus", value: 10 } },
  { id: "deco-observatory", name: "Observatorio Ciudadano", description: "El hito de la cosecha dorada.", category: "decoration", icon: "🔭", rarity: "legendary", cost: 700, levelRequired: 10, perk: { kind: "unlock_plot", value: 1 } },
];

export const FARM_ITEM_BY_ID: Record<string, FarmItem> = Object.fromEntries(
  FARM_CATALOG.map((item) => [item.id, item]),
);

export const FARM_CROPS: FarmItem[] = FARM_CATALOG.filter((item) => item.category === "crop");

/** Orden de despliegue de las categorías en la tienda. */
export const FARM_CATEGORY_ORDER: FarmItemCategory[] = [
  "crop",
  "npc",
  "tool",
  "weapon",
  "clothing",
  "accessory",
  "decoration",
];

export const FARM_CATEGORY_LABELS: Record<FarmItemCategory, string> = {
  crop: "Cultivos",
  npc: "Ayudantes",
  tool: "Herramientas",
  weapon: "Talismanes",
  clothing: "Vestimenta",
  accessory: "Accesorios",
  decoration: "Decoración",
};
