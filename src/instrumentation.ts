export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateDb } = await import("./db/migrate");
    await migrateDb().catch((e) => console.error("[auto-migrate] failed:", e));
  }
}
