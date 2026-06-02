import { useState } from "react";
import {
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  MoreVertical,
  Eye,
  Edit,
  MessageSquare,
  Trash2,
  ArrowRight,
} from "lucide-react";

export default function LeadCard({ lead, onQuickView, onAction }) {
  const [showActions, setShowActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      new: "bg-blue-100 text-blue-800 border-blue-200",
      contacted: "bg-yellow-100 text-yellow-800 border-yellow-200",
      estimate_scheduled: "bg-purple-100 text-purple-800 border-purple-200",
      estimate_sent: "bg-orange-100 text-orange-800 border-orange-200",
      follow_up: "bg-amber-100 text-amber-800 border-amber-200",
      won: "bg-green-100 text-green-800 border-green-200",
      lost: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getPriorityIndicator = (lead) => {
    if (lead.status === "new") return "high";
    if (lead.follow_up_date && new Date(lead.follow_up_date) <= new Date())
      return "urgent";
    if (lead.estimated_value >= 5000) return "high";
    return "normal";
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatAppt = (a) => {
    try {
      const start = new Date(
        `${a.slot_date}T${String(a.start_time).slice(0, 8)}`,
      );
      const end = new Date(`${a.slot_date}T${String(a.end_time).slice(0, 8)}`);
      const day = start.toLocaleDateString();
      const time = `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} – ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      return { day, time };
    } catch {
      return null;
    }
  };

  const priority = getPriorityIndicator(lead);

  // Handle card click - open quick view
  const handleCardClick = () => {
    onQuickView(lead);
  };

  // Quick actions that appear on hover
  const handleCall = (e) => {
    e.stopPropagation();
    window.location.href = `tel:${lead.phone}`;
  };

  const handleEmail = (e) => {
    e.stopPropagation();
    window.location.href = `mailto:${lead.email}`;
  };

  const handleMessage = (e) => {
    e.stopPropagation();
    // Would integrate with SMS service
    alert("SMS feature would be integrated here");
  };

  const appt = lead.nextAppointment ? formatAppt(lead.nextAppointment) : null;

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-200 cursor-pointer group relative overflow-hidden ${
        isHovered
          ? "shadow-xl scale-105 border-amber-300"
          : "shadow-md hover:shadow-lg"
      }`}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Priority indicator */}
      {priority === "urgent" && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      )}
      {priority === "high" && (
        <div className="absolute top-4 right-4 w-3 h-3 bg-amber-500 rounded-full" />
      )}

      {/* Hover overlay with quick actions */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-amber-500/5 to-yellow-500/5 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-lg text-slate-900 truncate">
              {lead.name}
            </h3>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(lead.status)}`}
            >
              {lead.status.replace("_", " ")}
            </span>
          </div>

          {lead.address && (
            <p className="text-sm text-slate-500 flex items-center gap-2 mb-1">
              <MapPin size={14} />
              {lead.address.length > 45
                ? `${lead.address.substring(0, 45)}...`
                : lead.address}
            </p>
          )}
        </div>

        {/* Actions Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowActions(!showActions);
          }}
          className={`p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all duration-200 ${
            isHovered ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Service & Value */}
      <div className="flex items-center justify-between mb-4 relative z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-base font-semibold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
            {lead.service_type}
          </span>
          {lead.lead_source && lead.lead_source.trim() && lead.lead_source !== "website" && (
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                lead.lead_source === "meta_lead_ad"
                  ? "bg-indigo-100 text-indigo-700"
                  : lead.lead_source === "google_ads"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-slate-200 text-slate-700"
              }`}
              title={`Lead source: ${lead.lead_source}`}
            >
              {lead.lead_source === "meta_lead_ad" ? "Meta" :
               lead.lead_source === "google_ads" ? "Google" :
               lead.lead_source === "referral" ? "Referral" :
               lead.lead_source.trim() || "—"}
            </span>
          )}
        </div>
        {lead.estimated_value && (
          <span className="text-base font-bold text-green-600 flex items-center gap-1 bg-green-50 px-3 py-1 rounded-lg">
            <DollarSign size={14} />
            {lead.estimated_value.toLocaleString()}
          </span>
        )}
      </div>

      {/* Contact Info */}
      <div className="space-y-3 mb-4 relative z-10">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Mail size={14} className="text-slate-400" />
          <span className="truncate font-medium">{lead.email}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Phone size={14} className="text-slate-400" />
          <span className="font-medium">{lead.phone}</span>
        </div>
        {appt && (
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <Calendar size={14} />
            <span className="font-medium">
              On-site {appt.day} • {appt.time}
            </span>
          </div>
        )}
      </div>

      {/* Timeline & Follow-up */}
      <div className="flex items-center justify-between text-sm text-slate-500 mb-4 relative z-10">
        <span>Created {formatDate(lead.created_at)}</span>
        {lead.follow_up_date && (
          <span className="flex items-center gap-1 text-amber-600 font-medium">
            <Clock size={12} />
            Due {formatDate(lead.follow_up_date)}
          </span>
        )}
      </div>

      {/* Project Description Preview */}
      {lead.project_description && (
        <div className="mb-4 relative z-10">
          <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
            {lead.project_description.length > 120
              ? `${lead.project_description.substring(0, 120)}...`
              : lead.project_description}
          </p>
        </div>
      )}

      {/* Click indicator */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100 relative z-10">
        {/* Quick action buttons - appear on hover */}
        <div
          className={`flex items-center gap-1 transition-all duration-200 ${
            isHovered ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
          }`}
        >
          <button
            onClick={handleCall}
            className="p-2 text-slate-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            title="Call"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={handleEmail}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Email"
          >
            <Mail size={16} />
          </button>
          <button
            onClick={handleMessage}
            className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Message"
          >
            <MessageSquare size={16} />
          </button>
        </div>

        {/* Click to view indicator */}
        <div
          className={`flex items-center gap-2 text-amber-600 font-medium transition-all duration-200 ${
            isHovered ? "opacity-100 translate-x-0" : "opacity-60 translate-x-2"
          }`}
        >
          <span className="text-sm">View Details</span>
          <ArrowRight
            size={16}
            className={`transition-transform duration-200 ${
              isHovered ? "translate-x-1" : ""
            }`}
          />
        </div>
      </div>

      {/* Dropdown Actions Menu */}
      {showActions && (
        <div className="absolute top-16 right-4 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-30 min-w-[160px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction("edit", lead);
              setShowActions(false);
            }}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
          >
            <Edit size={14} />
            Edit Lead
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction("estimate", lead);
              setShowActions(false);
            }}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
          >
            <Calendar size={14} />
            Create Estimate
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction("follow_up", lead);
              setShowActions(false);
            }}
            className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3"
          >
            <Clock size={14} />
            Schedule Follow-up
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAction("delete", lead);
              setShowActions(false);
            }}
            className="w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-red-50 flex items-center gap-3"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}

      {/* Backdrop to close actions menu */}
      {showActions && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowActions(false)}
        />
      )}
    </div>
  );
}
