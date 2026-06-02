import { getCurrentUser } from "../../../utils/auth.js";
import sql from "../../../utils/sql.js";

async function getFacebookToken() {
  const rows = await sql`
    SELECT access_token, token_expiry, metadata
    FROM marketing_connections
    WHERE platform = 'facebook' AND is_active = true
    LIMIT 1
  `;
  if (!rows.length) return null;

  const conn = rows[0];
  // Check if token is expired
  if (conn.token_expiry && new Date(conn.token_expiry) < new Date()) {
    return null; // Token expired — user needs to reconnect
  }

  const metadata = typeof conn.metadata === "string" ? JSON.parse(conn.metadata) : conn.metadata;
  return { accessToken: conn.access_token, adAccountId: metadata?.adAccountId };
}

// GET — list live campaigns from Facebook
export async function GET(request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const syncFromMeta = url.searchParams.get("sync") === "true";

  // Get local campaigns
  const campaigns = await sql`
    SELECT lc.*, ac.campaign_name AS creative_name, ac.headline, ac.primary_text
    FROM live_campaigns lc
    LEFT JOIN ad_creatives ac ON lc.creative_id = ac.id
    WHERE lc.platform = 'facebook'
    ORDER BY lc.created_at DESC
  `;

  // Optionally sync stats from Meta
  if (syncFromMeta) {
    const fb = await getFacebookToken();
    if (fb?.accessToken && fb?.adAccountId) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/v19.0/${fb.adAccountId}/campaigns?fields=id,name,status,daily_budget,lifetime_budget,insights{impressions,clicks,actions}&access_token=${fb.accessToken}`
        );
        if (res.ok) {
          const data = await res.json();
          // Update local records with fresh stats
          for (const mc of data.data || []) {
            const insights = mc.insights?.data?.[0];
            if (insights) {
              const conversions = (insights.actions || [])
                .filter((a) => a.action_type === "offsite_conversion")
                .reduce((sum, a) => sum + parseInt(a.value || 0, 10), 0);

              await sql(
                `UPDATE live_campaigns SET
                   impressions = $1, clicks = $2, conversions = $3,
                   status = $4, updated_at = CURRENT_TIMESTAMP
                 WHERE platform_campaign_id = $5`,
                [
                  parseInt(insights.impressions || 0, 10),
                  parseInt(insights.clicks || 0, 10),
                  conversions,
                  mc.status?.toLowerCase() || "active",
                  mc.id,
                ]
              );
            }
          }
          // Re-fetch updated campaigns
          const updated = await sql`
            SELECT lc.*, ac.campaign_name AS creative_name, ac.headline, ac.primary_text
            FROM live_campaigns lc
            LEFT JOIN ad_creatives ac ON lc.creative_id = ac.id
            WHERE lc.platform = 'facebook'
            ORDER BY lc.created_at DESC
          `;
          return Response.json({ campaigns: updated, synced: true });
        }
      } catch (err) {
        console.error("[facebook/ads] sync error:", err.message);
      }
    }
  }

  return Response.json({ campaigns });
}

// POST — publish a new campaign to Facebook
export async function POST(request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const fb = await getFacebookToken();
  if (!fb?.accessToken || !fb?.adAccountId) {
    return Response.json(
      { error: "Facebook not connected or token expired. Please reconnect." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const {
    creative_id,
    campaign_name,
    daily_budget,
    total_budget,
    start_date,
    end_date,
    target_url = "https://arcanpainting.ca",
    targeting = {},
    objective = "OUTCOME_TRAFFIC",
    lead_form_id = null,        // For LEAD_GEN campaigns: existing lead form ID
    create_lead_form = null,    // For LEAD_GEN: inline form definition to create
  } = body;

  if (!campaign_name) {
    return Response.json({ error: "campaign_name is required" }, { status: 400 });
  }

  try {
    // Step 1: Create Campaign
    const campaignRes = await fetch(
      `https://graph.facebook.com/v19.0/${fb.adAccountId}/campaigns`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaign_name,
          objective,
          status: "PAUSED", // Start paused for safety
          special_ad_categories: ["HOUSING"], // Painting = housing services
          access_token: fb.accessToken,
        }),
      }
    );
    if (!campaignRes.ok) {
      const err = await campaignRes.json();
      throw new Error(err.error?.message || "Failed to create campaign");
    }
    const campaign = await campaignRes.json();

    // Step 2: Create Ad Set with budget and targeting
    const adSetBody = {
      name: `${campaign_name} - Ad Set`,
      campaign_id: campaign.id,
      billing_event: "IMPRESSIONS",
      // For LEAD_GEN, optimize for leads. For TRAFFIC, optimize for link clicks.
      optimization_goal: objective === "LEAD_GEN" ? "LEAD_GENERATION" : "LINK_CLICKS",
      // For LEAD_GEN, set the destination type and lead form ref
      ...(objective === "LEAD_GEN" && lead_form_id && {
        destination_type: "ON_AD",
        lead_form_id: String(lead_form_id),
      }),
      status: "PAUSED",
      access_token: fb.accessToken,
      targeting: {
        geo_locations: targeting.locations || { cities: [{ key: "296875", name: "Ottawa" }] },
        age_min: targeting.age_min || 25,
        age_max: targeting.age_max || 65,
        ...(targeting.interests?.length && {
          flexible_spec: [{ interests: targeting.interests }],
        }),
      },
    };

    if (daily_budget) {
      adSetBody.daily_budget = Math.round(daily_budget * 100); // Meta uses cents
    } else if (total_budget) {
      adSetBody.lifetime_budget = Math.round(total_budget * 100);
    } else {
      adSetBody.daily_budget = 2000; // $20/day default
    }

    if (start_date) adSetBody.start_time = new Date(start_date).toISOString();
    if (end_date) adSetBody.end_time = new Date(end_date).toISOString();

    const adSetRes = await fetch(
      `https://graph.facebook.com/v19.0/${fb.adAccountId}/adsets`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adSetBody),
      }
    );
    if (!adSetRes.ok) {
      const err = await adSetRes.json();
      throw new Error(err.error?.message || "Failed to create ad set");
    }
    const adSet = await adSetRes.json();

    // Step 3: Create Ad Creative (if creative_id provided, use its content)
    let headline = body.headline || "Professional Painting Services";
    let primaryText = body.primary_text || "Transform your home with Arcan Painting. Free estimates!";
    let description = body.description || "Licensed & insured painters in Ottawa";
    let callToAction = body.call_to_action || "LEARN_MORE";

    if (creative_id) {
      const creativeRows = await sql`SELECT * FROM ad_creatives WHERE id = ${creative_id}`;
      if (creativeRows.length) {
        const c = creativeRows[0];
        headline = c.headline || headline;
        primaryText = c.primary_text || primaryText;
        description = c.description || description;
        callToAction = c.call_to_action || callToAction;
      }
    }

    // Step 3: Build the ad creative. For LEAD_GEN campaigns with a lead_form_id,
    // use the leadgen_template / object_story_spec with a lead_gen_form_id instead of link_data.
    let adCreativeBody;
    if (objective === "LEAD_GEN" && lead_form_id) {
      adCreativeBody = {
        name: `${campaign_name} - Creative`,
        object_story_spec: {
          page_id: undefined, // Set from the connected Facebook page; if not available, Meta will reject
          lead_gen_data: {
            lead_gen_form_id: String(lead_form_id),
            call_to_action: { type: "SIGN_UP" },
          },
        },
        access_token: fb.accessToken,
      };
    } else {
      adCreativeBody = {
        name: `${campaign_name} - Creative`,
        object_story_spec: {
          link_data: {
            link: target_url,
            message: primaryText,
            name: headline,
            description,
            call_to_action: { type: callToAction },
          },
        },
        access_token: fb.accessToken,
      };
    }

    const adCreativeRes = await fetch(
      `https://graph.facebook.com/v19.0/${fb.adAccountId}/adcreatives`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(adCreativeBody),
      }
    );
    if (!adCreativeRes.ok) {
      const err = await adCreativeRes.json();
      throw new Error(err.error?.message || "Failed to create ad creative");
    }
    const adCreative = await adCreativeRes.json();

    // Step 4: Create Ad
    const adRes = await fetch(
      `https://graph.facebook.com/v19.0/${fb.adAccountId}/ads`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${campaign_name} - Ad`,
          adset_id: adSet.id,
          creative: { creative_id: adCreative.id },
          status: "PAUSED",
          access_token: fb.accessToken,
        }),
      }
    );
    if (!adRes.ok) {
      const err = await adRes.json();
      throw new Error(err.error?.message || "Failed to create ad");
    }

    // Step 5: Save to local database
    const saved = await sql(
      `INSERT INTO live_campaigns
         (platform, platform_campaign_id, creative_id, campaign_name, status,
          daily_budget, total_budget, start_date, end_date, target_url, targeting, platform_data)
       VALUES ('facebook', $1, $2, $3, 'paused', $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        campaign.id,
        creative_id || null,
        campaign_name,
        daily_budget || null,
        total_budget || null,
        start_date || null,
        end_date || null,
        target_url,
        JSON.stringify(targeting),
        JSON.stringify({
          campaignId: campaign.id,
          adSetId: adSet.id,
          adCreativeId: adCreative.id,
          objective,
        }),
      ]
    );

    return Response.json({
      success: true,
      campaign: saved[0],
      meta: { campaignId: campaign.id, adSetId: adSet.id },
      message: "Campaign created (PAUSED). Go to the Campaigns tab to activate it.",
    });
  } catch (err) {
    console.error("[facebook/ads] POST error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// PATCH — pause, activate, or update a campaign
export async function PATCH(request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const fb = await getFacebookToken();
  if (!fb?.accessToken) {
    return Response.json({ error: "Facebook not connected" }, { status: 400 });
  }

  const { id, action } = await request.json();
  if (!id || !action) {
    return Response.json({ error: "id and action are required" }, { status: 400 });
  }

  const rows = await sql`SELECT * FROM live_campaigns WHERE id = ${id} AND platform = 'facebook'`;
  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = rows[0];
  let newStatus;

  if (action === "pause") newStatus = "PAUSED";
  else if (action === "activate") newStatus = "ACTIVE";
  else return Response.json({ error: "Invalid action. Use 'pause' or 'activate'." }, { status: 400 });

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${campaign.platform_campaign_id}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          access_token: fb.accessToken,
        }),
      }
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || "Failed to update campaign");
    }

    await sql(
      `UPDATE live_campaigns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newStatus.toLowerCase(), id]
    );

    return Response.json({ success: true, status: newStatus.toLowerCase() });
  } catch (err) {
    console.error("[facebook/ads] PATCH error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// DELETE — remove a campaign
export async function DELETE(request) {
  const user = await getCurrentUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const fb = await getFacebookToken();
  const { id } = await request.json();

  const rows = await sql`SELECT * FROM live_campaigns WHERE id = ${id} AND platform = 'facebook'`;
  if (!rows.length) {
    return Response.json({ error: "Campaign not found" }, { status: 404 });
  }

  const campaign = rows[0];

  // Try to delete from Meta (best-effort)
  if (fb?.accessToken && campaign.platform_campaign_id) {
    try {
      await fetch(
        `https://graph.facebook.com/v19.0/${campaign.platform_campaign_id}?access_token=${fb.accessToken}`,
        { method: "DELETE" }
      );
    } catch (err) {
      console.error("[facebook/ads] Meta delete error:", err.message);
    }
  }

  await sql`DELETE FROM live_campaigns WHERE id = ${id}`;
  return Response.json({ success: true });
}
