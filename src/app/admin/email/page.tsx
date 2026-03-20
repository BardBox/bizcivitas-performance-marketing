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
  TrendingUp,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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

const EVENT_ICONS: Record<string, { icon: typeof Mail; color: string }> = {
  sent: { icon: Mail, color: "text-blue-500" },
  open: { icon: Eye, color: "text-green-500" },
  click: { icon: MousePointerClick, color: "text-purple-500" },
  unsubscribe: { icon: UserX, color: "text-red-500" },
  bounce: { icon: AlertTriangle, color: "text-yellow-500" },
};

export default function EmailEngagementPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
    fetchData();
  }, [router, fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Email Engagement</h1>
          <p className="text-sm text-gray-500 mt-1">MailerLite email tracking & reports</p>
        </div>
        <div className="flex items-center gap-3">
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
            onClick={fetchData}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Emails Sent", value: stats.sent, icon: Mail, color: "bg-blue-50 border-blue-200", iconColor: "text-blue-500" },
            { label: "Opens", value: stats.opens, icon: Eye, color: "bg-green-50 border-green-200", iconColor: "text-green-500", sub: `${stats.openRate}% rate` },
            { label: "Clicks", value: stats.clicks, icon: MousePointerClick, color: "bg-purple-50 border-purple-200", iconColor: "text-purple-500", sub: `${stats.clickRate}% rate` },
            { label: "Unsubscribes", value: stats.unsubscribes, icon: UserX, color: "bg-red-50 border-red-200", iconColor: "text-red-500" },
          ].map((s) => (
            <div
              key={s.label}
              className={`${s.color} border rounded-xl px-4 py-4 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <p className="text-3xl font-bold text-[#1a1a2e] mt-2">{s.value}</p>
              {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Engaged Leads */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-[#f97316]" />
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Top Engaged Leads</h2>
          </div>
          {topLeads.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No engagement data yet</p>
          ) : (
            <div className="space-y-2">
              {topLeads.map((lead, i) => (
                <div
                  key={lead._id}
                  className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-5">#{i + 1}</span>
                    <div>
                      <p className="text-sm font-medium text-[#1a1a2e] truncate max-w-[200px]">{lead._id}</p>
                      <p className="text-xs text-gray-400">
                        Last: {new Date(lead.lastEngagement).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-green-600">
                      <Eye className="w-3 h-3" /> {lead.opens}
                    </span>
                    <span className="flex items-center gap-1 text-purple-600">
                      <MousePointerClick className="w-3 h-3" /> {lead.clicks}
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
            <h2 className="text-lg font-semibold text-[#1a1a2e]">Recent Events</h2>
          </div>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No events recorded yet</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {recentEvents.map((event) => {
                const config = EVENT_ICONS[event.eventType] || { icon: Mail, color: "text-gray-400" };
                const Icon = config.icon;
                return (
                  <div
                    key={event._id}
                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${config.color}`} />
                      <div>
                        <p className="text-sm font-medium text-[#1a1a2e] truncate max-w-[180px]">
                          {event.inquiryId?.fullName || event.email}
                        </p>
                        <p className="text-xs text-gray-400">
                          {event.eventType} {event.campaignName ? `- ${event.campaignName}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">
                        {new Date(event.eventTimestamp).toLocaleDateString("en-IN")}
                      </p>
                      <p className="text-[10px] text-gray-300">
                        {new Date(event.eventTimestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
