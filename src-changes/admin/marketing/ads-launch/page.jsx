"use client";

import { useState, useEffect } from "react";
import {
  Megaphone,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Facebook,
  TrendingUp,
  Users,
  DollarSign,
  Mail,
  Target,
  PhoneCall,
  ChevronRight,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react";
import Link from "next/link";

export default function AdsLaunchPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ads/launch-status", { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // refresh every 60s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-red-200 p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Couldn't load launch status</h2>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    health,
    healthScore,
    healthMaxScore,
    leads,
    campaigns,
    workflows,
    quickLinks,
  } = data;

  const healthPct = Math.round((healthScore / healthMaxScore) * 100);
  const healthColor =
    healthPct === 100
      ? "text-green-600 bg-green-50 border-green-200"
      : healthPct >= 70
      ? "text-amber-600 bg-amber-50 border-amber-200"
      : "text-red-600 bg-red-50 border-red-200";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/marketing" className="text-gray-400 hover:text-gray-600">
                <ChevronRight className="w-5 h-5 rotate-180" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Ads Launch Dashboard</h1>
                <p className="text-sm text-gray-500">
                  Real-time health of your paid ads launch · refreshes every 60s
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-gray-400 hidden sm:inline">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={load}
                disabled={loading}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Health score banner */}
        <div className={`rounded-2xl border p-5 ${healthColor}`}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-white border-2 border-current">
                {healthPct === 100 ? (
                  <Trophy className="w-7 h-7" />
                ) : (
                  <Activity className="w-7 h-7" />
                )}
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {healthScore}/{healthMaxScore} — {healthPct}% ready to launch
                </p>
                <p className="text-sm opacity-80">
                  {healthPct === 100
                    ? "All systems go. You can publish campaigns."
                    : "Fix the items below before going live."}
                </p>
              </div>
            </div>
            <Link
              href="/admin/marketing"
              className="text-sm font-medium flex items-center gap-1 hover:underline"
            >
              Full marketing hub <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Health checklist */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" /> System Health
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <HealthItem
              ok={health.pixel.configured}
              title="Meta Pixel ID"
              detail={health.pixel.message}
              link="/admin/marketing/facebook"
            />
            <HealthItem
              ok={health.capi.configured && !health.capi.testMode}
              title="Meta CAPI (server-side)"
              detail={health.capi.message}
              warn={health.capi.testMode}
            />
            <HealthItem
              ok={health.appUrl.configured}
              title="APP_URL (production URL)"
              detail={health.appUrl.message}
            />
            <HealthItem
              ok={health.webhook.configured}
              title="Meta Lead Webhook"
              detail={health.webhook.message}
              link="/admin/marketing/facebook"
            />
            <HealthItem
              ok={health.metaConnected}
              title="Meta Business connection"
              detail={
                health.metaConnected
                  ? "Connected to Meta Ads API"
                  : "Connect at the Marketing hub"
              }
              link="/admin/marketing/facebook"
            />
            <HealthItem
              ok={health.googleConnected}
              title="Google Ads connection"
              detail={
                health.googleConnected
                  ? "Connected to Google Ads API"
                  : "Connect at the Marketing hub"
              }
              link="/admin/marketing/google-ads"
            />
            <HealthItem
              ok={health.gbpLocationSet}
              title="Google Business Profile"
              detail={
                health.gbpLocationSet
                  ? "GBP location selected"
                  : "Set a location to use the reviews endpoint"
              }
              link="/admin/marketing/google-business"
            />
            <HealthItem
              ok={workflows.active > 0}
              title="Email workflows active"
              detail={
                workflows.active > 0
                  ? `${workflows.active} workflow(s) live (${workflows.new_lead_workflows} on new_lead)`
                  : "No active workflows — Meta leads won't trigger emails"
              }
              link="/admin/email-workflows"
            />
          </div>
        </div>

        {/* Lead counts */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-4 h-4" /> Lead Performance
            </h2>
            <Link
              href="/admin/leads"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All leads <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <Metric
              label="Total leads (30d)"
              value={leads.total30d}
              icon={Users}
              color="bg-blue-50 text-blue-600"
            />
            <Metric
              label="Meta leads (7d)"
              value={leads.meta7d}
              icon={Facebook}
              color="bg-indigo-50 text-indigo-600"
              subtitle={
                leads.total30d > 0
                  ? leads.metaWoW > 0
                    ? `↑ ${leads.metaWoW}% week-over-week`
                    : leads.metaWoW < 0
                    ? `↓ ${Math.abs(leads.metaWoW)}% week-over-week`
                    : `${Math.round((leads.meta7d / Math.max(leads.meta7d + leads.website7d, 1)) * 100)}% of recent`
                  : "—"
              }
            />
            <Metric
              label="Website leads (7d)"
              value={leads.website7d}
              icon={Target}
              color="bg-emerald-50 text-emerald-600"
            />
            <Metric
              label="Pending follow-ups"
              value={leads.pendingFollowUps}
              icon={PhoneCall}
              color="bg-amber-50 text-amber-600"
              warn={leads.pendingFollowUps > 5}
            />
          </div>

          {/* Lead source breakdown */}
          {leads.bySource.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                By source (last 30 days)
              </p>
              {leads.bySource.map((row) => {
                const pct = Math.round((row.total / Math.max(leads.total30d, 1)) * 100);
                return (
                  <div key={row.source} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-700 truncate" title={row.source}>
                      {row.source || "unknown"}
                    </div>
                    <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="w-12 text-right text-sm font-medium text-gray-900">
                      {row.total}
                    </div>
                    <div className="w-16 text-right text-xs text-gray-500">
                      {row.converted > 0 ? `${row.converted} won` : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {leads.bySource.length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              No leads yet. Once campaigns are live, leads will appear here.
            </div>
          )}
        </div>

        {/* Campaign + spend + recent leads side-by-side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaigns */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Megaphone className="w-4 h-4" /> Active Campaigns
            </h2>
            <div className="space-y-3">
              <CampaignRow
                platform="Meta"
                icon={Facebook}
                color="text-indigo-600"
                active={campaigns.meta.active}
                total={campaigns.meta.total}
                spend={campaigns.meta.dailySpend}
                link={quickLinks.metaAds}
              />
              <CampaignRow
                platform="Google"
                icon={Target}
                color="text-blue-600"
                active={campaigns.google.active}
                total={campaigns.google.total}
                spend={campaigns.google.dailySpend}
                link={quickLinks.googleAds}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href={quickLinks.metaAds}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                Manage Meta campaigns <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Recent Meta leads */}
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Recent Meta Leads
            </h2>
            {leads.recentMeta?.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No Meta leads yet. Once campaigns go live, the latest 5 will show here.
              </div>
            ) : (
              <div className="space-y-2">
                {leads.recentMeta?.map((l) => (
                  <Link
                    key={l.id}
                    href={`/admin/leads?id=${l.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-semibold flex items-center justify-center">
                      {l.name?.split(" ").map((p) => p[0]).slice(0, 2).join("") || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{l.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {l.service_type} · {new Date(l.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        l.status === "new"
                          ? "bg-blue-50 text-blue-700"
                          : l.status === "contacted"
                          ? "bg-amber-50 text-amber-700"
                          : l.status === "won" || l.status === "converted"
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-50 text-gray-600"
                      }`}
                    >
                      {l.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <Link
                href={quickLinks.leads}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                See all Meta leads <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-xs text-gray-400 py-4">
          Source: ~/projects/arcan-ads-launch/ · built {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}

function HealthItem({ ok, title, detail, link, warn }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertCircle : AlertCircle;
  const color = ok
    ? "text-green-600"
    : warn
    ? "text-amber-600"
    : "text-red-500";
  const bg = ok ? "bg-green-50" : warn ? "bg-amber-50" : "bg-red-50";

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${bg} border border-current/10`}>
      <Icon className={`w-5 h-5 ${color} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-600 mt-0.5">{detail}</p>
      </div>
      {link && (
        <Link
          href={link}
          className={`text-xs ${color} hover:underline flex items-center gap-0.5 flex-shrink-0`}
        >
          Fix <ChevronRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon, color, subtitle, warn }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${warn ? "text-amber-700" : "text-gray-900"}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function CampaignRow({ platform, icon: Icon, color, active, total, spend, link }) {
  return (
    <Link
      href={link}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
    >
      <Icon className={`w-5 h-5 ${color}`} />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{platform}</p>
        <p className="text-xs text-gray-500">
          {active} active · {total} total
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-gray-900">${spend.toFixed(0)}/day</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400" />
    </Link>
  );
}
