/**
 * Ads Dashboard Summary — text endpoint for Telegram bot.
 *
 * Returns a compact, human-readable summary of ads performance.
 * Designed to be called by a Telegram bot (e.g., /ads) that posts the result
 * to the operator's chat.
 *
 * Auth: requires x-cron-secret header OR admin auth.
 *
 * Format example:
 * ```
 * 📊 Arcan Ads — 2026-06-15
 *
 * Today: 7 leads, $87 spent, $12.49 CPL
 * 7d:  23 leads (↑ 18% WoW), 4 SQLs
 * 30d: 67 leads, 12 won, 18% close rate
 *
 * Campaigns:
 *   Meta:   3 active, $60/day
 *   Google: 1 active, $5/day
 *
 * Queue: 2 delayed emails due
 *
 * Health: 6/8 ready
 * ❌ APP_URL not set
 * ❌ GBP location not selected
 * ```
 */

import { getCurrentUser, unauthorizedResponse } from "@/app/api/utils/auth";
import sql from "@/app/api/utils/sql";

function formatCurrency(n) {
  if (n == null) return "$0";
  return `$${Number(n).toFixed(0)}`;
}

export async function GET(request) {
  const cronSecret = request.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();
  }

  try {
    const hasPixelId = !!process.env.META_PIXEL_ID;
    const hasCapiToken = !!process.env.META_CAPI_TOKEN;
    const hasVerifyToken = !!process.env.META_LEAD_VERIFY_TOKEN;
    const hasAppUrl = !!process.env.APP_URL;
    const capiEnabled = process.env.META_CAPI_ENABLED !== "false";
    const capiTestMode = process.env.META_CAPI_TEST === "true";

    const connections = await sql`
      SELECT platform, is_active FROM marketing_connections
    `;
    const metaConnected = connections.some((c) => c.platform === "facebook" && c.is_active);
    const googleConnected = connections.some(
      (c) => c.platform === "google" && c.is_active && c.metadata?.gbp_location_name
    );

    // Today + 7d + 30d leads
    const [leadsToday, leads7d, leadsPrev7d, leads30d, leadsWon30d] = await Promise.all([
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL`,
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE created_at >= NOW() - INTERVAL '7 days' AND deleted_at IS NULL`,
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' AND deleted_at IS NULL`,
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL`,
      sql`SELECT COUNT(*)::int AS count FROM leads WHERE created_at >= NOW() - INTERVAL '30 days' AND (status = 'won' OR status = 'converted') AND deleted_at IS NULL`,
    ]);

    // Today spend + total active
    const [metaCampaigns, googleCampaigns, delayedStats] = await Promise.all([
      sql`SELECT
            COUNT(*) FILTER (WHERE status = 'active')::int AS active,
            COALESCE(SUM(daily_budget) FILTER (WHERE status = 'active'), 0)::numeric AS spend
          FROM marketing_campaigns WHERE platform = 'facebook'`,
      sql`SELECT
            COUNT(*) FILTER (WHERE status = 'active')::int AS active,
            COALESCE(SUM(daily_budget) FILTER (WHERE status = 'active'), 0)::numeric AS spend
          FROM marketing_campaigns WHERE platform = 'google'`,
      sql`SELECT
            COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= NOW())::int AS due,
            COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
          FROM delayed_emails`,
    ]);

    // WoW delta
    const todayCount = leadsToday[0]?.count || 0;
    const last7Count = leads7d[0]?.count || 0;
    const prev7Count = leadsPrev7d[0]?.count || 0;
    const last30Count = leads30d[0]?.count || 0;
    const won30Count = leadsWon30d[0]?.count || 0;
    const wowPct = prev7Count === 0 ? (last7Count > 0 ? 100 : 0) : Math.round(((last7Count - prev7Count) / prev7Count) * 100);
    const closeRate = last30Count > 0 ? Math.round((won30Count / last30Count) * 100) : 0;
    const totalSpendToday = (parseFloat(metaCampaigns[0]?.spend) || 0) + (parseFloat(googleCampaigns[0]?.spend) || 0);
    const cplToday = todayCount > 0 ? totalSpendToday / todayCount : 0;
    const activeMeta = metaCampaigns[0]?.active || 0;
    const activeGoogle = googleCampaigns[0]?.active || 0;
    const delayedDue = delayedStats[0]?.due || 0;

    // Health score
    const healthChecks = [
      hasPixelId,
      hasCapiToken,
      hasVerifyToken,
      hasAppUrl,
      metaConnected,
      googleConnected,
    ];
    const healthScore = healthChecks.filter(Boolean).length;
    const healthMax = healthChecks.length;
    const healthIssues = [];
    if (!hasPixelId) healthIssues.push("Pixel ID not set");
    if (!hasCapiToken) healthIssues.push("CAPI token not set");
    if (!hasVerifyToken) healthIssues.push("Verify token not set");
    if (!hasAppUrl) healthIssues.push("APP_URL not set");
    if (!metaConnected) healthIssues.push("Meta not connected");
    if (!googleConnected) healthIssues.push("Google GBP not connected");

    // Format as plain text for Telegram (markdown-friendly)
    const today = new Date().toISOString().slice(0, 10);
    const wowArrow = wowPct > 0 ? "↑" : wowPct < 0 ? "↓" : "→";
    const wowPctStr = wowPct > 0 ? `+${wowPct}%` : wowPct < 0 ? `${wowPct}%` : "0%";

    const lines = [
      `📊 *Arcan Ads — ${today}*`,
      ``,
      `*Today:* ${todayCount} leads · ${formatCurrency(totalSpendToday)} spent · ${formatCurrency(cplToday)} CPL`,
      `*7d:* ${last7Count} leads (${wowArrow} ${wowPctStr} WoW)`,
      `*30d:* ${last30Count} leads · ${won30Count} won · ${closeRate}% close rate`,
      ``,
      `*Campaigns:*`,
      `  Meta:   ${activeMeta} active · ${formatCurrency(parseFloat(metaCampaigns[0]?.spend) || 0)}/day`,
      `  Google: ${activeGoogle} active · ${formatCurrency(parseFloat(googleCampaigns[0]?.spend) || 0)}/day`,
      ``,
      `*Queue:* ${delayedDue} delayed email${delayedDue === 1 ? "" : "s"} due`,
      ``,
      `*Health:* ${healthScore}/${healthMax} ready`,
    ];
    if (healthIssues.length) {
      lines.push(healthIssues.map((i) => `❌ ${i}`).join("\n"));
    }
    if (capiTestMode) {
      lines.push("⚠️ CAPI in test mode");
    }

    return Response.json({
      text: lines.join("\n"),
      data: {
        today: todayCount,
        spendToday: totalSpendToday,
        cplToday,
        last7: last7Count,
        last7Prev: prev7Count,
        wowPct,
        last30: last30Count,
        won30: won30Count,
        closeRate,
        activeMeta,
        activeGoogle,
        spendMeta: parseFloat(metaCampaigns[0]?.spend) || 0,
        spendGoogle: parseFloat(googleCampaigns[0]?.spend) || 0,
        delayedDue,
        healthScore,
        healthMax,
        healthIssues,
      },
    });
  } catch (error) {
    console.error("GET /api/ads/dashboard-summary error:", error);
    return Response.json(
      { text: `❌ Dashboard failed: ${error.message}` },
      { status: 500 }
    );
  }
}
