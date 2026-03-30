"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  MessageSquareText,
  UserCheck,
  UserX,
  Phone,
  Users,
} from "lucide-react";
import { useGetInquiryStatsQuery } from "@/store/endpoints/inquiries";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";

export default function AdminDashboard() {
  const { canView, loading: permLoading } = useAdminPermissions();
  const router = useRouter();
  const { data: stats, isLoading: loading, error } = useGetInquiryStatsQuery();

  useEffect(() => {
    fetch("/api/admin/verify")
      .then((res) => {
        if (!res.ok) router.push("/admin/login");
      })
      .catch((err) => {
        console.error("Verify endpoint error:", err);
        router.push("/admin/login");
      });
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (!permLoading && !canView("dashboard")) return <AccessDenied />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-[#1a1a2e] mb-6">Dashboard</h1>

      {error && (
        <div className="mb-4 rounded-lg border border-red-400 bg-red-50 p-4 text-red-800">
          <p className="font-semibold">Unable to load dashboard stats</p>
          <p className="text-sm mt-1">Failed to fetch dashboard data</p>
        </div>
      )}

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
