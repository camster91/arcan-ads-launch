import { useState, useEffect, Suspense } from "react";
import {
  Users,
  FileText,
  Briefcase,
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  X,
} from "lucide-react";
import LeadEditModal from "@/components/admin/leads/LeadEditModal";
import { CreateEstimateModal } from "@/components/admin/estimates/CreateEstimateModal";
import CreateProjectModal from "@/components/admin/projects/CreateProjectModal";
import { usePerformanceCache } from "@/hooks/usePerformanceCache";
import EmailHealthWidget from "@/components/admin/EmailHealthWidget";
import AdsKpiBar from "@/components/admin/dashboard/AdsKpiBar";

export default function DashboardOverview() {
  // Modal states
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [showEstimateModal, setShowEstimateModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Cached data fetching with performance optimization
  const {
    data: dashboardData,
    loading,
    error,
    refetch: refreshDashboard,
  } = usePerformanceCache(
    "dashboard-overview",
    async ({ signal }) => {
      const response = await fetch("/api/admin/dashboard", { signal });
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }
      return response.json();
    },
    {
      cacheTime: 2 * 60 * 1000, // 2 minutes for dashboard data
      staleWhileRevalidate: true,
    },
  );

  const { data: leads, refetch: refreshLeads } = usePerformanceCache(
    "leads-list",
    async ({ signal }) => {
      const response = await fetch("/api/leads", { signal });
      if (response.ok) {
        return response.json();
      }
      return [];
    },
  );

  const { data: estimates, refetch: refreshEstimates } = usePerformanceCache(
    "estimates-list",
    async ({ signal }) => {
      const response = await fetch("/api/estimates", { signal });
      if (response.ok) {
        const data = await response.json();
        const list = Array.isArray(data) ? data : (data.estimates || []);
        return list.filter((est) => est.status === "approved");
      }
      return [];
    },
  );

  const handleModalSuccess = () => {
    // Refresh dashboard data after successful modal action
    refreshDashboard();
    refreshLeads();
    refreshEstimates();
    // Close modals
    setShowLeadModal(false);
    setShowEstimateModal(false);
    setShowProjectModal(false);
    setShowFabMenu(false);
  };

  const stats = dashboardData?.stats || {};
  const recentActivity = dashboardData?.recentActivity || [];

  if (loading && !dashboardData) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse"
            >
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-slate-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-700 font-medium">Failed to load dashboard</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
        <button
          onClick={refreshDashboard}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Active Leads",
      value: stats?.activeLeads || 0,
      change: stats?.leadsChange || 0,
      icon: Users,
      color: "blue",
      href: "/admin/leads",
    },
    {
      title: "Pending Estimates",
      value: stats?.pendingEstimates || 0,
      change: stats?.estimatesChange || 0,
      icon: FileText,
      color: "amber",
      href: "/admin/estimates",
    },
    {
      title: "Active Projects",
      value: stats?.activeProjects || 0,
      change: stats?.projectsChange || 0,
      icon: Briefcase,
      color: "green",
      href: "/admin/projects",
    },
    {
      title: "Monthly Revenue",
      value: `$${(stats?.monthlyRevenue || 0).toLocaleString()}`,
      change: stats?.revenueChange || 0,
      icon: DollarSign,
      color: "purple",
      href: "/admin/payments",
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: "bg-blue-50 text-blue-600 border-blue-200",
      amber: "bg-amber-50 text-amber-600 border-amber-200",
      green: "bg-green-50 text-green-600 border-green-200",
      purple: "bg-purple-50 text-purple-600 border-purple-200",
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          const isPositive = stat.change >= 0;

          return (
            <a
              key={index}
              href={stat.href}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`p-3 rounded-lg border ${getColorClasses(stat.color)}`}
                >
                  <IconComponent className="w-6 h-6" />
                </div>
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    isPositive ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {isPositive ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {Math.abs(stat.change)}%
                </div>
              </div>

              <div>
                <p className="text-slate-600 text-sm font-medium mb-1">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  {stat.value}
                </p>
              </div>
            </a>
          );
        })}
      </div>

      {/* Ads KPIs — shown on every page load, lightweight, auto-refreshing */}
      <div className="mt-6">
        <AdsKpiBar />
      </div>

      {/* Email Health Alert */}
      <EmailHealthWidget />

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Recent Activity
            </h3>
            <Clock className="w-5 h-5 text-slate-400" />
          </div>

          <div className="space-y-4">
            {recentActivity.length > 0 ? (
              recentActivity.slice(0, 5).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div
                    className={`p-2 rounded-full ${
                      activity.type === "lead"
                        ? "bg-blue-100 text-blue-600"
                        : activity.type === "estimate"
                          ? "bg-amber-100 text-amber-600"
                          : activity.type === "project"
                            ? "bg-green-100 text-green-600"
                            : "bg-purple-100 text-purple-600"
                    }`}
                  >
                    {activity.type === "lead" && <Users className="w-4 h-4" />}
                    {activity.type === "estimate" && (
                      <FileText className="w-4 h-4" />
                    )}
                    {activity.type === "project" && (
                      <Briefcase className="w-4 h-4" />
                    )}
                    {activity.type === "payment" && (
                      <DollarSign className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {activity.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {activity.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">
              Quick Actions
            </h3>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setShowLeadModal(true)}
              className="p-4 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group text-left"
            >
              <Users className="w-6 h-6 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-900 text-sm">Add Lead</p>
              <p className="text-xs text-slate-500 mt-1">
                New customer inquiry
              </p>
            </button>

            <button
              onClick={() => setShowEstimateModal(true)}
              className="p-4 rounded-lg border border-slate-200 hover:border-amber-300 hover:bg-amber-50 transition-all duration-200 group text-left"
            >
              <FileText className="w-6 h-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-900 text-sm">
                Create Estimate
              </p>
              <p className="text-xs text-slate-500 mt-1">Price a new project</p>
            </button>

            <button
              onClick={() => setShowProjectModal(true)}
              className="p-4 rounded-lg border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group text-left"
            >
              <Briefcase className="w-6 h-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-900 text-sm">
                Start Project
              </p>
              <p className="text-xs text-slate-500 mt-1">Begin new work</p>
            </button>

            <a
              href="/admin/calendar"
              className="p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
            >
              <Calendar className="w-6 h-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-slate-900 text-sm">Schedule</p>
              <p className="text-xs text-slate-500 mt-1">Manage appointments</p>
            </a>
          </div>
        </div>
      </div>

      {/* Upcoming Tasks */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-slate-900">
            Today's Tasks
          </h3>
          <CheckCircle2 className="w-5 h-5 text-slate-400" />
        </div>

        <div className="space-y-3">
          {stats?.todaysTasks?.length > 0 ? (
            stats.todaysTasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                  defaultChecked={task.completed}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {task.title}
                  </p>
                  <p className="text-xs text-slate-500">{task.description}</p>
                </div>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    task.priority === "high"
                      ? "bg-red-100 text-red-700"
                      : task.priority === "medium"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {task.priority}
                </span>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
              <p className="text-slate-500">All caught up for today!</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {/* FAB Menu - appears above button when open */}
        {showFabMenu && (
          <div className="mb-4 space-y-3">
            <button
              onClick={() => {
                setShowLeadModal(true);
                setShowFabMenu(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 group"
            >
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                Add Lead
              </span>
            </button>
            <button
              onClick={() => {
                setShowEstimateModal(true);
                setShowFabMenu(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 group"
            >
              <FileText className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                Create Estimate
              </span>
            </button>
            <button
              onClick={() => {
                setShowProjectModal(true);
                setShowFabMenu(false);
              }}
              className="flex items-center gap-3 px-4 py-3 bg-white rounded-full shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 group"
            >
              <Briefcase className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-slate-900 whitespace-nowrap">
                Start Project
              </span>
            </button>
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center ${
            showFabMenu ? "rotate-45" : "rotate-0"
          }`}
        >
          {showFabMenu ? (
            <X className="w-6 h-6" />
          ) : (
            <Plus className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Modals */}
      {showLeadModal && (
        <LeadEditModal
          mode="create"
          onClose={() => setShowLeadModal(false)}
          onUpdated={handleModalSuccess}
        />
      )}

      {showEstimateModal && (
        <CreateEstimateModal
          leads={leads}
          onClose={() => setShowEstimateModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {showProjectModal && (
        <CreateProjectModal
          estimates={estimates}
          onClose={() => setShowProjectModal(false)}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Backdrop for FAB menu */}
      {showFabMenu && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={() => setShowFabMenu(false)}
        />
      )}
    </div>
  );
}
