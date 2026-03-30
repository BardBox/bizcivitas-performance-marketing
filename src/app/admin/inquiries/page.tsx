"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Eye,
  Clock,
  Activity,
  Mail,
  MessageCircle,
  ChevronDown,
  Send,
} from "lucide-react";
import {
  useGetInquiriesQuery,
  useGetInquiryStatsQuery,
  useUpdateInquiryMutation,
  useDeleteInquiryMutation,
  useDeleteMultipleInquiriesMutation,
  useResetInquiryScoreMutation,
} from "@/store/endpoints/inquiries";
import { useGetScoringConfigQuery } from "@/store/endpoints/scoringConfig";
import { useLazyGetEngagementQuery } from "@/store/endpoints/engagement";
import type { Inquiry } from "@/store/endpoints/inquiries";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ViewOnlyBanner } from "@/components/admin/ViewOnlyBanner";

// Digital marketing terminology mapped to pipeline stage keys
const MARKETING_LABELS: Record<string, { term: string; description: string }> = {
  new: { term: "Inquiry", description: "Raw lead — just submitted the form" },
  engaged: { term: "Lead (MQL)", description: "Marketing Qualified — showing interest" },
  contacted: { term: "Prospect", description: "In conversation — sales outreach done" },
  qualified: { term: "Sales Qualified (SQL)", description: "Confirmed buying intent" },
  negotiation: { term: "Opportunity", description: "Deal in progress — proposal/pricing stage" },
  won: { term: "Customer", description: "Converted — deal closed" },
  lost: { term: "Churned", description: "Did not convert — lost opportunity" },
  converted: { term: "Customer", description: "Converted — paid member" },
  proposal: { term: "Opportunity", description: "Proposal sent — awaiting decision" },
  follow_up: { term: "Nurturing", description: "Re-engagement — needs follow-up" },
};

const getMarketingLabel = (stageKey: string) => {
  return MARKETING_LABELS[stageKey] || { term: "Lead", description: "In pipeline" };
};

export default function InquiriesPage() {
  const { canView, canEdit, loading: permLoading } = useAdminPermissions();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pipelineFilter, setPipelineFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [updatingPipeline, setUpdatingPipeline] = useState("");

  // Send accordions state
  const [emailAccOpen, setEmailAccOpen] = useState(false);
  const [waAccOpen, setWaAccOpen] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<{ _id: string; name: string; subject: string; category: string }[]>([]);
  const [waTemplates, setWaTemplates] = useState<{ _id: string; name: string; tftTemplateName: string; category: string }[]>([]);
  const [selectedEmailTpl, setSelectedEmailTpl] = useState("");
  const [selectedWaTpl, setSelectedWaTpl] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [sendResult, setSendResult] = useState<{ type: string; success: boolean; message: string } | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState("");

  // RTK Query hooks — auto-fetch on mount
  const { data: scoringConfig } = useGetScoringConfigQuery();
  const { data: inquiriesData, isLoading: loading, refetch: refetchInquiries } = useGetInquiriesQuery({ page, limit: 15 });
  const { data: stats, refetch: refetchStats } = useGetInquiryStatsQuery();

  // Lazy query — only fires when user clicks "View"
  const [triggerEngagement, { data: engagementData, isFetching: loadingActivity }] = useLazyGetEngagementQuery();

  // Mutation hooks
  const [updateInquiry] = useUpdateInquiryMutation();
  const [deleteInquiry] = useDeleteInquiryMutation();
  const [deleteMultiple] = useDeleteMultipleInquiriesMutation();
  const [resetScore, { isLoading: resettingScore }] = useResetInquiryScoreMutation();

  // Derive data from query results
  const stages = scoringConfig?.pipelineStages
    ? [...scoringConfig.pipelineStages].sort((a, b) => a.order - b.order)
    : [];
  const inquiries = inquiriesData?.inquiries || [];
  const totalPages = inquiriesData?.totalPages || 1;
  const activityLog = engagementData?.activityLog || [];

  // Auth check
  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  // Fetch templates when inquiry modal opens
  useEffect(() => {
    if (viewInquiry) {
      fetch(`${API_BASE_URL}/pm/email-templates`)
        .then((r) => r.json())
        .then((d) => { if (d.statusCode === 200) setEmailTemplates(d.data || []); })
        .catch(() => {});
      fetch(`${API_BASE_URL}/pm/whatsapp-templates`)
        .then((r) => r.json())
        .then((d) => { if (d.statusCode === 200) setWaTemplates(d.data || []); })
        .catch(() => {});
      setSendResult(null);
      setSelectedEmailTpl("");
      setSelectedWaTpl("");
      setEmailAccOpen(false);
      setWaAccOpen(false);
    }
  }, [viewInquiry]);

  const handleSendEmail = async () => {
    if (!selectedEmailTpl || !viewInquiry?.email) return;
    setSendingEmail(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-templates/${selectedEmailTpl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: [viewInquiry.email] }),
      });
      const data = await res.json();
      setSendResult({
        type: "email",
        success: data.statusCode === 200,
        message: data.message || (data.statusCode === 200 ? "Email sent!" : "Failed to send"),
      });
    } catch {
      setSendResult({ type: "email", success: false, message: "Failed to send email" });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSendWhatsapp = async () => {
    if (!selectedWaTpl || !viewInquiry?.phone) return;
    setSendingWa(true);
    setSendResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/whatsapp-templates/${selectedWaTpl}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: viewInquiry.phone, inquiryId: viewInquiry._id }),
      });
      const data = await res.json();
      setSendResult({
        type: "whatsapp",
        success: data.statusCode === 200,
        message: data.message || (data.statusCode === 200 ? "WhatsApp sent!" : "Failed to send"),
      });
    } catch {
      setSendResult({ type: "whatsapp", success: false, message: "Failed to send WhatsApp" });
    } finally {
      setSendingWa(false);
    }
  };

  const handleUpdatePipeline = async (id: string, pipelineStage: string) => {
    setUpdatingPipeline(id);
    // Update the viewInquiry locally if it's the one being changed
    if (viewInquiry?._id === id) {
      setViewInquiry({ ...viewInquiry, pipelineStage });
    }
    try {
      await updateInquiry({ id, pipelineStage }).unwrap();
    } catch (err) {
      console.error("Failed to update pipeline:", err);
    } finally {
      setUpdatingPipeline("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inquiry?")) return;
    try {
      await deleteInquiry(id).unwrap();
      if (viewInquiry?._id === id) setViewInquiry(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      alert("Please select at least one inquiry to delete.");
      return;
    }
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} inquiries?`)) return;
    try {
      await deleteMultiple({ ids: selectedIds }).unwrap();
      setSelectedIds([]);
      refetchInquiries();
      refetchStats();
    } catch (err) {
      const errMsg =
        (err as { data?: { message?: string }; error?: string; message?: string })?.data?.message ||
        (err as { error?: string })?.error ||
        (err as { message?: string })?.message ||
        "Failed to bulk delete inquiries";
      console.error("Failed to bulk delete:", err);
      alert(errMsg);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await updateInquiry({ id, notes }).unwrap();
    } catch (err) {
      console.error("Failed to update notes:", err);
    }
  };

  const handleViewInquiry = (inquiry: Inquiry) => {
    setViewInquiry(inquiry);
    triggerEngagement(inquiry._id);
  };

  const handleResetScore = async () => {
    if (!viewInquiry) return;
    if (resetConfirmText !== "sudo delete") return;
    const updated = await resetScore(viewInquiry._id).unwrap();
    setViewInquiry({ ...viewInquiry, engagementScore: updated.engagementScore, lastActivity: updated.lastActivity });
    setResetConfirmText("");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map((i) => i._id));
    }
  };

  const getStageColor = (stageKey: string) => {
    return stages.find((s) => s.key === stageKey)?.color || "#6b7280";
  };

  // Filter by search + pipeline
  const filteredInquiries = inquiries.filter((i) => {
    const matchesSearch = !searchQuery ||
      i.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.phone.includes(searchQuery);

    const matchesPipeline = !pipelineFilter ||
      (i.pipelineStage || "new") === pipelineFilter;

    return matchesSearch && matchesPipeline;
  });

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Compute pipeline stage counts from current inquiries for stats
  const pipelineCounts = stages.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = 0;
    return acc;
  }, {});
  inquiries.forEach((i) => {
    const key = i.pipelineStage || "new";
    if (pipelineCounts[key] !== undefined) pipelineCounts[key]++;
  });

  if (!permLoading && !canView("inquiries")) return <AccessDenied />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Inquiries</h1>
      {!canEdit("inquiries") && <ViewOnlyBanner />}

      {/* Pipeline Stage Stats */}
      {stages.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {/* Total */}
          <div
            className="bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => { setPipelineFilter(""); setPage(1); }}
          >
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{stats?.total || inquiries.length}</p>
          </div>
          {stages.map((s) => (
            <div
              key={s.key}
              className={`border rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition-shadow ${
                pipelineFilter === s.key ? "ring-2 ring-offset-1" : ""
              }`}
              style={{
                backgroundColor: s.color + "10",
                borderColor: s.color + "30",
                ...(pipelineFilter === s.key ? { ringColor: s.color } : {}),
              }}
              onClick={() => {
                setPipelineFilter(pipelineFilter === s.key ? "" : s.key);
                setPage(1);
              }}
            >
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <p className="text-xs uppercase tracking-wide" style={{ color: s.color }}>{s.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1" style={{ color: s.color }}>{pipelineCounts[s.key] || 0}</p>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4">
        <div className="px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search name, email, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:border-[#f97316]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <select
              value={pipelineFilter}
              onChange={(e) => {
                setPipelineFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#f97316]"
            >
              <option value="">All Stages</option>
              {stages.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => {
                refetchInquiries();
                refetchStats();
              }}
              className="flex items-center gap-1 px-3 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
          </div>
        ) : filteredInquiries.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No inquiries found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === inquiries.length && inquiries.length > 0}
                      onChange={toggleSelectAll}
                      className="accent-[#f97316]"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Score</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Pipeline</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry) => {
                  const stageKey = inquiry.pipelineStage || "new";
                  const stageColor = getStageColor(stageKey);

                  return (
                    <tr
                      key={inquiry._id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(inquiry._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, inquiry._id]);
                            } else {
                              setSelectedIds(selectedIds.filter((id) => id !== inquiry._id));
                            }
                          }}
                          className="accent-[#f97316]"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1a1a2e]">
                        {inquiry.fullName}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{inquiry.companyName}</td>
                      <td className="px-4 py-3 text-gray-600">{inquiry.email}</td>
                      <td className="px-4 py-3 text-gray-600">{inquiry.phone}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {[inquiry.city, inquiry.state].filter(Boolean).join(", ") || "-"}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const statusColors: Record<string, { bg: string; text: string }> = {
                            new: { bg: "#e0f2fe", text: "#0369a1" },
                            contacted: { bg: "#dcfce7", text: "#16a34a" },
                            converted: { bg: "#f0fdf4", text: "#15803d" },
                            hot: { bg: "#fee2e2", text: "#dc2626" },
                            warm: { bg: "#ffedd5", text: "#ea580c" },
                            cold: { bg: "#f1f5f9", text: "#64748b" },
                          };
                          const s = inquiry.status || "new";
                          const c = statusColors[s] || { bg: "#f3f4f6", text: "#6b7280" };
                          return (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide" style={{ backgroundColor: c.bg, color: c.text }}>
                              {s}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBadge score={inquiry.engagementScore || 0} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <select
                            value={stageKey}
                            onChange={(e) => handleUpdatePipeline(inquiry._id, e.target.value)}
                            disabled={updatingPipeline === inquiry._id}
                            className="text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer uppercase tracking-wide appearance-none pr-6"
                            style={{
                              backgroundColor: stageColor + "18",
                              color: stageColor,
                              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(stageColor)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "right 6px center",
                            }}
                          >
                            {stages.map((s) => (
                              <option key={s.key} value={s.key}>{s.label}</option>
                            ))}
                          </select>
                          <span className="text-[10px] text-gray-400 font-medium pl-1">
                            {getMarketingLabel(stageKey).term}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {formatDate(inquiry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleViewInquiry(inquiry)}
                            className="p-1.5 text-gray-400 hover:text-[#f97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(inquiry._id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {viewInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl">
            <div className="bg-[#1a1a2e] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">Inquiry Details</h3>
              <button
                onClick={() => { setViewInquiry(null); setResetConfirmText(""); }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Full Name" value={viewInquiry.fullName} />
                <DetailRow label="Company" value={viewInquiry.companyName} />
                <DetailRow label="Email" value={viewInquiry.email} />
                <DetailRow label="Phone" value={viewInquiry.phone} />
                <DetailRow label="City" value={viewInquiry.city} />
                <DetailRow label="State" value={viewInquiry.state} />
                <DetailRow label="Role" value={viewInquiry.role} />
                <DetailRow label="Team Size" value={viewInquiry.teamSize} />
                <DetailRow label="GST Number" value={viewInquiry.gstNumber} />
                <DetailRow label="Consent Messages" value={viewInquiry.consentMessages ? "Yes" : "No"} />
                <DetailRow label="Consent Marketing" value={viewInquiry.consentMarketing ? "Yes" : "No"} />
                <DetailRow label="UTM Source" value={viewInquiry.utm_source} />
                <DetailRow label="UTM Medium" value={viewInquiry.utm_medium} />
                <DetailRow label="UTM Campaign" value={viewInquiry.utm_campaign} />
                <DetailRow label="Submitted" value={formatDate(viewInquiry.createdAt)} />
              </div>

              {/* Engagement Score + Pipeline */}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Engagement Score</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-2xl font-bold text-[#f97316]">{viewInquiry.engagementScore || 0}</span>
                    <ScoreBadge score={viewInquiry.engagementScore || 0} />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Pipeline Stage</p>
                  <div className="mt-1 flex items-center gap-2">
                    <select
                      value={viewInquiry.pipelineStage || "new"}
                      onChange={(e) => handleUpdatePipeline(viewInquiry._id, e.target.value)}
                      disabled={updatingPipeline === viewInquiry._id}
                      className="text-xs font-semibold px-3 py-1 rounded-full border-0 cursor-pointer uppercase tracking-wide appearance-none pr-7"
                      style={{
                        backgroundColor: getStageColor(viewInquiry.pipelineStage || "new") + "18",
                        color: getStageColor(viewInquiry.pipelineStage || "new"),
                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(getStageColor(viewInquiry.pipelineStage || "new"))}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "right 8px center",
                      }}
                    >
                      {stages.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                    <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                      {getMarketingLabel(viewInquiry.pipelineStage || "new").term}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    {getMarketingLabel(viewInquiry.pipelineStage || "new").description}
                  </p>
                </div>
                {viewInquiry.lastActivity && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Last Activity</p>
                    <p className="text-sm text-[#1a1a2e] font-medium mt-0.5">{viewInquiry.lastActivity.replace(/_/g, " ")}</p>
                  </div>
                )}
              </div>

              {/* Activity Timeline */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="w-4 h-4 text-[#f97316]" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Activity Timeline</p>
                </div>

                {loadingActivity ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[#f97316]" />
                  </div>
                ) : activityLog.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    No activity tracked yet
                  </div>
                ) : (
                  <div className="relative ml-3">
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-0">
                      {[...activityLog].reverse().map((entry, idx) => {
                        const runningScore = activityLog
                          .slice(0, activityLog.length - idx)
                          .reduce((sum, e) => sum + (e.scoreAdded || 0), 0);

                        return (
                          <div key={idx} className="relative pl-6 py-2 group">
                            <div className={`absolute left-[-4px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              entry.scoreAdded >= 15 ? "bg-red-500" :
                              entry.scoreAdded >= 8 ? "bg-orange-500" :
                              entry.scoreAdded >= 5 ? "bg-yellow-500" :
                              "bg-gray-400"
                            }`} />

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#1a1a2e] capitalize">
                                  {eventLabel(entry.event)}
                                </span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  entry.scoreAdded >= 15 ? "bg-red-100 text-red-700" :
                                  entry.scoreAdded >= 8 ? "bg-orange-100 text-orange-700" :
                                  entry.scoreAdded >= 5 ? "bg-yellow-100 text-yellow-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>
                                  +{entry.scoreAdded}
                                </span>
                              </div>
                              <span className="text-[10px] font-semibold text-gray-400 tabular-nums">
                                = {runningScore} pts
                              </span>
                            </div>

                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-300" />
                              <span className="text-[10px] text-gray-400">
                                {new Date(entry.timestamp).toLocaleString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Send Result */}
              {sendResult && (
                <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
                  sendResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {sendResult.message}
                </div>
              )}

              {/* View Conversation Button */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    router.push(`/admin/inquiries/${viewInquiry._id}/conversation`);
                    setViewInquiry(null);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  View Full Conversation
                </button>
              </div>

              {/* Send Email Accordion */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => setEmailAccOpen(!emailAccOpen)}
                  className="flex items-center justify-between w-full py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[#f97316]" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Send Email</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${emailAccOpen ? "rotate-180" : ""}`} />
                </button>
                {emailAccOpen && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedEmailTpl}
                      onChange={(e) => setSelectedEmailTpl(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                    >
                      <option value="">Select email template...</option>
                      {emailTemplates.map((t) => (
                        <option key={t._id} value={t._id}>{t.name} ({t.category})</option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400">
                        To: {viewInquiry?.email}
                      </p>
                      <button
                        onClick={handleSendEmail}
                        disabled={!selectedEmailTpl || sendingEmail}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {sendingEmail ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send Email
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Send WhatsApp Accordion */}
              <div className="pt-3 border-t border-gray-100">
                <button
                  onClick={() => setWaAccOpen(!waAccOpen)}
                  className="flex items-center justify-between w-full py-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Send WhatsApp</span>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${waAccOpen ? "rotate-180" : ""}`} />
                </button>
                {waAccOpen && (
                  <div className="mt-2 space-y-2">
                    <select
                      value={selectedWaTpl}
                      onChange={(e) => setSelectedWaTpl(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                    >
                      <option value="">Select WhatsApp template...</option>
                      {waTemplates.map((t) => (
                        <option key={t._id} value={t._id}>{t.name} ({t.tftTemplateName})</option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-gray-400">
                        To: {viewInquiry?.phone}
                      </p>
                      <button
                        onClick={handleSendWhatsapp}
                        disabled={!selectedWaTpl || sendingWa || !viewInquiry?.phone}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1da851] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {sendingWa ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                        Send WhatsApp
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Notes
                </label>
                <textarea
                  defaultValue={viewInquiry.notes || ""}
                  onBlur={(e) => handleUpdateNotes(viewInquiry._id, e.target.value)}
                  placeholder="Add notes about this inquiry..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] resize-none"
                />
              </div>

              {/* Reset Score */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-1.5">
                  Type <span className="font-mono font-semibold text-gray-600">sudo delete</span> to reset engagement score
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="sudo delete"
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-300 font-mono"
                  />
                  <button
                    onClick={handleResetScore}
                    disabled={resettingScore || resetConfirmText !== "sudo delete"}
                    className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {resettingScore ? "Resetting…" : "Reset Score"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const EVENT_LABELS: Record<string, string> = {
  page_visit: "Page Visit",
  return_visit: "Return Visit",
  time_30sec: "Stayed 30 seconds",
  time_2min: "Stayed 2 minutes",
  scroll_50: "Scrolled 50%+",
  cta_click: "CTA Click",
  form_started: "Form Started",
  form_submitted: "Form Submitted",
  file_download: "File Download",
  pricing_visit: "Pricing Page Visit",
  multiple_pages: "5+ Pages Visited",
};

function eventLabel(key: string): string {
  return EVENT_LABELS[key] || key.replace(/_/g, " ");
}

function DetailRow({ label, value }: { label: string; value?: string | boolean }) {
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : value;
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#1a1a2e] font-medium mt-0.5">
        {display || "-"}
      </p>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  let color = "text-gray-500 bg-gray-100";
  if (score > 50) color = "text-red-700 bg-red-100";
  else if (score > 25) color = "text-orange-700 bg-orange-100";
  else if (score > 10) color = "text-cyan-700 bg-cyan-100";
  else if (score > 0) color = "text-blue-700 bg-blue-100";

  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}
