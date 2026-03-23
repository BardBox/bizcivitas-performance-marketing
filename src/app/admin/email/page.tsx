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
  Search,
  Filter,
  ArrowUpDown,
  BarChart3,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

// ── Marketing Labels (synced with Contacts/Kanban) ──
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
  return MARKETING_LABELS[stageKey] || { term: stageKey, description: "In pipeline" };
};

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

  // Report filters
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [eventSearch, setEventSearch] = useState("");
  const [eventSort, setEventSort] = useState<"newest" | "oldest">("newest");
  const [activeStatCard, setActiveStatCard] = useState<string | null>(null);
  const [templateFilter, setTemplateFilter] = useState<string>("all");
  const [pipelineFilter, setPipelineFilter] = useState<string>("all");

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
    if (mainTab === "reports") fetchReports();
  }, [mainTab, days, fetchReports]);

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
      {mainTab === "reports" && (() => {
        // Filter + sort recent events
        const filteredEvents = recentEvents
          .filter((event) => {
            if (activeStatCard && activeStatCard !== "all") {
              const typeMap: Record<string, string[]> = {
                sent: ["sent"],
                opens: ["open"],
                clicks: ["click"],
                unsubscribes: ["unsubscribe"],
              };
              if (typeMap[activeStatCard] && !typeMap[activeStatCard].includes(event.eventType)) return false;
            }
            if (eventFilter !== "all" && event.eventType !== eventFilter) return false;
            if (templateFilter !== "all") {
              if ((event.campaignName || "") !== templateFilter) return false;
            }
            if (pipelineFilter !== "all") {
              if ((event.inquiryId?.pipelineStage || "unknown") !== pipelineFilter) return false;
            }
            if (eventSearch.trim()) {
              const q = eventSearch.toLowerCase();
              const name = event.inquiryId?.fullName?.toLowerCase() || "";
              const email = event.email?.toLowerCase() || "";
              const campaign = event.campaignName?.toLowerCase() || "";
              if (!name.includes(q) && !email.includes(q) && !campaign.includes(q)) return false;
            }
            return true;
          })
          .sort((a, b) => {
            const da = new Date(a.eventTimestamp).getTime();
            const db = new Date(b.eventTimestamp).getTime();
            return eventSort === "newest" ? db - da : da - db;
          });

        const statCards = [
          {
            key: "sent",
            label: "Emails Sent",
            value: stats?.sent || 0,
            icon: Mail,
            color: "border-blue-200",
            activeColor: "bg-blue-500 border-blue-500",
            iconColor: "text-blue-500",
            activeIconColor: "text-white",
            bgColor: "bg-blue-50",
            activeBgColor: "bg-blue-500",
          },
          {
            key: "opens",
            label: "Opens",
            value: stats?.opens || 0,
            icon: Eye,
            color: "border-green-200",
            activeColor: "bg-green-500 border-green-500",
            iconColor: "text-green-500",
            activeIconColor: "text-white",
            bgColor: "bg-green-50",
            activeBgColor: "bg-green-500",
            sub: stats ? `${stats.openRate}% rate` : undefined,
          },
          {
            key: "clicks",
            label: "Clicks",
            value: stats?.clicks || 0,
            icon: MousePointerClick,
            color: "border-purple-200",
            activeColor: "bg-purple-500 border-purple-500",
            iconColor: "text-purple-500",
            activeIconColor: "text-white",
            bgColor: "bg-purple-50",
            activeBgColor: "bg-purple-500",
            sub: stats ? `${stats.clickRate}% rate` : undefined,
          },
          {
            key: "unsubscribes",
            label: "Unsubscribes",
            value: stats?.unsubscribes || 0,
            icon: UserX,
            color: "border-red-200",
            activeColor: "bg-red-500 border-red-500",
            iconColor: "text-red-500",
            activeIconColor: "text-white",
            bgColor: "bg-red-50",
            activeBgColor: "bg-red-500",
          },
        ];

        // Extract unique template/campaign names and pipeline stages from events
        const uniqueTemplates = [...new Set(recentEvents.map((e) => e.campaignName).filter(Boolean))] as string[];
        const uniquePipelines = [...new Set(recentEvents.map((e) => e.inquiryId?.pipelineStage).filter(Boolean))] as string[];

        const hasActiveFilters = activeStatCard || eventFilter !== "all" || eventSearch || templateFilter !== "all" || pipelineFilter !== "all";

        return (
        <>
          {/* Controls Bar */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-2">
              {/* Date Range Pills */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                {[
                  { value: 7, label: "7d" },
                  { value: 14, label: "14d" },
                  { value: 30, label: "30d" },
                  { value: 90, label: "90d" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDays(opt.value)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      days === opt.value
                        ? "bg-white text-[#1a1a2e] shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-xs font-medium transition-colors cursor-pointer disabled:opacity-70"
              >
                {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                {syncing ? "Syncing..." : "Sync MailerLite"}
              </button>
              <button
                onClick={() => { fetchReports(); }}
                disabled={loadingReports}
                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingReports ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
            </div>
          ) : (
            <>
              {/* Stat Cards — clickable to filter */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  {statCards.map((s) => {
                    const isActive = activeStatCard === s.key;
                    const Icon = s.icon;
                    return (
                      <button
                        key={s.key}
                        onClick={() => {
                          setActiveStatCard(isActive ? null : s.key);
                          setEventFilter("all");
                        }}
                        className={`relative border rounded-xl px-4 py-4 text-left transition-all cursor-pointer ${
                          isActive
                            ? `${s.activeBgColor} ${s.activeColor} shadow-lg scale-[1.02]`
                            : `${s.bgColor} ${s.color} hover:shadow-md`
                        }`}
                      >
                        {isActive && (
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                        <div className="flex items-center justify-between">
                          <p className={`text-xs uppercase tracking-wide ${
                            isActive ? "text-white/80" : "text-gray-500"
                          }`}>
                            {s.label}
                          </p>
                          <Icon className={`w-4 h-4 ${isActive ? s.activeIconColor : s.iconColor}`} />
                        </div>
                        <p className={`text-3xl font-bold mt-2 ${
                          isActive ? "text-white" : "text-[#1a1a2e]"
                        }`}>
                          {s.value}
                        </p>
                        {s.sub && (
                          <p className={`text-xs mt-1 ${isActive ? "text-white/70" : "text-gray-400"}`}>
                            {s.sub}
                          </p>
                        )}
                        {isActive && (
                          <p className="text-[10px] text-white/60 mt-1">Click to clear filter</p>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Top Engaged Leads — narrower */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#f97316]" />
                      <h2 className="text-sm font-semibold text-[#1a1a2e]">Top Engaged Leads</h2>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {topLeads.length} leads
                    </span>
                  </div>
                  {topLeads.length === 0 ? (
                    <div className="text-center py-10">
                      <BarChart3 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No engagement data yet</p>
                      <p className="text-xs text-gray-300 mt-0.5">Send campaigns to see results</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {topLeads.map((lead, i) => (
                        <div
                          key={lead._id}
                          className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              i === 0 ? "bg-amber-100 text-amber-700" :
                              i === 1 ? "bg-gray-100 text-gray-600" :
                              i === 2 ? "bg-orange-100 text-orange-700" :
                              "bg-gray-50 text-gray-400"
                            }`}>
                              {i + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-[#1a1a2e] truncate max-w-[160px]">
                                {lead._id}
                              </p>
                              <p className="text-[10px] text-gray-400">
                                Last: {new Date(lead.lastEngagement).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="flex items-center gap-1 text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                              <Eye className="w-3 h-3" /> {lead.opens}
                            </span>
                            <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded-full">
                              <MousePointerClick className="w-3 h-3" /> {lead.clicks}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Events — wider with filters */}
                <div className="lg:col-span-3 bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-[#f97316]" />
                      <h2 className="text-sm font-semibold text-[#1a1a2e]">Recent Events</h2>
                    </div>
                    <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      {filteredEvents.length} events
                    </span>
                  </div>

                  {/* Event Filters Row 1: Search + Sort */}
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="relative flex-1 min-w-[180px]">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder="Search name, email, campaign..."
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                      />
                    </div>

                    {/* Template Filter */}
                    <select
                      value={templateFilter}
                      onChange={(e) => setTemplateFilter(e.target.value)}
                      className={`px-2 py-1.5 border rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] ${
                        templateFilter !== "all"
                          ? "border-[#f97316] bg-orange-50 text-[#f97316] font-medium"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      <option value="all">All Templates</option>
                      {uniqueTemplates.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>

                    {/* Pipeline Filter */}
                    <select
                      value={pipelineFilter}
                      onChange={(e) => setPipelineFilter(e.target.value)}
                      className={`px-2 py-1.5 border rounded-lg text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316] ${
                        pipelineFilter !== "all"
                          ? "border-[#f97316] bg-orange-50 text-[#f97316] font-medium"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      <option value="all">All Stages</option>
                      {pipelineStages.map((stage) => {
                        const ml = getMarketingLabel(stage.key);
                        return (
                          <option key={stage.key} value={stage.key}>
                            {ml.term} ({stage.label})
                          </option>
                        );
                      })}
                    </select>

                    {/* Sort */}
                    <button
                      onClick={() => setEventSort(eventSort === "newest" ? "oldest" : "newest")}
                      className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-medium text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 cursor-pointer transition-colors"
                      title={`Sort by ${eventSort === "newest" ? "oldest" : "newest"} first`}
                    >
                      <ArrowUpDown className="w-3 h-3" />
                      {eventSort === "newest" ? "Newest" : "Oldest"}
                    </button>
                  </div>

                  {/* Event Filters Row 2: Type chips */}
                  <div className="flex items-center gap-1 mb-3">
                    {[
                      { key: "all", label: "All", color: "text-gray-600 bg-gray-100" },
                      { key: "sent", label: "Sent", color: "text-blue-600 bg-blue-50" },
                      { key: "open", label: "Opens", color: "text-green-600 bg-green-50" },
                      { key: "click", label: "Clicks", color: "text-purple-600 bg-purple-50" },
                      { key: "unsubscribe", label: "Unsub", color: "text-red-600 bg-red-50" },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => { setEventFilter(f.key); setActiveStatCard(null); }}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all cursor-pointer ${
                          eventFilter === f.key && !activeStatCard
                            ? `${f.color} ring-1 ring-current`
                            : "text-gray-400 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Active filter indicator */}
                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 mb-3 text-[10px] flex-wrap">
                      <Filter className="w-3 h-3 text-[#f97316]" />
                      <span className="text-gray-500">
                        Showing {filteredEvents.length} of {recentEvents.length} events
                        {activeStatCard && <span className="font-medium text-[#f97316]"> — {activeStatCard}</span>}
                        {templateFilter !== "all" && <span className="font-medium text-[#f97316]"> — template: {templateFilter}</span>}
                        {pipelineFilter !== "all" && (
                          <span className="font-medium text-[#f97316]"> — stage: {getMarketingLabel(pipelineFilter).term}</span>
                        )}
                      </span>
                      <button
                        onClick={() => { setActiveStatCard(null); setEventFilter("all"); setEventSearch(""); setTemplateFilter("all"); setPipelineFilter("all"); }}
                        className="text-[#f97316] hover:underline cursor-pointer font-medium"
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {/* Events List */}
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-10">
                      <Mail className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        {eventSearch || eventFilter !== "all" || activeStatCard
                          ? "No events match your filters"
                          : "No events recorded yet"}
                      </p>
                      {(eventSearch || eventFilter !== "all" || activeStatCard) && (
                        <button
                          onClick={() => { setActiveStatCard(null); setEventFilter("all"); setEventSearch(""); }}
                          className="text-xs text-[#f97316] hover:underline mt-1 cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[420px] overflow-y-auto">
                      {filteredEvents.map((event) => {
                        const config = EVENT_ICONS[event.eventType] || {
                          icon: Mail,
                          color: "text-gray-400",
                        };
                        const Icon = config.icon;
                        const typeBg = event.eventType === "sent" ? "bg-blue-50" :
                          event.eventType === "open" ? "bg-green-50" :
                          event.eventType === "click" ? "bg-purple-50" :
                          event.eventType === "unsubscribe" ? "bg-red-50" : "bg-gray-50";
                        return (
                          <div
                            key={event._id}
                            className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full ${typeBg} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-[#1a1a2e] truncate max-w-[200px]">
                                  {event.inquiryId?.fullName || event.email}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${typeBg} ${config.color}`}>
                                    {event.eventType}
                                  </span>
                                  {event.inquiryId?.pipelineStage && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
                                      {getMarketingLabel(event.inquiryId.pipelineStage).term}
                                    </span>
                                  )}
                                  {event.campaignName && (
                                    <span className="text-[10px] text-gray-400 truncate max-w-[140px]">
                                      {event.campaignName}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-xs text-gray-500">
                                {new Date(event.eventTimestamp).toLocaleDateString("en-IN")}
                              </p>
                              <p className="text-[10px] text-gray-300">
                                {new Date(event.eventTimestamp).toLocaleTimeString("en-IN", {
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
        );
      })()}

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
          <div>
            <span className="text-sm font-semibold text-[#1a1a2e]">
              {stage.label}
            </span>
            <span className="block text-[10px] text-gray-400">
              {getMarketingLabel(stage.key).term}
            </span>
          </div>
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
