"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mail,
  MessageCircle,
  Send,
  Loader2,
  ArrowLeft,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Phone,
  RefreshCw,
  Filter,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";

interface ConversationMessage {
  _id: string;
  content: string;
  subject?: string;
  messageTimestamp: string;
  type: "email" | "whatsapp" | "manual_email" | "manual_whatsapp";
  sender: "admin" | "system" | "user";
  channel: "email" | "whatsapp";
  status?: "sent" | "delivered" | "read" | "failed" | "pending";
  senderName?: string;
  recipient?: string;
}

interface InquiryData {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  status?: string;
  companyName?: string;
}

type ChannelFilter = "all" | "email" | "whatsapp";

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  contacted: "bg-yellow-500",
  hot: "bg-red-500",
  warm: "bg-orange-500",
  cold: "bg-gray-400",
  converted: "bg-green-500",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatMsgTime(timestamp: string) {
  return new Date(timestamp).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateLabel(timestamp: string) {
  return new Date(timestamp).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inquiryId = params.id as string;
  const { canEdit, loading: permLoading } = useAdminPermissions();

  const [inquiry, setInquiry] = useState<InquiryData | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [selectedChannel, setSelectedChannel] = useState<"email" | "whatsapp">("email");
  const [subject, setSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (silent) setSyncing(true);
      try {
        const res = await fetch(`${API_BASE_URL}/pm/conversations/${inquiryId}`);
        if (!res.ok) return;
        const data = await res.json();
        // Response shape: { success, data: { inquiry, messages } }
        const msgs: ConversationMessage[] =
          data.data?.messages || data.messages || [];
        if (Array.isArray(msgs)) setMessages(msgs);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setSyncing(false);
      }
    },
    [inquiryId]
  );

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, channelFilter]);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  // Initial load — fetch inquiry + messages in parallel
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const [inqRes, convRes] = await Promise.all([
          fetch(`${API_BASE_URL}/pm/inquiry/${inquiryId}`),
          fetch(`${API_BASE_URL}/pm/conversations/${inquiryId}`),
        ]);
        const inqData = await inqRes.json();
        // Inquiry response shape: { success, data: <inquiry object> }
        setInquiry(inqData.data || inqData);

        const convData = await convRes.json();
        const msgs: ConversationMessage[] =
          convData.data?.messages || convData.messages || [];
        if (Array.isArray(msgs)) setMessages(msgs);
      } catch (err) {
        console.error("Init fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    if (inquiryId) init();
  }, [inquiryId]);

  // Poll every 5 s
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSend = async () => {
    if (!messageContent.trim()) return;
    if (selectedChannel === "email" && !subject.trim()) return;

    setSending(true);
    try {
      const endpoint =
        selectedChannel === "email"
          ? `${API_BASE_URL}/pm/conversations/${inquiryId}/email`
          : `${API_BASE_URL}/pm/conversations/${inquiryId}/whatsapp`;

      const payload =
        selectedChannel === "email"
          ? { content: messageContent, subject }
          : { content: messageContent };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Send failed");

      setMessageContent("");
      setSubject("");
      // Show the channel we just sent on
      setChannelFilter(selectedChannel);
      setTimeout(() => fetchMessages(true), 600);
    } catch (err) {
      alert(`Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "delivered":
      case "read":
        return (
          <span title={status}>
            <CheckCheck className="w-3 h-3 text-blue-300" />
          </span>
        );
      case "sent":
        return (
          <span title="Sent">
            <Check className="w-3 h-3 text-green-300" />
          </span>
        );
      case "failed":
        return (
          <span title="Failed">
            <AlertCircle className="w-3 h-3 text-red-300" />
          </span>
        );
      default:
        return (
          <span title="Pending">
            <Clock className="w-3 h-3 text-gray-400" />
          </span>
        );
    }
  };

  // Apply channel filter
  const visibleMessages = messages.filter((m) =>
    channelFilter === "all" ? true : m.channel === channelFilter
  );

  const emailCount = messages.filter((m) => m.channel === "email").length;
  const waCount = messages.filter((m) => m.channel === "whatsapp").length;

  if (!permLoading && !canEdit("inquiries")) return <AccessDenied />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
          <p className="text-xs text-gray-500">Loading conversation…</p>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <p className="text-gray-500 text-sm">Inquiry not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* ── Left Sidebar ── */}
      <div className="w-64 shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Back + profile */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-800">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Inbox
          </button>

          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                {getInitials(inquiry.fullName)}
              </div>
              {inquiry.status && (
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${
                    STATUS_COLORS[inquiry.status] || "bg-gray-500"
                  }`}
                />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{inquiry.fullName}</p>
              {inquiry.companyName && (
                <p className="text-xs text-gray-500 truncate">{inquiry.companyName}</p>
              )}
              {inquiry.status && (
                <span className="text-xs text-gray-400 capitalize">{inquiry.status}</span>
              )}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="px-4 py-3 border-b border-gray-800 space-y-2.5">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</p>
          <div className="flex items-start gap-2">
            <Mail className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-300 break-all">{inquiry.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <p className="text-xs text-gray-300">{inquiry.phone}</p>
          </div>
        </div>

        {/* Message stats */}
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
            Messages
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-white">{messages.length}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-blue-400">{emailCount}</p>
              <p className="text-xs text-gray-500">Email</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-2 text-center">
              <p className="text-sm font-bold text-green-400">{waCount}</p>
              <p className="text-xs text-gray-500">WA</p>
            </div>
          </div>
        </div>

        {/* Send via */}
        {canEdit("inquiries") && (
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2.5">
              Send Via
            </p>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedChannel("email")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedChannel === "email"
                    ? "bg-blue-500/20 border border-blue-500/40 text-blue-300"
                    : "border border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email
                {selectedChannel === "email" && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
              <button
                onClick={() => setSelectedChannel("whatsapp")}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedChannel === "whatsapp"
                    ? "bg-green-500/20 border border-green-500/40 text-green-300"
                    : "border border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-300"
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
                {selectedChannel === "whatsapp" && <Check className="w-3.5 h-3.5 ml-auto" />}
              </button>
            </div>
          </div>
        )}

        {/* Sync */}
        <div className="mt-auto px-4 py-3 border-t border-gray-800">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-orange-400" : ""}`} />
            {syncing ? "Syncing…" : "Live · every 5s"}
          </div>
        </div>
      </div>

      {/* ── Chat Area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-5 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-white">{inquiry.fullName}</p>
            <span className="text-gray-600 text-xs">·</span>
            <div className="flex items-center gap-1">
              <Filter className="w-3 h-3 text-gray-500" />
              {(["all", "email", "whatsapp"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannelFilter(ch)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    channelFilter === ch
                      ? "bg-orange-500 text-white"
                      : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  {ch === "email" && <Mail className="w-3 h-3" />}
                  {ch === "whatsapp" && <MessageCircle className="w-3 h-3" />}
                  {ch === "all" ? "All" : ch === "email" ? `Email (${emailCount})` : `WhatsApp (${waCount})`}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => fetchMessages(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <MessageCircle className="w-10 h-10 text-gray-700" />
              <p className="text-sm text-gray-600">
                {channelFilter === "all"
                  ? "No messages yet"
                  : `No ${channelFilter} messages`}
              </p>
            </div>
          ) : (
            <>
              {visibleMessages.map((msg, idx) => {
                const isAdmin = msg.sender === "admin";
                const isSystem = msg.sender === "system";
                const prev = idx > 0 ? visibleMessages[idx - 1] : null;
                const showDate =
                  !prev ||
                  new Date(msg.messageTimestamp).toDateString() !==
                    new Date(prev.messageTimestamp).toDateString();

                return (
                  <div key={msg._id}>
                    {showDate && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-800" />
                        <span className="text-xs text-gray-600 shrink-0 px-2">
                          {formatDateLabel(msg.messageTimestamp)}
                        </span>
                        <div className="flex-1 h-px bg-gray-800" />
                      </div>
                    )}

                    {isSystem ? (
                      <div className="flex justify-center my-2">
                        <span className="text-xs text-gray-600 bg-gray-800/60 px-4 py-1.5 rounded-full">
                          {msg.content}
                        </span>
                      </div>
                    ) : (
                      <div
                        className={`flex gap-2 mb-2 ${
                          isAdmin ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {/* Avatar dot */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 self-end mb-1 ${
                            isAdmin
                              ? "bg-orange-500"
                              : "bg-gradient-to-br from-blue-500 to-blue-700"
                          }`}
                        >
                          {isAdmin ? "A" : getInitials(inquiry.fullName)}
                        </div>

                        <div
                          className={`max-w-[60%] flex flex-col gap-1 ${
                            isAdmin ? "items-end" : "items-start"
                          }`}
                        >
                          {/* Channel tag above bubble */}
                          <div
                            className={`flex items-center gap-1 ${
                              isAdmin ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            {msg.channel === "email" ? (
                              <Mail className="w-3 h-3 text-blue-400" />
                            ) : (
                              <MessageCircle className="w-3 h-3 text-green-400" />
                            )}
                            <span className="text-xs text-gray-600 capitalize">
                              {msg.channel}
                            </span>
                          </div>

                          {/* Subject line for emails */}
                          {msg.subject && (
                            <p
                              className={`text-xs font-semibold px-1 ${
                                isAdmin ? "text-right text-orange-400" : "text-left text-blue-400"
                              }`}
                            >
                              Re: {msg.subject}
                            </p>
                          )}

                          {/* Bubble */}
                          <div
                            className={`px-4 py-2.5 text-sm leading-relaxed ${
                              isAdmin
                                ? "bg-orange-500 text-white rounded-2xl rounded-br-sm"
                                : msg.channel === "whatsapp"
                                ? "bg-green-900/40 border border-green-800/50 text-green-100 rounded-2xl rounded-bl-sm"
                                : "bg-gray-800 border border-gray-700 text-gray-100 rounded-2xl rounded-bl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          </div>

                          {/* Timestamp + status */}
                          <div
                            className={`flex items-center gap-1.5 px-1 ${
                              isAdmin ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <span className="text-xs text-gray-600">
                              {formatMsgTime(msg.messageTimestamp)}
                            </span>
                            {isAdmin && getStatusIcon(msg.status)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Area */}
        {canEdit("inquiries") ? (
          <div className="bg-gray-900 border-t border-gray-800 px-5 py-3 shrink-0">
            {/* Channel indicator */}
            <div className="flex items-center gap-2 mb-2">
              {selectedChannel === "email" ? (
                <>
                  <Mail className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium">Sending via Email</span>
                </>
              ) : (
                <>
                  <MessageCircle className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Sending via WhatsApp</span>
                </>
              )}
            </div>

            {selectedChannel === "email" && (
              <input
                type="text"
                placeholder="Subject…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mb-2 px-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            )}

            <div className="flex items-end gap-2">
              <textarea
                placeholder={`Type a ${selectedChannel} message…`}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
                }}
                rows={2}
                className="flex-1 px-4 py-2.5 text-sm bg-gray-800 border border-gray-700 rounded-2xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
              />
              <button
                onClick={handleSend}
                disabled={
                  sending ||
                  !messageContent.trim() ||
                  (selectedChannel === "email" && !subject.trim())
                }
                className={`flex items-center gap-2 text-white px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedChannel === "email"
                    ? "bg-blue-600 hover:bg-blue-500"
                    : "bg-green-600 hover:bg-green-500"
                }`}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
            <p className="text-xs text-gray-700 mt-1.5 ml-1">Ctrl+Enter to send</p>
          </div>
        ) : (
          <div className="bg-gray-900 border-t border-gray-800 px-5 py-3 text-center text-xs text-gray-600 shrink-0">
            View-only — contact your admin for edit access
          </div>
        )}
      </div>
    </div>
  );
}
