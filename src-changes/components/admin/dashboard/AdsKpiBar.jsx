"use client";

import { useState, useEffect } from "react";
import { Megaphone, TrendingUp, DollarSign, Users, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

/**
 * Ads KPI bar — lightweight widget on the main admin dashboard.
 * Fetches the dashboard-summary endpoint every 60s. Shows 4 KPIs.
 * Clicking the bar navigates to the full Ads Launch dashboard.
 */
export default function AdsKpiBar() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    try {
      const res = await fetch("/api/ads/dashboard-summary", {
        credentials: "include", // pass admin session cookie
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    // Silent — ads KPIs are optional. Don't distract the dashboard with an error.
    return null;
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-orange-50/50 to-amber-50/50 border border-orange-200/50 rounded-xl">
        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
        <span className="text-sm text-gray-500">Loading ads KPIs...</span>
      </div>
    );
  }

  if (!data) return null;

  const healthPct = data.healthMax ? Math.round((data.healthScore / data.healthMax) * 100) : 0;
  const healthColor = healthPct === 100 ? "text-green-600" : healthPct >= 70 ? "text-amber-600" : "text-red-600";

  return (
    <a
      href="/admin/marketing/ads-launch"
      className="block bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 hover:border-orange-300 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Megaphone className="w-5 h-5 text-white" />
        </div>

        <div className="flex items-center gap-6 flex-1 flex-wrap">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{data.today ?? "?"}</span>
              <span className="text-gray-400 ml-1">leads today</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">${(data.spendToday ?? 0).toFixed(0)}</span>
              <span className="text-gray-400 ml-1">spent today</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-700">
              <span className="font-semibold">{data.last7 ?? "?"}</span>
              <span className="text-gray-400 ml-1">leads / 7d</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {healthPct === 100 ? (
              <CheckCircle2 className={`w-4 h-4 ${healthColor}`} />
            ) : (
              <AlertCircle className={`w-4 h-4 ${healthColor}`} />
            )}
            <span className={`text-sm font-semibold ${healthColor}`}>
              {healthPct}% ready
            </span>
          </div>
        </div>

        <span className="text-xs text-orange-600 group-hover:text-orange-700 font-medium hidden sm:inline">
          Full dashboard →
        </span>
      </div>
    </a>
  );
}
