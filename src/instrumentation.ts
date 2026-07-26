export async function register() {
  // Never touch the database during `next build` (collecting page data). Running
  // migrations there opens connections / long backfills that can hang or kill the
  // build worker. Migrations should only run when the server actually boots.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { migrateDb } = await import("./db/migrate");
    await migrateDb().catch((e) => console.error("[auto-migrate] failed:", e));
    // anime_audio_availability (+ source/status columns) is created in migrateDb
    // so SUB/DUB poster counts can persist across requests without hitting KittyAPI.

    const { ensureDataEncryptionKey } = await import("./lib/security/data-encryption-key");
    await ensureDataEncryptionKey().catch((e) =>
      console.error("[data-encryption-key] init failed:", e),
    );

    const { runReactiveTwoFactorMaintenance } = await import("./lib/auth/totp-reactive");
    await runReactiveTwoFactorMaintenance().catch((e) =>
      console.error("[2fa-reactive] maintenance failed:", e),
    );
  }
}
