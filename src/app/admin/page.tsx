"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessageSquareText,
  UserCheck,
  UserX,
  Phone,
  Users,
  TrendingUp,
  Flame,
  Snowflake,
  ArrowUpRight,
  RefreshCw,
  Activity,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";
import { useGetInquiryStatsQuery } from "@/store/endpoints/inquiries";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { API_BASE_URL } from "@/lib/api";

/* ── helpers ── */
function getLast30Days() {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function getLast7Labels() {
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    labels.push(d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }));
  }
  return labels;
}

/* ── stat card ── */
interface StatCardProps {
  label: string;
  value: number;
  total: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

function StatCard({ label, value, total, icon: Icon, color, bgColor, borderColor, textColor }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 hover:shadow-md transition-all`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <p className={`text-3xl font-bold ${textColor} leading-none mb-2`}>{value}</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
      </div>
    </div>
  );
}

/* ── custom tooltip ── */
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} className="text-sm font-semibold" style={{ color: p.color }}>
            {p.name}: {p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ── main ── */
export default function AdminDashboard() {
  const { canView, canViewWidget, loading: permLoading } = useAdminPermissions();
  const router = useRouter();
  const { data: stats, isLoading: loading, error, refetch } = useGetInquiryStatsQuery();

  const [recentInquiries, setRecentInquiries] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    fetch("/api/admin/verify")
      .then((res) => { if (!res.ok) router.push("/admin/login"); })
      .catch(() => router.push("/admin/login"));
  }, [router]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pm/inquiry?limit=200&includeConverted=true`)
      .then((r) => r.json())
      .then((d) => {
        const list = d.data?.inquiries || d.inquiries || [];
        setRecentInquiries(Array.isArray(list) ? list : []);
      })
      .catch(() => {})
      .finally(() => setLoadingRecent(false));
  }, []);

  if (loading || permLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (!permLoading && !canView("dashboard")) return <AccessDenied />;

  /* ── derive chart data from recentInquiries ── */

  // Daily signups — last 7 days
  const last7 = getLast7Labels();
  const last7Dates = getLast30Days().slice(-7);
  const dailyData = last7Dates.map((date, i) => ({
    day: last7[i],
    Inquiries: recentInquiries.filter((inq) =>
      inq.createdAt?.startsWith(date)
    ).length,
  }));

  // Monthly trend — last 6 months
  const monthlyData = (() => {
    const map: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      map[key] = 0;
    }
    recentInquiries.forEach((inq) => {
      const d = new Date(inq.createdAt);
      const key = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      if (key in map) map[key]++;
    });
    return Object.entries(map).map(([month, count]) => ({ month, Inquiries: count }));
  })();

  // Status distribution for Pie
  const pieData = stats
    ? [
        { name: "New",       value: stats.new,       color: "#3b82f6" },
        { name: "Contacted", value: stats.contacted,  color: "#eab308" },
        { name: "Hot",       value: stats.hot,        color: "#ef4444" },
        { name: "Warm",      value: stats.warm,       color: "#f97316" },
        { name: "Cold",      value: stats.cold,       color: "#6b7280" },
        { name: "Converted", value: stats.converted,  color: "#22c55e" },
      ].filter((d) => d.value > 0)
    : [];

  // Pipeline bar data
  const pipelineBar = stats
    ? [
        { stage: "New",       count: stats.new,       fill: "#3b82f6" },
        { stage: "Contacted", count: stats.contacted,  fill: "#eab308" },
        { stage: "Warm",      count: stats.warm,       fill: "#f97316" },
        { stage: "Hot",       count: stats.hot,        fill: "#ef4444" },
        { stage: "Cold",      count: stats.cold,       fill: "#6b7280" },
        { stage: "Converted", count: stats.converted,  fill: "#22c55e" },
      ]
    : [];

  // Conversion rate
  const convRate = stats && stats.total > 0
    ? ((stats.converted / stats.total) * 100).toFixed(1)
    : "0.0";

  // UTM source breakdown
  const utmData = (() => {
    const map: Record<string, number> = {};
    recentInquiries.forEach((inq) => {
      const src = inq.utm_source || "Direct";
      map[src] = (map[src] || 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([source, count]) => ({ source, count }));
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">BizCivitas Performance Marketing</p>
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 text-sm">
            Unable to load dashboard stats
          </div>
        </div>
      )}

      {stats && (
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

          {/* ── KPI Cards ── */}
          {canViewWidget("kpi_row1") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all col-span-2 md:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Inquiries</p>
                  <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-gray-900 leading-none">{stats.total}</p>
                <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                  <Activity className="w-3 h-3" /> All time
                </p>
              </div>

              <StatCard label="New"       value={stats.new}       total={stats.total} icon={MessageSquareText} color="bg-blue-500"   bgColor="bg-blue-50"   borderColor="border-blue-200"   textColor="text-blue-700" />
              <StatCard label="Hot Leads" value={stats.hot}       total={stats.total} icon={Flame}            color="bg-red-500"    bgColor="bg-red-50"    borderColor="border-red-200"    textColor="text-red-700" />
              <StatCard label="Converted" value={stats.converted} total={stats.total} icon={UserCheck}        color="bg-green-500"  bgColor="bg-green-50"  borderColor="border-green-200"  textColor="text-green-700" />
            </div>
          )}

          {/* ── Second row KPIs ── */}
          {canViewWidget("kpi_row2") && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Contacted" value={stats.contacted} total={stats.total} icon={Phone}     color="bg-yellow-500"  bgColor="bg-yellow-50"  borderColor="border-yellow-200"  textColor="text-yellow-700" />
              <StatCard label="Warm"      value={stats.warm}      total={stats.total} icon={TrendingUp} color="bg-orange-500"  bgColor="bg-orange-50"  borderColor="border-orange-200"  textColor="text-orange-700" />
              <StatCard label="Cold"      value={stats.cold}      total={stats.total} icon={Snowflake}  color="bg-cyan-500"    bgColor="bg-cyan-50"    borderColor="border-cyan-200"    textColor="text-cyan-700" />

              {/* Conversion Rate */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider">Conv. Rate</p>
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-4xl font-bold leading-none">{convRate}%</p>
                <p className="text-xs text-orange-100 mt-2">{stats.converted} of {stats.total} converted</p>
              </div>
            </div>
          )}

          {/* ── Charts row 1: Pipeline Bar + Pie ── */}
          {(canViewWidget("pipeline_chart") || canViewWidget("status_pie")) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Pipeline Distribution Bar */}
              {canViewWidget("pipeline_chart") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline Distribution</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={pipelineBar} barSize={32}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={30} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                        {pipelineBar.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Status Pie */}
              {canViewWidget("status_pie") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Breakdown</h3>
                  {pieData.length > 0 ? (
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={200}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {pieData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex-1 space-y-2">
                        {pieData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                              <span className="text-xs text-gray-600">{d.name}</span>
                            </div>
                            <span className="text-xs font-bold text-gray-900">{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">No data</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Charts row 2: 7-day + 6-month ── */}
          {(canViewWidget("daily_chart") || canViewWidget("monthly_chart")) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Daily — last 7 days */}
              {canViewWidget("daily_chart") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Last 7 Days</h3>
                  <p className="text-xs text-gray-400 mb-4">Daily inquiry volume</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={dailyData} barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(249,115,22,0.08)" }} />
                      <Bar dataKey="Inquiries" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Monthly trend — 6 months */}
              {canViewWidget("monthly_chart") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">6-Month Trend</h3>
                  <p className="text-xs text-gray-400 mb-4">Monthly inquiry growth</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} width={24} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="Inquiries"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: "#f97316", strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#f97316" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── Traffic Sources + Recent Inquiries ── */}
          {(canViewWidget("traffic_sources") || canViewWidget("recent_inquiries")) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* UTM Source breakdown */}
              {canViewWidget("traffic_sources") && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Traffic Sources</h3>
                  {loadingRecent ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                    </div>
                  ) : utmData.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">No UTM data</p>
                  ) : (
                    <div className="space-y-3">
                      {utmData.map(({ source, count }) => {
                        const pct = recentInquiries.length > 0 ? Math.round((count / recentInquiries.length) * 100) : 0;
                        return (
                          <div key={source}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-700 capitalize font-medium">{source}</span>
                              <span className="text-xs text-gray-500">{count} ({pct}%)</span>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Inquiries */}
              {canViewWidget("recent_inquiries") && (
                <div className={`bg-white border border-gray-200 rounded-xl p-5 ${canViewWidget("traffic_sources") ? "md:col-span-2" : "md:col-span-3"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Recent Inquiries</h3>
                    <a href="/admin/inquiries" className="text-xs text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                      View all <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                  {loadingRecent ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {recentInquiries.slice(0, 6).map((inq) => {
                        const STATUS_COLOR: Record<string, string> = {
                          new: "bg-blue-100 text-blue-700",
                          contacted: "bg-yellow-100 text-yellow-700",
                          hot: "bg-red-100 text-red-700",
                          warm: "bg-orange-100 text-orange-700",
                          cold: "bg-gray-100 text-gray-500",
                          converted: "bg-green-100 text-green-700",
                        };
                        return (
                          <div key={inq._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {inq.fullName?.slice(0, 2).toUpperCase() || "??"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{inq.fullName}</p>
                              <p className="text-xs text-gray-400 truncate">{inq.email}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLOR[inq.status] || "bg-gray-100 text-gray-500"}`}>
                                {inq.status || "new"}
                              </span>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {new Date(inq.createdAt).toLocaleDateString("en-IN")}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
