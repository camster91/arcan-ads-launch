"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Phone,
  Mail,
  User,
  MapPin,
  DollarSign,
  Search,
  Filter,
  Plus,
  Grid,
  List,
  RefreshCw,
  Users,
} from "lucide-react";
import LeadCard from "@/components/LeadCard";
import LeadQuickView from "@/components/LeadQuickView";
import LeadsTable from "@/components/admin/leads/LeadsTable";
import LeadEditModal from "@/components/admin/leads/LeadEditModal";
import AIScheduleModal from "@/components/admin/leads/AIScheduleModal";

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("created_desc");
  const [selectedLead, setSelectedLead] = useState(null);
  const [showQuickView, setShowQuickView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [createMode, setCreateMode] = useState(false);
  const [viewMode, setViewMode] = useState("cards");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showAISchedule, setShowAISchedule] = useState(false);
  const [aiScheduleLead, setAIScheduleLead] = useState(null);

  const statusOptions = [
    { label: "All Leads", value: "all" },
    { label: "New", value: "new" },
    { label: "Contacted", value: "contacted" },
    { label: "Estimate Scheduled", value: "estimate_scheduled" },
    { label: "Estimate Sent", value: "estimate_sent" },
    { label: "Follow Up", value: "follow_up" },
    { label: "Won", value: "won" },
    { label: "Lost", value: "lost" },
  ];

  const sourceOptions = [
    { label: "All Sources", value: "all" },
    { label: "Website", value: "website" },
    { label: "Meta Ads", value: "meta_lead_ad" },
    { label: "Google Ads", value: "google_ads" },
    { label: "Referral", value: "referral" },
    { label: "Other", value: "other" },
  ];

  useEffect(() => {
    fetchLeads();
    fetchAppointments();
  }, [statusFilter, sourceFilter, sortBy]);

  const fetchLeads = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }
      if (sourceFilter !== "all") {
        params.append("source", sourceFilter);
      }
      if (sortBy) {
        params.append("sort", sortBy);
      }

      const response = await fetch(`/api/leads?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch leads");
      }

      const data = await response.json();
      setLeads(data.leads || []);
    } catch (err) {
      setError(err.message);
      console.error("Error fetching leads:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch("/api/appointments");
      if (res.ok) {
        const data = await res.json();
        setAppointments(data.appointments || []);
      }
    } catch (e) {
      console.error("Error fetching appointments:", e);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone.includes(searchTerm) ||
      lead.service_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    estimate_scheduled: leads.filter((l) => l.status === "estimate_scheduled")
      .length,
    estimate_sent: leads.filter((l) => l.status === "estimate_sent").length,
    follow_up: leads.filter((l) => l.status === "follow_up").length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
    pending: leads.filter((l) =>
      [
        "new",
        "contacted",
        "estimate_scheduled",
        "estimate_sent",
        "follow_up",
      ].includes(l.status),
    ).length,
  };

  const statusCounts = {
    all: stats.total,
    new: stats.new,
    contacted: stats.contacted,
    estimate_scheduled: stats.estimate_scheduled,
    estimate_sent: stats.estimate_sent,
    follow_up: stats.follow_up,
    won: stats.won,
    lost: stats.lost,
  };

  const nextAppointmentByLead = useMemo(() => {
    const map = new Map();
    for (const a of appointments) {
      if (!a.lead_id) continue;
      const next = map.get(a.lead_id);
      const aDate = new Date(
        `${a.slot_date}T${String(a.start_time).slice(0, 8)}`,
      );
      if (!next) {
        map.set(a.lead_id, a);
      } else {
        const nDate = new Date(
          `${next.slot_date}T${String(next.start_time).slice(0, 8)}`,
        );
        if (aDate < nDate) map.set(a.lead_id, a);
      }
    }
    return map;
  }, [appointments]);

  const handleLeadAction = (action, lead) => {
    setSelectedLead(lead);

    switch (action) {
      case "view":
      case "quick_view":
        setShowQuickView(true);
        break;
      case "call":
        window.location.href = `tel:${lead.phone}`;
        break;
      case "email":
        window.location.href = `mailto:${lead.email}`;
        break;
      case "estimate":
        window.location.href = `/admin/estimates?lead_id=${lead.id}`;
        break;
      case "schedule":
        window.location.href = `/admin/appointments?lead_id=${lead.id}`;
        break;
      case "ai_schedule":
        setAIScheduleLead(lead);
        setShowAISchedule(true);
        break;
      case "edit":
        setShowEdit(true);
        break;
      case "delete":
        setDeleteConfirm(lead);
        break;
      default:
        console.log("Unknown action:", action);
    }
  };

  const handleDeleteLead = async () => {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      const response = await fetch("/api/leads", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteConfirm.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete lead");
      }

      setLeads(leads.filter((lead) => lead.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Error deleting lead:", err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Page Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
              <p className="text-sm text-slate-600 mt-1">
                {filteredLeads.length} of {leads.length} customer inquiries
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={() => fetchLeads(true)}
                disabled={refreshing}
                className="px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* View Mode Toggle - Desktop Only */}
              <div className="hidden lg:flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("cards")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    viewMode === "cards"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Grid size={16} />
                  Cards
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                    viewMode === "list"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <List size={16} />
                  Table
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedLead(null);
                  setCreateMode(true);
                  setShowEdit(true);
                }}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={16} />
                New Lead
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Leads
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">New</p>
                <p className="text-2xl font-bold text-blue-600">{stats.new}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  In Progress
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {stats.pending}
                </p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Phone className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Won</p>
                <p className="text-2xl font-bold text-green-600">{stats.won}</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Filter size={16} />
              Filters
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search
                  size={18}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or service..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div
              className={`lg:flex gap-2 ${showMobileFilters ? "flex flex-wrap" : "hidden"}`}
            >
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    statusFilter === status.value
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                  }`}
                >
                  {status.label}
                  {statusCounts[status.value] > 0 && (
                    <span className="ml-1.5 text-xs opacity-75">
                      ({statusCounts[status.value]})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Source Filter */}
            <div
              className={`lg:flex gap-2 ${showMobileFilters ? "flex flex-wrap" : "hidden"}`}
            >
              {sourceOptions.map((source) => (
                <button
                  key={source.value}
                  onClick={() => setSourceFilter(source.value)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    sourceFilter === source.value
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-transparent"
                  }`}
                >
                  {source.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={() => fetchLeads(true)}
              className="mt-2 text-red-600 hover:text-red-800 underline text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Leads Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No leads found
            </h3>
            <p className="text-slate-600 mb-6">
              {searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Leads will appear here when customers submit inquiries."}
            </p>
            <button
              onClick={() => {
                setSelectedLead(null);
                setCreateMode(true);
                setShowEdit(true);
              }}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Add First Lead
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="lg:hidden space-y-4">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="bg-white rounded-lg border border-slate-200"
                >
                  <LeadCard
                    lead={{
                      ...lead,
                      nextAppointment:
                        nextAppointmentByLead.get(lead.id) || null,
                    }}
                    onQuickView={() => handleLeadAction("quick_view", lead)}
                    onAction={handleLeadAction}
                  />
                </div>
              ))}
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {filteredLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="bg-white rounded-lg border border-slate-200"
                    >
                      <LeadCard
                        lead={{
                          ...lead,
                          nextAppointment:
                            nextAppointmentByLead.get(lead.id) || null,
                        }}
                        onQuickView={() => handleLeadAction("quick_view", lead)}
                        onAction={handleLeadAction}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200">
                  <LeadsTable
                    leads={filteredLeads}
                    nextAppointmentsMap={nextAppointmentByLead}
                    onQuickView={(lead) => handleLeadAction("quick_view", lead)}
                    onAction={handleLeadAction}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <LeadQuickView
        lead={selectedLead}
        isOpen={showQuickView}
        onClose={() => {
          setShowQuickView(false);
          setSelectedLead(null);
        }}
        onAction={handleLeadAction}
      />

      {showEdit && (
        <LeadEditModal
          lead={selectedLead}
          mode={createMode ? "create" : "edit"}
          onClose={() => {
            setShowEdit(false);
            setSelectedLead(null);
            setCreateMode(false);
          }}
          onUpdated={() => fetchLeads(true)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                Delete Lead
              </h3>
              <p className="text-slate-600 mb-6">
                Are you sure you want to delete{" "}
                <strong>{deleteConfirm.name}</strong>? This action cannot be
                undone and will also delete all associated estimates,
                appointments, and projects.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteLead}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {deleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Lead"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Schedule Estimate Modal */}
      {showAISchedule && aiScheduleLead && (
        <AIScheduleModal
          lead={aiScheduleLead}
          onClose={() => {
            setShowAISchedule(false);
            setAIScheduleLead(null);
          }}
          onSlotSelected={(slot, schedule) => {
            // Navigate to appointments with pre-filled data
            const params = new URLSearchParams({
              lead_id: aiScheduleLead.id,
              date: slot.date,
              time: slot.time,
            });
            window.location.href = `/admin/appointments?${params}`;
          }}
        />
      )}
    </div>
  );
}
