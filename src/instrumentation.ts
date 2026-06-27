export async function register() {
  // Never touch the database during `next build` (collecting page data). Running
  // migrations there opens connections / long backfills that can hang or kill the
  // build worker. Migrations should only run when the server actually boots.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateDb } = await import("./db/migrate");
    await migrateDb().catch((e) => console.error("[auto-migrate] failed:", e));
  }
}
