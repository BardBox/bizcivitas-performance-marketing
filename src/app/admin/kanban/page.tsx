"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  X,
  Clock,
  Activity,
  RefreshCw,
  GripVertical,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

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

export default function KanbanPage() {
  const router = useRouter();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewInquiry, setViewInquiry] = useState<Inquiry | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState("");

  // Drag-and-drop state
  const [draggedInquiry, setDraggedInquiry] = useState<Inquiry | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const [movingInquiryId, setMovingInquiryId] = useState<string | null>(null);
  const dragCounterRef = useRef<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [inquiryRes, configRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/pm/inquiry?page=1&limit=500`),
        fetch(`${API_BASE_URL}/api/v1/pm/scoring-config`),
      ]);
      const inquiryData = await inquiryRes.json();
      const configData = await configRes.json();

      if (inquiryData.statusCode === 200) {
        // Exclude converted/paid members — they are on the Members page
        const nonConverted = inquiryData.data.inquiries.filter(
          (i: Inquiry) => i.status !== "converted"
        );
        setInquiries(nonConverted);
      }
      if (configData.statusCode === 200 && configData.data.pipelineStages) {
        const sorted = [...configData.data.pipelineStages].sort(
          (a: PipelineStage, b: PipelineStage) => a.order - b.order
        );
        setStages(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoadingActivity(false);
    }
  };

  const handleViewInquiry = (inquiry: Inquiry) => {
    setViewInquiry(inquiry);
    fetchActivityLog(inquiry._id);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingStatus(id);
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchData();
      if (viewInquiry?._id === id) {
        setViewInquiry({ ...viewInquiry, status });
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus("");
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

  // Move inquiry to a new pipeline stage (API + optimistic update)
  const moveInquiryToStage = async (inquiry: Inquiry, newStageKey: string) => {
    if ((inquiry.pipelineStage || "new") === newStageKey) return;

    setMovingInquiryId(inquiry._id);

    // Optimistic update
    setInquiries((prev) =>
      prev.map((i) =>
        i._id === inquiry._id ? { ...i, pipelineStage: newStageKey } : i
      )
    );

    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/${inquiry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStageKey }),
      });
    } catch (err) {
      console.error("Failed to move inquiry:", err);
      // Revert on failure
      setInquiries((prev) =>
        prev.map((i) =>
          i._id === inquiry._id ? { ...i, pipelineStage: inquiry.pipelineStage } : i
        )
      );
    } finally {
      setMovingInquiryId(null);
    }
  };

  // --- Drag handlers ---
  const handleDragStart = (e: React.DragEvent, inquiry: Inquiry) => {
    setDraggedInquiry(inquiry);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", inquiry._id);
    // Add a slight delay so the drag image captures the card
    setTimeout(() => {
      const el = document.getElementById(`card-${inquiry._id}`);
      if (el) el.style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = () => {
    if (draggedInquiry) {
      const el = document.getElementById(`card-${draggedInquiry._id}`);
      if (el) el.style.opacity = "1";
    }
    setDraggedInquiry(null);
    setDragOverStage(null);
    setDragOverCardId(null);
    dragCounterRef.current = {};
  };

  const handleColumnDragEnter = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    dragCounterRef.current[stageKey] = (dragCounterRef.current[stageKey] || 0) + 1;
    setDragOverStage(stageKey);
  };

  const handleColumnDragLeave = (stageKey: string) => {
    dragCounterRef.current[stageKey] = (dragCounterRef.current[stageKey] || 0) - 1;
    if (dragCounterRef.current[stageKey] <= 0) {
      dragCounterRef.current[stageKey] = 0;
      if (dragOverStage === stageKey) {
        setDragOverStage(null);
      }
    }
  };

  const handleColumnDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleColumnDrop = (e: React.DragEvent, stageKey: string) => {
    e.preventDefault();
    if (draggedInquiry) {
      moveInquiryToStage(draggedInquiry, stageKey);
    }
    setDraggedInquiry(null);
    setDragOverStage(null);
    setDragOverCardId(null);
    dragCounterRef.current = {};
  };

  const getInquiriesByStage = (stageKey: string) => {
    return inquiries.filter((i) => {
      const stage = i.pipelineStage || "new";
      return stage === stageKey;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Pipeline Board</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Drag cards between columns to move leads through pipeline stages
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ scrollbarWidth: "thin" }}>
        {stages.map((stage) => {
          const stageInquiries = getInquiriesByStage(stage.key);
          const isDropTarget = dragOverStage === stage.key && draggedInquiry && (draggedInquiry.pipelineStage || "new") !== stage.key;

          return (
            <div
              key={stage._id}
              className={`flex-shrink-0 w-[300px] rounded-xl border-2 transition-all duration-200 ${
                isDropTarget
                  ? "border-dashed scale-[1.01] shadow-lg"
                  : "border-gray-200 bg-gray-50"
              }`}
              style={{
                borderColor: isDropTarget ? stage.color : undefined,
                backgroundColor: isDropTarget ? stage.color + "08" : undefined,
              }}
              onDragEnter={(e) => handleColumnDragEnter(e, stage.key)}
              onDragLeave={() => handleColumnDragLeave(stage.key)}
              onDragOver={handleColumnDragOver}
              onDrop={(e) => handleColumnDrop(e, stage.key)}
            >
              {/* Column Header */}
              <div
                className="px-4 py-3 rounded-t-[10px] flex items-center justify-between"
                style={{ backgroundColor: stage.color + "15" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: stage.color }}
                  />
                  <span
                    className="text-sm font-semibold"
                    style={{ color: stage.color }}
                  >
                    {stage.label}
                  </span>
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: stage.color + "20",
                    color: stage.color,
                  }}
                >
                  {stageInquiries.length}
                </span>
              </div>

              {/* Cards area */}
              <div
                className="p-2 space-y-2 min-h-[120px] max-h-[calc(100vh-220px)] overflow-y-auto"
                style={{ scrollbarWidth: "thin" }}
              >
                {stageInquiries.length === 0 && !isDropTarget ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No leads
                  </div>
                ) : stageInquiries.length === 0 && isDropTarget ? (
                  <div
                    className="flex items-center justify-center py-8 text-xs font-medium rounded-lg border-2 border-dashed transition-all"
                    style={{ borderColor: stage.color + "50", color: stage.color }}
                  >
                    Drop here
                  </div>
                ) : (
                  stageInquiries.map((inquiry) => (
                    <div
                      key={inquiry._id}
                      id={`card-${inquiry._id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, inquiry)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => {
                        e.stopPropagation();
                        setDragOverCardId(inquiry._id);
                      }}
                      onClick={() => handleViewInquiry(inquiry)}
                      className={`group bg-white rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-all select-none ${
                        movingInquiryId === inquiry._id
                          ? "border-orange-300 bg-orange-50/50"
                          : dragOverCardId === inquiry._id && draggedInquiry && draggedInquiry._id !== inquiry._id
                          ? "border-t-2 border-t-blue-400"
                          : "border-gray-200 hover:shadow-md hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-1 opacity-0 group-hover:opacity-40 transition-opacity flex-shrink-0">
                          <GripVertical className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-[#1a1a2e] truncate">
                                {inquiry.fullName}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {inquiry.companyName}
                              </p>
                            </div>
                            {(inquiry.engagementScore ?? 0) > 0 && (
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2"
                                style={{
                                  backgroundColor: stage.color + "15",
                                  color: stage.color,
                                }}
                              >
                                {inquiry.engagementScore}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <p className="text-[10px] text-gray-400 truncate flex-1">
                              {inquiry.email}
                            </p>
                            <p className="text-[10px] text-gray-400 flex-shrink-0">
                              {new Date(inquiry.createdAt).toLocaleDateString(
                                "en-IN",
                                { day: "2-digit", month: "short" }
                              )}
                            </p>
                          </div>

                          {inquiry.lastActivity && (
                            <div className="mt-2 flex items-center gap-1">
                              <Activity className="w-3 h-3 text-gray-300" />
                              <span className="text-[10px] text-gray-400 capitalize">
                                {inquiry.lastActivity.replace(/_/g, " ")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}

                {/* Drop indicator at end of non-empty list */}
                {isDropTarget && stageInquiries.length > 0 && (
                  <div
                    className="flex items-center justify-center py-3 text-xs font-medium rounded-lg border-2 border-dashed transition-all"
                    style={{ borderColor: stage.color + "50", color: stage.color }}
                  >
                    Drop here
                  </div>
                )}
              </div>
            </div>
          );
        })}
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
                <DetailRow label="Submitted" value={new Date(viewInquiry.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
              </div>

              {/* Engagement Score */}
              <div className="pt-3 border-t border-gray-100 flex items-center gap-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Engagement Score</p>
                  <span className="text-2xl font-bold text-[#f97316]">{viewInquiry.engagementScore || 0}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Pipeline Stage</p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide inline-block mt-1"
                    style={{
                      backgroundColor: (stages.find((s) => s.key === viewInquiry.pipelineStage)?.color || "#6b7280") + "20",
                      color: stages.find((s) => s.key === viewInquiry.pipelineStage)?.color || "#6b7280",
                    }}
                  >
                    {viewInquiry.pipelineStage || "new"}
                  </span>
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
                  <div className="text-center py-6 text-gray-400 text-sm">No activity tracked yet</div>
                ) : (
                  <div className="relative ml-3">
                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gray-200" />
                    <div className="space-y-0">
                      {[...activityLog].reverse().map((entry, idx) => {
                        const runningScore = activityLog
                          .slice(0, activityLog.length - idx)
                          .reduce((sum, e) => sum + (e.scoreAdded || 0), 0);
                        return (
                          <div key={idx} className="relative pl-6 py-2">
                            <div className={`absolute left-[-4px] top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              entry.scoreAdded >= 15 ? "bg-red-500" :
                              entry.scoreAdded >= 8 ? "bg-orange-500" :
                              entry.scoreAdded >= 5 ? "bg-yellow-500" : "bg-gray-400"
                            }`} />
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[#1a1a2e] capitalize">{eventLabel(entry.event)}</span>
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  entry.scoreAdded >= 15 ? "bg-red-100 text-red-700" :
                                  entry.scoreAdded >= 8 ? "bg-orange-100 text-orange-700" :
                                  entry.scoreAdded >= 5 ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-600"
                                }`}>+{entry.scoreAdded}</span>
                              </div>
                              <span className="text-[10px] font-semibold text-gray-400 tabular-nums">= {runningScore} pts</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-300" />
                              <span className="text-[10px] text-gray-400">
                                {new Date(entry.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                <select
                  value={viewInquiry.status}
                  onChange={(e) => handleUpdateStatus(viewInquiry._id, e.target.value)}
                  disabled={updatingStatus === viewInquiry._id}
                  className="text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 cursor-pointer"
                >
                  {stages.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                  <option value="contacted">Contacted</option>
                </select>
              </div>

              {/* Notes */}
              <div className="pt-3 border-t border-gray-100">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Notes</label>
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
      <p className="text-sm text-[#1a1a2e] font-medium mt-0.5">{value || "-"}</p>
    </div>
  );
}
