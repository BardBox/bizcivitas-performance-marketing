"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  Eye,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  User,
  Key,
  IndianRupee,
  CreditCard,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

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
  notes?: string;
  paymentAmount?: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMember, setViewMember] = useState<Inquiry | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        status: "converted",
      });

      const res = await fetch(
        `${API_BASE_URL}/api/v1/pm/inquiry?${params.toString()}`
      );
      const data = await res.json();

      if (data.statusCode === 200) {
        setMembers(data.data.inquiries);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = searchQuery
    ? members.filter(
        (m) =>
          m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.phone.includes(searchQuery)
      )
    : members;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Extract user info from notes (e.g. "User ID: xxx. Temp password: yyy")
  const extractCredentials = (notes?: string) => {
    if (!notes) return null;
    const userIdMatch = notes.match(/User ID:\s*([a-f0-9]+)/);
    const passwordMatch = notes.match(/Temp password:\s*([a-f0-9]+)/);
    return {
      userId: userIdMatch ? userIdMatch[1] : null,
      tempPassword: passwordMatch ? passwordMatch[1] : null,
    };
  };

  return (
    <div className="p-6 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Members</h1>
          <p className="text-sm text-gray-500 mt-1">
            Converted leads who completed payment ({total} total)
          </p>
        </div>
        <button
          onClick={fetchMembers}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 px-4 py-3">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, company, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:border-[#f97316]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            No converted members found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Company</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Phone</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Location</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">GST</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Converted</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member, idx) => (
                  <tr
                    key={member._id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {(page - 1) * 15 + idx + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-[#1a1a2e]">{member.fullName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{member.companyName}</td>
                    <td className="px-4 py-3 text-gray-600">{member.email}</td>
                    <td className="px-4 py-3 text-gray-600">{member.phone}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {[member.city, member.state].filter(Boolean).join(", ") || "-"}
                    </td>
                    <td className="px-4 py-3">
                      {member.paymentAmount ? (
                        <span className="text-green-700 font-semibold text-xs">
                          ₹{member.paymentAmount.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                      {member.gstNumber || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {formatDate(member.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setViewMember(member)}
                        className="p-1.5 text-gray-400 hover:text-[#f97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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
      {viewMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="bg-[#1a1a2e] px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                  {viewMember.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{viewMember.fullName}</h3>
                  <p className="text-gray-400 text-xs">{viewMember.companyName}</p>
                </div>
              </div>
              <button
                onClick={() => setViewMember(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Contact Info */}
              <div className="space-y-2.5">
                <InfoRow icon={Mail} label="Email" value={viewMember.email} />
                <InfoRow icon={Phone} label="Phone" value={viewMember.phone} />
                <InfoRow icon={Building2} label="Company" value={viewMember.companyName} />
                <InfoRow
                  icon={MapPin}
                  label="Location"
                  value={[viewMember.city, viewMember.state].filter(Boolean).join(", ")}
                />
                <InfoRow icon={User} label="Role" value={viewMember.role} />
                <InfoRow icon={Calendar} label="Converted On" value={formatDate(viewMember.createdAt)} />
              </div>

              {/* Payment Info */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-green-600 uppercase tracking-wider font-semibold">Payment Details</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Amount Paid</span>
                  <span className="font-bold text-green-700">
                    {viewMember.paymentAmount ? `₹${viewMember.paymentAmount.toLocaleString("en-IN")}` : "-"}
                  </span>
                </div>
                {viewMember.razorpayPaymentId && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Payment ID</span>
                    <span className="font-mono text-xs text-gray-600">{viewMember.razorpayPaymentId}</span>
                  </div>
                )}
                {viewMember.gstNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">GST Number</span>
                    <span className="font-mono font-medium text-[#1a1a2e]">{viewMember.gstNumber}</span>
                  </div>
                )}
              </div>

              {/* Credentials from notes */}
              {(() => {
                const creds = extractCredentials(viewMember.notes);
                if (!creds?.tempPassword) return null;
                return (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Account Credentials</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-[#1a1a2e]">{viewMember.email}</span>
                    </div>
                    {creds.tempPassword && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Temp Password</span>
                        <span className="font-mono font-bold text-[#f97316]">{creds.tempPassword}</span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Notes */}
              {viewMember.notes && (
                <div>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1.5">Notes</p>
                  <p className="text-xs text-gray-500 whitespace-pre-line bg-gray-50 rounded-lg p-3">
                    {viewMember.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <div>
        <p className="text-[10px] text-gray-400 uppercase">{label}</p>
        <p className="text-sm text-[#1a1a2e] font-medium">{value || "-"}</p>
      </div>
    </div>
  );
}
