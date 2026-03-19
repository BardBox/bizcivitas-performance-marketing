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
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Stats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
  hot: number;
  warm: number;
  cold: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const statsRes = await fetch(`${API_BASE_URL}/pm/inquiry/stats`);
      const statsData = await statsRes.json();
      if (statsData.statusCode === 200) setStats(statsData.data);
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
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <p className="text-3xl font-bold text-[#1a1a2e] mt-2">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
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
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</p>
                  <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <p className="text-3xl font-bold text-[#1a1a2e] mt-2">{s.value}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
