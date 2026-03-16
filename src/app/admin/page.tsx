"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessageSquareText,
  UserCheck,
  UserX,
  Phone,
  Users,
  ArrowRight,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Stats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
  hot: number;
  warm: number;
  cold: number;
}

interface Inquiry {
  _id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentInquiries, setRecentInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, inquiriesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/pm/inquiry/stats`),
        fetch(`${API_BASE_URL}/api/v1/pm/inquiry?page=1&limit=5`),
      ]);

      const statsData = await statsRes.json();
      const inquiriesData = await inquiriesRes.json();

      if (statsData.statusCode === 200) setStats(statsData.data);
      if (inquiriesData.statusCode === 200)
        setRecentInquiries(inquiriesData.data.inquiries);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
    fetchData();
  }, [router, fetchData]);

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  const statusColors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    contacted: "bg-yellow-100 text-yellow-700",
    converted: "bg-green-100 text-green-700",
    hot: "bg-red-100 text-red-700",
    warm: "bg-orange-100 text-orange-700",
    cold: "bg-cyan-100 text-cyan-700",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Dashboard</h1>

      {/* Stats Cards */}
      {stats && (
        <>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "bg-white border-gray-200", iconColor: "text-gray-500" },
            { label: "New", value: stats.new, icon: MessageSquareText, color: "bg-blue-50 border-blue-200", iconColor: "text-blue-500" },
            { label: "Contacted", value: stats.contacted, icon: Phone, color: "bg-yellow-50 border-yellow-200", iconColor: "text-yellow-500" },
            { label: "Converted", value: stats.converted, icon: UserCheck, color: "bg-green-50 border-green-200", iconColor: "text-green-500" },
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
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Hot", value: stats.hot, icon: UserX, color: "bg-red-50 border-red-200", iconColor: "text-red-500" },
            { label: "Warm", value: stats.warm, icon: UserCheck, color: "bg-orange-50 border-orange-200", iconColor: "text-orange-500" },
            { label: "Cold", value: stats.cold, icon: Users, color: "bg-cyan-50 border-cyan-200", iconColor: "text-cyan-500" },
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
            </div>
          ))}
        </div>
        </>
      )}

      {/* Recent Inquiries */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <h2 className="font-semibold text-[#1a1a2e]">Recent Inquiries</h2>
          <a
            href="/admin/inquiries"
            className="flex items-center gap-1 text-sm text-[#f97316] hover:underline font-medium"
          >
            View All
            <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {recentInquiries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No inquiries yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Company</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Email</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Location</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentInquiries.map((inq) => (
                  <tr
                    key={inq._id}
                    className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push("/admin/inquiries")}
                  >
                    <td className="px-5 py-3 font-medium text-[#1a1a2e]">
                      {inq.fullName}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{inq.companyName}</td>
                    <td className="px-5 py-3 text-gray-600">{inq.email}</td>
                    <td className="px-5 py-3 text-gray-600">
                      {[inq.city, inq.state].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[inq.status]}`}>
                        {inq.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {formatDate(inq.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
