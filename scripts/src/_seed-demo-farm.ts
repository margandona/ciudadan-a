import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

/** Rellena la granja del estudiante de prueba para una captura vistosa. */
const EMAIL = "prueba-1-d@estudiante.ciudadania-lab.cl";

async function main(): Promise<void> {
  if (getApps().length === 0) initializeApp({ projectId: "ciudadania-lab" });
  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(EMAIL);
  const uid = user.uid;
  const now = new Date().toISOString();

  const items = [
    "deco-tree", "deco-flowerbed", "deco-bench", "deco-lamp", "deco-scarecrow",
    "deco-fountain", "deco-windmill", "deco-pond",
    "npc-hen", "npc-duck", "npc-rabbit", "npc-cat", "npc-dog", "npc-cow", "npc-horse",
    "npc-bird", "npc-fish", "npc-butterfly",
    "tool-tractor", "weapon-compass", "accessory-crown", "clothing-cape",
  ];
  const inventory = items.map((itemId) => ({ itemId, acquiredAt: now, quantity: 1 }));
  const plots = Array.from({ length: 20 }, (_, index) => ({ index, unlocked: index < 15 }));

  await db
    .collection("farms")
    .doc(uid)
    .set(
      {
        studentId: uid,
        coins: 5000,
        seeds: 120,
        plots,
        inventory,
        equipped: {
          clothing: "clothing-cape",
          accessory: "accessory-crown",
          tool: "tool-tractor",
          weapon: "weapon-compass",
        },
        unlockedAvatarStyles: ["pixel-art", "bottts"],
        notices: [],
        activityXp: 0,
        bonusXp: 1600,
        conceptLevelsPassed: [1, 2, 3],
        totalHarvests: 18,
        goldenHarvest: false,
        createdAt: now,
        updatedAt: now,
      },
      { merge: true },
    );

  console.log(`Granja demo lista para ${EMAIL} (${uid})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
