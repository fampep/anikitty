import { getDb, rowsOf } from "@/db";
import { providerHealthLogs } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function logProviderHealth(
  provider: string,
  success: boolean,
  responseTimeMs: number,
  errorMessage?: string,
  httpStatus?: number,
): Promise<void> {
  try {
    const db = getDb();
    await db.insert(providerHealthLogs).values({
      provider,
      success,
      responseTimeMs,
      errorMessage: errorMessage ?? null,
      httpStatus: httpStatus ?? null,
    });
  } catch (e) {
    console.error("[provider-health] log failed:", e);
  }
}

export type ProviderHealthSummary = {
  provider: string;
  totalRequests: number;
  successCount: number;
  failedCount: number;
  uptimePercent: number;
  avgResponseMs: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  status: "healthy" | "degraded" | "offline";
};

export async function getProviderHealthSummary(): Promise<ProviderHealthSummary[]> {
  const db = getDb();
  const rows = rowsOf(
    await db.execute(sql`
      SELECT
        provider,
        COUNT(*)::int AS total_requests,
        COUNT(*) FILTER (WHERE success = TRUE)::int AS success_count,
        COUNT(*) FILTER (WHERE success = FALSE)::int AS failed_count,
        ROUND(100.0 * COUNT(*) FILTER (WHERE success = TRUE) / GREATEST(COUNT(*), 1), 1) AS uptime_percent,
        COALESCE(AVG(response_time_ms) FILTER (WHERE success = TRUE), 0)::int AS avg_response_ms,
        MAX(created_at) FILTER (WHERE success = TRUE) AS last_success_at,
        MAX(created_at) FILTER (WHERE success = FALSE) AS last_failure_at
      FROM provider_health_logs
      WHERE created_at > NOW() - INTERVAL '24 hours'
      GROUP BY provider
      ORDER BY provider
    `),
  );

  return rows.map((r) => {
    const uptime = Number(r.uptime_percent ?? 100);
    const recentFailed = Number(r.failed_count ?? 0);
    let status: "healthy" | "degraded" | "offline" = "healthy";
    if (uptime < 50 || recentFailed > 20) status = "offline";
    else if (uptime < 90 || recentFailed > 5) status = "degraded";

    return {
      provider: String(r.provider),
      totalRequests: Number(r.total_requests),
      successCount: Number(r.success_count),
      failedCount: Number(r.failed_count),
      uptimePercent: uptime,
      avgResponseMs: Number(r.avg_response_ms),
      lastSuccessAt: r.last_success_at ? String(r.last_success_at) : null,
      lastFailureAt: r.last_failure_at ? String(r.last_failure_at) : null,
      status,
    };
  });
}
