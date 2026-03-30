"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  MessageSquare,
  Mail,
  MessageCircle,
  Clock,
  Loader2,
  RefreshCw,
  Phone,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ViewOnlyBanner } from "@/components/admin/ViewOnlyBanner";

interface ConversationSummary {
  inquiryId: string;
  fullName: string;
  email: string;
  phone: string;
  lastMessageContent: string;
  lastMessageChannel: "email" | "whatsapp";
  lastMessageTimestamp: string;
  messageCount: number;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-IN");
}

export default function ConversationsPage() {
  const router = useRouter();
  const { canView, canEdit, loading: permLoading } = useAdminPermissions();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchConversations = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const inquiriesRes = await fetch(`${API_BASE_URL}/pm/inquiry?limit=100`);
      const inquiriesData = await inquiriesRes.json();

      let allInquiries: any[] = [];
      if (Array.isArray(inquiriesData)) allInquiries = inquiriesData;
      else if (Array.isArray(inquiriesData.data)) allInquiries = inquiriesData.data;
      else if (Array.isArray(inquiriesData.inquiries)) allInquiries = inquiriesData.inquiries;

      const conversationsData = await Promise.all(
        allInquiries.map(async (inquiry: any) => {
          try {
            const convRes = await fetch(`${API_BASE_URL}/pm/conversations/${inquiry._id}`);
            if (!convRes.ok) return null;
            const convData = await convRes.json();
            const messages: any[] = convData.data?.messages || convData.messages || [];
            if (!Array.isArray(messages) || messages.length === 0) return null;
            const lastMessage = messages[messages.length - 1];
            return {
              inquiryId: inquiry._id,
              fullName: inquiry.fullName || "Unknown",
              email: inquiry.email || "",
              phone: inquiry.phone || "",
              lastMessageContent: lastMessage.content || "",
              lastMessageChannel: lastMessage.channel || "email",
              lastMessageTimestamp: lastMessage.messageTimestamp,
              messageCount: messages.length,
            } as ConversationSummary;
          } catch {
            return null;
          }
        })
      );

      const valid = conversationsData
        .filter((c): c is ConversationSummary => c !== null)
        .sort(
          (a, b) =>
            new Date(b.lastMessageTimestamp).getTime() -
            new Date(a.lastMessageTimestamp).getTime()
        );

      setConversations(valid);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchConversations(true), 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const filtered = conversations.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  if (!permLoading && !canView("inquiries")) return <AccessDenied />;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-none">Conversation Queue</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {loading ? "Loading..." : `${filtered.length} active conversations`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-400">
              Updated {formatTime(lastUpdated.toISOString())}
            </span>
          )}
          <button
            onClick={() => fetchConversations(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {!canEdit("inquiries") && (
        <div className="shrink-0">
          <ViewOnlyBanner />
        </div>
      )}

      {/* Search */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 shrink-0">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
            <p className="text-sm text-gray-500">Loading conversations...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <MessageSquare className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? "No results found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 bg-white">
            {filtered.map((conv) => (
              <div
                key={conv.inquiryId}
                onClick={() =>
                  router.push(`/admin/inquiries/${conv.inquiryId}/conversation`)
                }
                className="flex items-center gap-4 px-4 py-3 hover:bg-orange-50 cursor-pointer transition-colors group"
              >
                {/* Avatar */}
                <div className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  {getInitials(conv.fullName)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-semibold text-gray-900 truncate">
                      {conv.fullName}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">
                      {formatTime(conv.lastMessageTimestamp)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-500 truncate">{conv.email}</span>
                    <Phone className="w-3 h-3 text-gray-400 shrink-0 ml-1" />
                    <span className="text-xs text-gray-500 truncate">{conv.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {conv.lastMessageChannel === "email" ? (
                      <Mail className="w-3 h-3 text-blue-400 shrink-0" />
                    ) : (
                      <MessageCircle className="w-3 h-3 text-green-500 shrink-0" />
                    )}
                    <p className="text-xs text-gray-500 truncate">
                      {conv.lastMessageContent}
                    </p>
                  </div>
                </div>

                {/* Badges */}
                <div className="shrink-0 flex flex-col items-end gap-1.5">
                  <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                    {conv.messageCount}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      conv.lastMessageChannel === "email"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    {conv.lastMessageChannel === "email" ? "Email" : "WhatsApp"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="bg-gray-900 text-gray-400 text-xs px-6 py-1.5 flex items-center gap-4 shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Live sync every 10s
        </span>
        <span>
          <Clock className="w-3 h-3 inline mr-1" />
          {conversations.length} total
        </span>
      </div>
    </div>
  );
}
