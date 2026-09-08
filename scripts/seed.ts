import { createDemoDatabase } from "../src/lib/seed/demo-data";

async function main() {
  if (process.env.ALLOW_SEED !== "true") {
    throw new Error("Refusing to seed. Set ALLOW_SEED=true in the environment.");
  }

  const db = createDemoDatabase();
  const counts = Object.fromEntries(
    Object.entries(db).map(([key, value]) => [key, Array.isArray(value) ? value.length : 0]),
  );

  console.log("Seed architecture ready. Collection counts:");
  console.log(counts);
  console.log("Connect Firebase Admin and write these collections from a controlled job before production use.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
