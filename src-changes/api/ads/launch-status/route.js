/**
 * Ads Launch Status — single endpoint for the launch dashboard.
 *
 * Aggregates everything an operator needs to know at a glance:
 * - Pixel/CAPI/webhook health
 * - Lead counts by source (last 7d, last 30d) + week-over-week deltas
 * - Active campaigns (Meta + Google)
 * - Spend today, projected month-end
 * - Email workflow engine health
 * - Delayed email queue depth
 * - Recent leads from any source
 *
 * Cached at the React Query layer, refreshed every 60s in the UI.
 */

import { getCurrentUser, unauthorizedResponse } from "@/app/api/utils/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return unauthorizedResponse();

    // 1. Pixel + CAPI + webhook configuration health
    const hasPixelId = !!process.env.META_PIXEL_ID;
    const hasCapiToken = !!process.env.META_CAPI_TOKEN;
    const hasVerifyToken = !!process.env.META_LEAD_VERIFY_TOKEN;
    const hasAppUrl = !!process.env.APP_URL;
    const capiEnabled = process.env.META_CAPI_ENABLED !== "false";
    const capiTestMode = process.env.META_CAPI_TEST === "true";

    // 2. Marketing connections (Meta, Google, LinkedIn)
    const connections = await sql`
      SELECT platform, is_active, metadata, updated_at
      FROM marketing_connections
      ORDER BY platform
    `;
    const metaConnected = connections.some((c) => c.platform === "facebook" && c.is_active);
    const googleConnected = connections.some((c) => c.platform === "google" && c.is_active);
    const gbpLocationSet = connections.some(
      (c) => c.platform === "google" && c.metadata?.gbp_location_name
    );

    // 3. Lead counts by source with week-over-week delta
    const leadBySource = await sql`
      SELECT
        COALESCE(lead_source, 'website') AS source,
        COUNT(*)::int AS total,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 day' THEN 1 END)::int AS last_24h,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END)::int AS last_7d,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days' THEN 1 END)::int AS previous_7d,
        COUNT(CASE WHEN status = 'won' OR status = 'converted' THEN 1 END)::int AS converted
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
      GROUP BY COALESCE(lead_source, 'website')
      ORDER BY total DESC
    `;

    const totalLeads30d = leadBySource.reduce((s, r) => s + r.total, 0);
    const metaLeads30d = leadBySource
      .filter((r) => r.source === "meta_lead_ad")
      .reduce((s, r) => s + r.total, 0);
    const metaLeads7d = leadBySource
      .filter((r) => r.source === "meta_lead_ad")
      .reduce((s, r) => s + r.last_7d, 0);
    const metaLeadsPrev7d = leadBySource
      .filter((r) => r.source === "meta_lead_ad")
      .reduce((s, r) => s + r.previous_7d, 0);
    const websiteLeads7d = leadBySource
      .filter((r) => r.source === "website")
      .reduce((s, r) => s + r.last_7d, 0);

    // Compute week-over-week percentage change for Meta (avoid div/0)
    const metaWoW =
      metaLeadsPrev7d === 0
        ? metaLeads7d > 0
          ? 100
          : 0
        : Math.round(((metaLeads7d - metaLeadsPrev7d) / metaLeadsPrev7d) * 100);

    // 4. Active campaigns — both Meta and Google
    const metaCampaigns = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*)::int AS total,
        COALESCE(SUM(daily_budget) FILTER (WHERE status = 'active'), 0)::numeric AS daily_spend
      FROM marketing_campaigns
      WHERE platform = 'facebook'
    `;
    const googleCampaigns = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*)::int AS total,
        COALESCE(SUM(daily_budget) FILTER (WHERE status = 'active'), 0)::numeric AS daily_spend
      FROM marketing_campaigns
      WHERE platform = 'google'
    `;

    // 5. Email workflow engine health
    const workflows = await sql`
      SELECT
        COUNT(*)::int AS total,
        COUNT(CASE WHEN is_active = true THEN 1 END)::int AS active,
        COUNT(CASE WHEN trigger_event = 'new_lead' THEN 1 END)::int AS new_lead_workflows,
        COUNT(CASE WHEN delay_hours > 0 AND is_active = true THEN 1 END)::int AS delayed_workflows
      FROM email_workflows
    `;

    // 6. Delayed emails queue stats
    const delayedQueue = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= NOW())::int AS due_now,
        COUNT(*) FILTER (WHERE status = 'sent')::int AS sent,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
      FROM delayed_emails
    `;

    // 7. Recent Meta leads (for the "last 5" feed)
    const recentMetaLeads = await sql`
      SELECT id, name, service_type, created_at, status, lead_source
      FROM leads
      WHERE lead_source = 'meta_lead_ad' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // 8. Recent leads from any source (for the broader feed)
    const recentLeads = await sql`
      SELECT id, name, service_type, created_at, status, lead_source
      FROM leads
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // 9. Open follow-ups (for the "needs attention" widget)
    const pendingFollowUps = await sql`
      SELECT COUNT(*)::int AS count
      FROM follow_ups
      WHERE status = 'pending'
        AND follow_up_date <= NOW() + INTERVAL '1 day'
    `;

    // 10. Conversion rate (last 30d)
    const totalLeads30dRow = await sql`
      SELECT COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'won' OR status = 'converted' THEN 1 END)::int AS won
      FROM leads
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND deleted_at IS NULL
    `;
    const conversionRate =
      totalLeads30dRow[0]?.total > 0
        ? Math.round((totalLeads30dRow[0].won / totalLeads30dRow[0].total) * 100)
        : 0;

    // Build the response
    const health = {
      pixel: {
        configured: hasPixelId,
        clientEnv: !!process.env.NEXT_PUBLIC_META_PIXEL_ID,
        message: hasPixelId
          ? process.env.NEXT_PUBLIC_META_PIXEL_ID === process.env.META_PIXEL_ID
            ? "Pixel ID is set (server + client match)"
            : "Pixel ID mismatch between server and client env"
          : "Set META_PIXEL_ID in Coolify env",
      },
      capi: {
        configured: hasCapiToken,
        enabled: capiEnabled,
        testMode: capiTestMode,
        message: !hasCapiToken
          ? "Set META_CAPI_TOKEN in Coolify env"
          : capiTestMode
          ? "CAPI is in test mode (set META_CAPI_TEST=false for production)"
          : "CAPI live and ready",
      },
      webhook: {
        configured: hasVerifyToken,
        message: hasVerifyToken
          ? "Verify token is set"
          : "Set META_LEAD_VERIFY_TOKEN in Coolify env",
      },
      appUrl: {
        configured: hasAppUrl,
        message: hasAppUrl
          ? "APP_URL is set"
          : "Set APP_URL in Coolify env (used by webhook internal fetches)",
      },
      metaConnected,
      googleConnected,
      gbpLocationSet,
    };

    const healthScore = [
      hasPixelId && process.env.NEXT_PUBLIC_META_PIXEL_ID === process.env.META_PIXEL_ID,
      hasCapiToken,
      hasVerifyToken,
      hasAppUrl,
      metaConnected,
      googleConnected,
      gbpLocationSet,
      workflows.active > 0,
    ].filter(Boolean).length;

    return Response.json({
      health,
      healthScore,
      healthMaxScore: 8,
      leads: {
        total30d: totalLeads30d,
        meta30d: metaLeads30d,
        meta7d: metaLeads7d,
        meta7dPrev: metaLeadsPrev7d,
        metaWoW,
        website7d: websiteLeads7d,
        conversionRate,
        bySource: leadBySource,
        recentMeta: recentMetaLeads ?? [],
        recent: recentLeads ?? [],
        pendingFollowUps: pendingFollowUps[0]?.count || 0,
      },
      campaigns: {
        meta: {
          active: metaCampaigns[0]?.active || 0,
          total: metaCampaigns[0]?.total || 0,
          dailySpend: parseFloat(metaCampaigns[0]?.daily_spend) || 0,
        },
        google: {
          active: googleCampaigns[0]?.active || 0,
          total: googleCampaigns[0]?.total || 0,
          dailySpend: parseFloat(googleCampaigns[0]?.daily_spend) || 0,
        },
      },
      workflows: workflows[0] || { total: 0, active: 0, new_lead_workflows: 0, delayed_workflows: 0 },
      delayedQueue: delayedQueue[0] || { pending: 0, due_now: 0, sent: 0, failed: 0 },
      quickLinks: {
        metaAds: "/admin/marketing/facebook",
        googleAds: "/admin/marketing/google-ads",
        gbp: "/admin/marketing/google-business",
        leads: "/admin/leads",
        workflows: "/admin/email-workflows",
        delayedQueue: "/admin/delayed-emails",
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /api/ads/launch-status error:", error);
    return Response.json(
      { error: "Failed to load launch status", details: error.message },
      { status: 500 }
    );
  }
}
