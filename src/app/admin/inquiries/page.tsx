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
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
  consentMessages: boolean;
  consentMarketing: boolean;
  status: "new" | "contacted" | "converted" | "hot" | "warm" | "cold";
  engagementScore?: number;
  pipelineStage?: string;
  lastActivity?: string;
  notes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  createdAt: string;
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

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  converted: "bg-green-100 text-green-700",
  hot: "bg-red-100 text-red-700",
  warm: "bg-orange-100 text-orange-700",
  cold: "bg-cyan-100 text-cyan-700",
};

export default function InquiriesPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState("");

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (statusFilter) params.set("status", statusFilter);

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
  }, [page, statusFilter]);

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
    fetchInquiries();
    fetchStats();
  }, [fetchInquiries, fetchStats]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchInquiries();
      fetchStats();
      if (viewInquiry?._id === id) {
        setViewInquiry({ ...viewInquiry, status: status as Inquiry["status"] });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus("");
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

  const toggleSelectAll = () => {
    if (selectedIds.length === inquiries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inquiries.map((i) => i._id));
    }
  };

  const filteredInquiries = searchQuery
    ? inquiries.filter(
        (i) =>
          i.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.phone.includes(searchQuery)
      )
    : inquiries;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Inquiries</h1>

      {/* Stats Cards */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            {[
              { label: "Total", value: stats.total, color: "bg-white border-gray-200" },
              { label: "New", value: stats.new, color: "bg-blue-50 border-blue-200" },
              { label: "Contacted", value: stats.contacted, color: "bg-yellow-50 border-yellow-200" },
              { label: "Converted", value: stats.converted, color: "bg-green-50 border-green-200" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.color} border rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => {
                  setStatusFilter(s.label === "Total" ? "" : s.label.toLowerCase());
                  setPage(1);
                }}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: "Hot", value: stats.hot, color: "bg-red-50 border-red-200" },
              { label: "Warm", value: stats.warm, color: "bg-orange-50 border-orange-200" },
              { label: "Cold", value: stats.cold, color: "bg-cyan-50 border-cyan-200" },
            ].map((s) => (
              <div
                key={s.label}
                className={`${s.color} border rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => {
                  setStatusFilter(s.label.toLowerCase());
                  setPage(1);
                }}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                <p className="text-2xl font-bold text-[#1a1a2e] mt-1">{s.value}</p>
              </div>
            ))}
          </div>
        </>
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
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-[#f97316]"
            >
              <option value="">All Status</option>
              <option value="new">New</option>
              <option value="cold">Cold</option>
              <option value="warm">Warm</option>
              <option value="hot">Hot</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
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
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry) => (
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
                      <PipelineBadge stage={inquiry.pipelineStage || "new"} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={inquiry.status}
                        onChange={(e) => handleUpdateStatus(inquiry._id, e.target.value)}
                        disabled={updatingStatus === inquiry._id}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${statusColors[inquiry.status]}`}
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="converted">Converted</option>
                        <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(inquiry.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewInquiry(inquiry)}
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
                ))}
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
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
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
                <DetailRow label="Consent Messages" value={viewInquiry.consentMessages ? "Yes" : "No"} />
                <DetailRow label="Consent Marketing" value={viewInquiry.consentMarketing ? "Yes" : "No"} />
                <DetailRow label="UTM Source" value={viewInquiry.utm_source} />
                <DetailRow label="UTM Medium" value={viewInquiry.utm_medium} />
                <DetailRow label="UTM Campaign" value={viewInquiry.utm_campaign} />
                <DetailRow label="Submitted" value={formatDate(viewInquiry.createdAt)} />
              </div>

              {/* Engagement Score */}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Engagement Score</p>
                  <div className="mt-1"><ScoreBadge score={viewInquiry.engagementScore || 0} /></div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Pipeline Stage</p>
                  <div className="mt-1"><PipelineBadge stage={viewInquiry.pipelineStage || "new"} /></div>
                </div>
                {viewInquiry.lastActivity && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide">Last Activity</p>
                    <p className="text-sm text-[#1a1a2e] font-medium mt-0.5">{viewInquiry.lastActivity.replace(/_/g, " ")}</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={viewInquiry.status}
                  onChange={(e) => handleUpdateStatus(viewInquiry._id, e.target.value)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg border-0 cursor-pointer ${statusColors[viewInquiry.status]}`}
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
                </select>
              </div>

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

const pipelineColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  cold: "bg-cyan-100 text-cyan-700",
  warm: "bg-orange-100 text-orange-700",
  hot: "bg-red-100 text-red-700",
  converted: "bg-green-100 text-green-700",
};

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

function PipelineBadge({ stage }: { stage: string }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${pipelineColors[stage] || "bg-gray-100 text-gray-500"}`}>
      {stage}
    </span>
  );
}
