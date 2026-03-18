"use client";

import { useEffect, useState, useCallback } from "react";
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
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ActivityLogEntry {
  event: string;
  scoreAdded: number;
  timestamp: string;
}

interface Inquiry {
  _id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  role?: string;
  teamSize?: string;
  gstNumber?: string;
  consentMessages: boolean;
  consentMarketing: boolean;
  status: string;
  engagementScore?: number;
  pipelineStage?: string;
  lastActivity?: string;
  activityLog?: ActivityLogEntry[];
  notes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  createdAt: string;
}

interface PipelineStage {
  _id: string;
  key: string;
  label: string;
  minScore: number;
  color: string;
  order: number;
}

interface Stats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
  hot: number;
  warm: number;
  cold: number;
}

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pipelineFilter, setPipelineFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [updatingPipeline, setUpdatingPipeline] = useState("");

  const fetchStages = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config`);
      const data = await res.json();
      if (data.statusCode === 200 && data.data.pipelineStages) {
        const sorted = [...data.data.pipelineStages].sort(
          (a: PipelineStage, b: PipelineStage) => a.order - b.order
        );
        setStages(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch stages:", err);
    }
  }, []);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });

      const res = await fetch(
        `${API_BASE_URL}/api/v1/pm/inquiry?${params.toString()}`
      );
      const data = await res.json();

      if (data.statusCode === 200) {
        setInquiries(data.data.inquiries);
        setTotalPages(data.data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch inquiries:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/stats`);
      const data = await res.json();
      if (data.statusCode === 200) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  useEffect(() => {
    fetchInquiries();
    fetchStats();
  }, [fetchInquiries, fetchStats]);

  const handleUpdatePipeline = async (id: string, pipelineStage: string) => {
    setUpdatingPipeline(id);
    // Optimistic update
    setInquiries((prev) =>
      prev.map((i) => (i._id === id ? { ...i, pipelineStage } : i))
    );
    if (viewInquiry?._id === id) {
      setViewInquiry({ ...viewInquiry, pipelineStage });
    }
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage }),
      });
    } catch (err) {
      console.error("Failed to update pipeline:", err);
      fetchInquiries();
    } finally {
      setUpdatingPipeline("");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this inquiry?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/${id}`, {
        method: "DELETE",
      });
      fetchInquiries();
      fetchStats();
      if (viewInquiry?._id === id) setViewInquiry(null);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleBulkDelete = async () => {
    if (
      !confirm(`Are you sure you want to delete ${selectedIds.length} inquiries?`)
    )
      return;
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/delete-multiple`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      setSelectedIds([]);
      fetchInquiries();
      fetchStats();
    } catch (err) {
      console.error("Failed to bulk delete:", err);
    }
  };

  const handleUpdateNotes = async (id: string, notes: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
    } catch (err) {
      console.error("Failed to update notes:", err);
    }
  };

  const fetchActivityLog = async (inquiryId: string) => {
    setLoadingActivity(true);
    setActivityLog([]);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/engagement/${inquiryId}`);
      const data = await res.json();
      if (data.statusCode === 200 && data.data?.activityLog) {
        setActivityLog(data.data.activityLog);
      }
    } catch (err) {
      console.error("Failed to fetch activity log:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleViewInquiry = (inquiry: Inquiry) => {
    setViewInquiry(inquiry);
    fetchActivityLog(inquiry._id);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Inquiries</h1>

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
                fetchInquiries();
                fetchStats();
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
                        <ScoreBadge score={inquiry.engagementScore || 0} />
                      </td>
                      <td className="px-4 py-3">
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
                onClick={() => setViewInquiry(null)}
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
                  <div className="mt-1">
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
                  </div>
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

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-[#1a1a2e] font-medium mt-0.5">
        {value || "-"}
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
