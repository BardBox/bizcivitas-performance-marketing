"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Mail,
  MousePointerClick,
  Eye,
  UserX,
  AlertTriangle,
  RefreshCw,
  Download,
  TrendingUp,
  Zap,
  UserPlus,
  ArrowRightLeft,
  Plus,
  Trash2,
  Check,
  Clock,
  X,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

// ── Types ──

interface Stats {
  sent: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
  openRate: string;
  clickRate: string;
}

interface TopLead {
  _id: string;
  opens: number;
  clicks: number;
  totalEngagements: number;
  lastEngagement: string;
}

interface RecentEvent {
  _id: string;
  email: string;
  eventType: string;
  campaignName: string | null;
  eventTimestamp: string;
  inquiryId?: {
    fullName: string;
    companyName: string;
    status: string;
    pipelineStage: string;
  };
}

interface PipelineStage {
  _id?: string;
  key: string;
  label: string;
  color: string;
  order: number;
}

interface Template {
  _id: string;
  name: string;
  subject: string;
  category: string;
}

interface Automation {
  _id: string;
  type: string;
  groupName: string;
  isBuiltIn: boolean;
  pipelineStage: string;
  templateId: Template | null;
  isActive: boolean;
  delay: number;
}

interface AutomationGroup {
  type: string;
  groupName: string;
  isBuiltIn: boolean;
}

// ── Constants ──

const EVENT_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  sent: { icon: Mail, color: "text-blue-500" },
  open: { icon: Eye, color: "text-green-500" },
  click: { icon: MousePointerClick, color: "text-purple-500" },
  unsubscribe: { icon: UserX, color: "text-red-500" },
  bounce: { icon: AlertTriangle, color: "text-yellow-500" },
};

const BUILT_IN_ICONS: Record<string, typeof Mail> = {
  welcome: UserPlus,
  follow_up: ArrowRightLeft,
};

const BUILT_IN_DESCRIPTIONS: Record<string, string> = {
  welcome: "Automatically sent when a new inquiry is submitted",
  follow_up: "Automatically sent when an inquiry moves to a different pipeline stage",
};

// ── Component ──

export default function EmailPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<"automations" | "reports">("automations");
  const [activeGroup, setActiveGroup] = useState("welcome");

  // Reports state
  const [loadingReports, setLoadingReports] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [days, setDays] = useState(30);

  // Automations state
  const [loadingAuto, setLoadingAuto] = useState(true);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<AutomationGroup[]>([]);
  const [savingStage, setSavingStage] = useState<string | null>(null);

  // Create group modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);

  // ── Fetch functions ──

  const fetchReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/mailerlite/reports?days=${days}`);
      const data = await res.json();
      if (data.statusCode === 200) {
        setStats(data.data.stats);
        setTopLeads(data.data.topLeads || []);
        setRecentEvents(data.data.recentEvents || []);
      }
    } catch (err) {
      console.error("Failed to fetch email reports:", err);
    } finally {
      setLoadingReports(false);
    }
  }, [days]);

  const fetchAutomations = useCallback(async () => {
    setLoadingAuto(true);
    try {
      const [autoRes, groupsRes, stagesRes, templatesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/pm/email-automations`),
        fetch(`${API_BASE_URL}/pm/email-automations/groups`),
        fetch(`${API_BASE_URL}/pm/email-automations/pipeline-stages`),
        fetch(`${API_BASE_URL}/pm/email-templates`),
      ]);

      const [autoData, groupsData, stagesData, templatesData] = await Promise.all([
        autoRes.json(),
        groupsRes.json(),
        stagesRes.json(),
        templatesRes.json(),
      ]);

      if (autoData.statusCode === 200) setAutomations(autoData.data || []);
      if (groupsData.statusCode === 200) setGroups(groupsData.data || []);
      if (stagesData.statusCode === 200) {
        const sorted = [...(stagesData.data || [])].sort(
          (a: PipelineStage, b: PipelineStage) => a.order - b.order
        );
        setPipelineStages(sorted);
      }
      if (templatesData.statusCode === 200) setTemplates(templatesData.data || []);
    } catch (err) {
      console.error("Failed to fetch automations:", err);
    } finally {
      setLoadingAuto(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
    fetchAutomations();
  }, [router, fetchAutomations]);

  useEffect(() => {
    if (mainTab === "reports" && !stats) fetchReports();
  }, [mainTab, stats, fetchReports]);

  // ── Handlers ──

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch(`${API_BASE_URL}/pm/mailerlite/sync`, { method: "POST" });
      await fetchReports();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  };

  const getAutomation = (type: string, stageKey: string) => {
    return automations.find((a) => a.type === type && a.pipelineStage === stageKey);
  };

  const handleSaveAutomation = async (
    type: string,
    stageKey: string,
    templateId: string | null,
    isActive: boolean,
    delay: number
  ) => {
    const group = groups.find((g) => g.type === type);
    setSavingStage(`${type}_${stageKey}`);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-automations`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          pipelineStage: stageKey,
          templateId: templateId || null,
          isActive,
          delay,
          groupName: group?.groupName || type,
        }),
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        await fetchAutomations();
      }
    } catch (err) {
      console.error("Save automation failed:", err);
    } finally {
      setSavingStage(null);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreatingGroup(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-automations/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupName: newGroupName.trim() }),
      });
      const data = await res.json();
      if (data.statusCode === 201) {
        setShowCreateModal(false);
        setNewGroupName("");
        await fetchAutomations();
        // Switch to the new tab
        setActiveGroup(data.data.type);
      } else {
        alert(data.message || "Failed to create group");
      }
    } catch (err) {
      console.error("Create group failed:", err);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (type: string) => {
    const group = groups.find((g) => g.type === type);
    if (!confirm(`Delete automation group "${group?.groupName}"? All its rules will be removed.`))
      return;

    setDeletingGroup(type);
    try {
      const res = await fetch(
        `${API_BASE_URL}/pm/email-automations/groups/${encodeURIComponent(type)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (data.statusCode === 200) {
        // Switch to welcome tab if we deleted the active tab
        if (activeGroup === type) setActiveGroup("welcome");
        await fetchAutomations();
      }
    } catch (err) {
      console.error("Delete group failed:", err);
    } finally {
      setDeletingGroup(null);
    }
  };

  const currentGroup = groups.find((g) => g.type === activeGroup);

  // ── Render ──

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Email</h1>
          <p className="text-sm text-gray-500 mt-1">
            Automations, templates & engagement reports
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: "automations", label: "Automations", icon: Zap },
          { key: "reports", label: "Reports", icon: TrendingUp },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key as "automations" | "reports")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              mainTab === tab.key
                ? "bg-white text-[#1a1a2e] shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════ AUTOMATIONS TAB ═══════════ */}
      {mainTab === "automations" && (
        <>
          {/* Automation Group Tabs */}
          <div className="flex items-center gap-1 mb-5 border-b border-gray-200 overflow-x-auto">
            {groups.map((group) => {
              const Icon = BUILT_IN_ICONS[group.type] || Zap;
              return (
                <div key={group.type} className="relative flex items-center group/tab">
                  <button
                    onClick={() => setActiveGroup(group.type)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                      activeGroup === group.type
                        ? "border-[#f97316] text-[#f97316]"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {group.groupName}
                  </button>
                  {/* Delete button for custom groups */}
                  {!group.isBuiltIn && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.type);
                      }}
                      disabled={deletingGroup === group.type}
                      className="absolute -top-1 -right-1 p-0.5 rounded-full bg-red-100 text-red-500 hover:bg-red-200 opacity-0 group-hover/tab:opacity-100 transition-opacity cursor-pointer"
                      title="Delete automation"
                    >
                      {deletingGroup === group.type ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}

            {/* + Button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-3 text-sm font-medium text-gray-400 hover:text-[#f97316] border-b-2 border-transparent transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>

          {/* Group Description */}
          {currentGroup && (
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                {BUILT_IN_DESCRIPTIONS[currentGroup.type] ||
                  `Custom automation: ${currentGroup.groupName}`}
              </p>
              {!currentGroup.isBuiltIn && (
                <button
                  onClick={() => handleDeleteGroup(currentGroup.type)}
                  disabled={deletingGroup === currentGroup.type}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Group
                </button>
              )}
            </div>
          )}

          {loadingAuto ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
            </div>
          ) : (
            <div className="space-y-3">
              {pipelineStages.map((stage) => {
                const auto = getAutomation(activeGroup, stage.key);
                return (
                  <AutomationRow
                    key={`${activeGroup}_${stage.key}`}
                    stage={stage}
                    automation={auto || null}
                    templates={templates}
                    type={activeGroup}
                    saving={savingStage === `${activeGroup}_${stage.key}`}
                    onSave={handleSaveAutomation}
                  />
                );
              })}

              {pipelineStages.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  No pipeline stages configured. Go to Pipeline settings to add stages.
                </div>
              )}
            </div>
          )}

          {/* Placeholder hint */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-700 mb-1">
              Template Placeholders
            </p>
            <p className="text-xs text-blue-600">
              Use these in your email templates and they will be replaced with
              inquiry data:{" "}
              <code className="bg-blue-100 px-1 rounded">{"{{name}}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{{email}}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{{company}}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{{phone}}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{{city}}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{{state}}"}</code>
            </p>
          </div>
        </>
      )}

      {/* ═══════════ REPORTS TAB ═══════════ */}
      {mainTab === "reports" && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-70"
            >
              {syncing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {syncing ? "Syncing..." : "Sync MailerLite"}
            </button>
            <button
              onClick={fetchReports}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
            </div>
          ) : (
            <>
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {[
                    {
                      label: "Emails Sent",
                      value: stats.sent,
                      icon: Mail,
                      color: "bg-blue-50 border-blue-200",
                      iconColor: "text-blue-500",
                    },
                    {
                      label: "Opens",
                      value: stats.opens,
                      icon: Eye,
                      color: "bg-green-50 border-green-200",
                      iconColor: "text-green-500",
                      sub: `${stats.openRate}% rate`,
                    },
                    {
                      label: "Clicks",
                      value: stats.clicks,
                      icon: MousePointerClick,
                      color: "bg-purple-50 border-purple-200",
                      iconColor: "text-purple-500",
                      sub: `${stats.clickRate}% rate`,
                    },
                    {
                      label: "Unsubscribes",
                      value: stats.unsubscribes,
                      icon: UserX,
                      color: "bg-red-50 border-red-200",
                      iconColor: "text-red-500",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`${s.color} border rounded-xl px-4 py-4 hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">
                          {s.label}
                        </p>
                        <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                      </div>
                      <p className="text-3xl font-bold text-[#1a1a2e] mt-2">
                        {s.value}
                      </p>
                      {s.sub && (
                        <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Engaged Leads */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-[#f97316]" />
                    <h2 className="text-lg font-semibold text-[#1a1a2e]">
                      Top Engaged Leads
                    </h2>
                  </div>
                  {topLeads.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No engagement data yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {topLeads.map((lead, i) => (
                        <div
                          key={lead._id}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-400 w-5">
                              #{i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-[#1a1a2e] truncate max-w-[200px]">
                                {lead._id}
                              </p>
                              <p className="text-xs text-gray-400">
                                Last:{" "}
                                {new Date(
                                  lead.lastEngagement
                                ).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="flex items-center gap-1 text-green-600">
                              <Eye className="w-3 h-3" /> {lead.opens}
                            </span>
                            <span className="flex items-center gap-1 text-purple-600">
                              <MousePointerClick className="w-3 h-3" />{" "}
                              {lead.clicks}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Events */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-4 h-4 text-[#f97316]" />
                    <h2 className="text-lg font-semibold text-[#1a1a2e]">
                      Recent Events
                    </h2>
                  </div>
                  {recentEvents.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">
                      No events recorded yet
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {recentEvents.map((event) => {
                        const config = EVENT_ICONS[event.eventType] || {
                          icon: Mail,
                          color: "text-gray-400",
                        };
                        const Icon = config.icon;
                        return (
                          <div
                            key={event._id}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Icon
                                className={`w-4 h-4 ${config.color}`}
                              />
                              <div>
                                <p className="text-sm font-medium text-[#1a1a2e] truncate max-w-[180px]">
                                  {event.inquiryId?.fullName || event.email}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {event.eventType}{" "}
                                  {event.campaignName
                                    ? `- ${event.campaignName}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">
                                {new Date(
                                  event.eventTimestamp
                                ).toLocaleDateString("en-IN")}
                              </p>
                              <p className="text-[10px] text-gray-300">
                                {new Date(
                                  event.eventTimestamp
                                ).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ═══════════ CREATE GROUP MODAL ═══════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">
                New Automation
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName("");
                }}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Automation Name
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateGroup()}
                  placeholder="e.g. Re-engagement, Onboarding, Promo Blast"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                  autoFocus
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                  This will create a new automation tab with all pipeline stages.
                  You can then assign templates to each stage.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewGroupName("");
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !newGroupName.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-70"
              >
                {creatingGroup && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Create Automation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Automation Row Component ──

function AutomationRow({
  stage,
  automation,
  templates,
  type,
  saving,
  onSave,
}: {
  stage: PipelineStage;
  automation: Automation | null;
  templates: Template[];
  type: string;
  saving: boolean;
  onSave: (
    type: string,
    stageKey: string,
    templateId: string | null,
    isActive: boolean,
    delay: number
  ) => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = useState(
    automation?.templateId?._id || ""
  );
  const [isActive, setIsActive] = useState(automation?.isActive || false);
  const [delay, setDelay] = useState(automation?.delay || 0);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setSelectedTemplate(automation?.templateId?._id || "");
    setIsActive(automation?.isActive || false);
    setDelay(automation?.delay || 0);
    setDirty(false);
  }, [automation]);

  const handleChange = (
    field: "template" | "active" | "delay",
    value: string | boolean | number
  ) => {
    if (field === "template") setSelectedTemplate(value as string);
    if (field === "active") setIsActive(value as boolean);
    if (field === "delay") setDelay(value as number);
    setDirty(true);
  };

  const handleSave = () => {
    onSave(type, stage.key, selectedTemplate || null, isActive, delay);
    setDirty(false);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Stage badge */}
        <div className="flex items-center gap-2 min-w-[120px]">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: stage.color }}
          />
          <span className="text-sm font-semibold text-[#1a1a2e]">
            {stage.label}
          </span>
        </div>

        {/* Template selector */}
        <div className="flex-1 min-w-[200px]">
          <select
            value={selectedTemplate}
            onChange={(e) => handleChange("template", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
          >
            <option value="">No template assigned</option>
            {templates.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name} ({t.category})
              </option>
            ))}
          </select>
        </div>

        {/* Delay */}
        <div className="flex items-center gap-1.5 min-w-[120px]">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <input
            type="number"
            min={0}
            value={delay}
            onChange={(e) =>
              handleChange("delay", parseInt(e.target.value) || 0)
            }
            className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
          />
          <span className="text-xs text-gray-400">min</span>
        </div>

        {/* Active toggle */}
        <button
          onClick={() => handleChange("active", !isActive)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
            isActive
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {isActive ? "Active" : "Inactive"}
        </button>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            dirty
              ? "bg-[#f97316] hover:bg-[#ea580c] text-white"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Save
        </button>
      </div>

      {automation?.templateId && (
        <p className="text-[11px] text-gray-400 mt-2 pl-[136px]">
          Current:{" "}
          <span className="font-medium text-gray-500">
            {automation.templateId.name}
          </span>{" "}
          &middot; Subject: {automation.templateId.subject}
        </p>
      )}
    </div>
  );
}
