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
  User,
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
  status?: "sent" | "delivered" | "failed" | "pending";
  senderName?: string;
}

interface InquiryData {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
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
  return new Date(timestamp).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
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
  const [selectedChannel, setSelectedChannel] = useState<"email" | "whatsapp">("email");
  const [subject, setSubject] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchMessages = useCallback(async (silent = false) => {
    if (silent) setSyncing(true);
    try {
      const convRes = await fetch(`${API_BASE_URL}/pm/conversations/${inquiryId}`);
      if (!convRes.ok) return;
      const convData = await convRes.json();
      const msgs: ConversationMessage[] = convData.data?.messages || convData.messages || [];
      if (Array.isArray(msgs)) setMessages(msgs);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setSyncing(false);
    }
  }, [inquiryId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [inquiryRes, convRes] = await Promise.all([
          fetch(`${API_BASE_URL}/pm/inquiry/${inquiryId}`),
          fetch(`${API_BASE_URL}/pm/conversations/${inquiryId}`),
        ]);
        const inquiryData = await inquiryRes.json();
        setInquiry(inquiryData.data);

        const convData = await convRes.json();
        const msgs: ConversationMessage[] = convData.data?.messages || convData.messages || [];
        if (Array.isArray(msgs)) setMessages(msgs);
      } catch (err) {
        console.error("Failed to fetch conversation data:", err);
      } finally {
        setLoading(false);
      }
    };
    if (inquiryId) fetchData();
  }, [inquiryId]);

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchMessages(true), 5000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const handleSendMessage = async () => {
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

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message || "Failed to send message");

      setMessageContent("");
      setSubject("");

      // Refresh immediately after send
      setTimeout(() => fetchMessages(true), 500);
    } catch (err) {
      console.error("Failed to send message:", err);
      alert(`Failed to send: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "delivered":
        return <span title="Delivered"><CheckCheck className="w-3.5 h-3.5 text-blue-400" /></span>;
      case "sent":
        return <span title="Sent"><Check className="w-3.5 h-3.5 text-green-400" /></span>;
      case "failed":
        return <span title="Failed"><AlertCircle className="w-3.5 h-3.5 text-red-400" /></span>;
      default:
        return <span title="Pending"><Clock className="w-3.5 h-3.5 text-gray-300" /></span>;
    }
  };

  if (!permLoading && !canEdit("inquiries")) return <AccessDenied />;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin w-8 h-8 text-orange-500" />
          <p className="text-sm text-gray-500">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!inquiry) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-gray-500">Inquiry not found</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Left Sidebar — Contact Info */}
      <div className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        {/* Back + Header */}
        <div className="bg-gray-900 text-white px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Queue
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
              {getInitials(inquiry.fullName)}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm leading-tight truncate">{inquiry.fullName}</h2>
              <span className="text-xs text-green-400 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Contact Details
          </p>
          <div className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-xs font-medium text-gray-900 truncate">{inquiry.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                <Phone className="w-3.5 h-3.5 text-orange-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-xs font-medium text-gray-900">{inquiry.phone}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Conversation Stats
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-gray-900">{messages.length}</p>
              <p className="text-xs text-gray-500">Messages</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-lg font-bold text-orange-500">
                {messages.filter((m) => m.sender === "admin").length}
              </p>
              <p className="text-xs text-gray-500">Sent</p>
            </div>
          </div>
        </div>

        {/* Channel Selector */}
        {canEdit("inquiries") && (
          <div className="p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Send Via
            </p>
            <div className="space-y-2">
              <button
                onClick={() => setSelectedChannel("email")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedChannel === "email"
                    ? "bg-blue-50 border-blue-300 text-blue-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Mail className="w-4 h-4" />
                Email
                {selectedChannel === "email" && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </button>
              <button
                onClick={() => setSelectedChannel("whatsapp")}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                  selectedChannel === "whatsapp"
                    ? "bg-green-50 border-green-300 text-green-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
                {selectedChannel === "whatsapp" && (
                  <Check className="w-4 h-4 ml-auto" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Sync status */}
        <div className="mt-auto p-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-orange-400" : ""}`} />
            {syncing ? "Syncing..." : "Live sync every 5s"}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">{inquiry.fullName}</span>
            <span className="text-xs text-gray-400">— Conversation Thread</span>
          </div>
          <button
            onClick={() => fetchMessages(true)}
            disabled={syncing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => {
                const isAdmin = msg.sender === "admin";
                const isSystem = msg.sender === "system";
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showDateSep =
                  !prevMsg ||
                  new Date(msg.messageTimestamp).toDateString() !==
                    new Date(prevMsg.messageTimestamp).toDateString();

                return (
                  <div key={msg._id}>
                    {showDateSep && (
                      <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-gray-200" />
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(msg.messageTimestamp).toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                          })}
                        </span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                    )}

                    {isSystem ? (
                      /* System message — centered */
                      <div className="flex justify-center">
                        <div className="bg-gray-100 text-gray-500 text-xs px-4 py-1.5 rounded-full max-w-sm text-center">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex gap-2.5 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                        {/* Avatar */}
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1 ${
                            isAdmin
                              ? "bg-orange-500"
                              : "bg-gradient-to-br from-blue-400 to-blue-600"
                          }`}
                        >
                          {isAdmin ? "A" : getInitials(inquiry.fullName)}
                        </div>

                        {/* Bubble */}
                        <div
                          className={`max-w-[65%] ${isAdmin ? "items-end" : "items-start"} flex flex-col gap-1`}
                        >
                          {msg.subject && (
                            <p
                              className={`text-xs font-semibold px-1 ${
                                isAdmin ? "text-right text-orange-600" : "text-left text-blue-600"
                              }`}
                            >
                              {msg.subject}
                            </p>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isAdmin
                                ? "bg-orange-500 text-white rounded-tr-sm"
                                : "bg-white text-gray-900 border border-gray-200 rounded-tl-sm shadow-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 px-1 ${
                              isAdmin ? "flex-row-reverse" : "flex-row"
                            }`}
                          >
                            <span className="text-xs text-gray-400">
                              {formatTime(msg.messageTimestamp)}
                            </span>
                            {msg.channel === "email" ? (
                              <Mail className="w-3 h-3 text-gray-300" />
                            ) : (
                              <MessageCircle className="w-3 h-3 text-gray-300" />
                            )}
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
          <div className="bg-white border-t border-gray-200 px-5 py-4 shrink-0">
            {selectedChannel === "email" && (
              <input
                type="text"
                placeholder="Subject..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mb-3 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
              />
            )}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <textarea
                  placeholder={`Type a message via ${selectedChannel}...`}
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSendMessage();
                  }}
                  rows={2}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 ml-1">
                  Ctrl+Enter to send
                </p>
              </div>
              <button
                onClick={handleSendMessage}
                disabled={
                  sending ||
                  !messageContent.trim() ||
                  (selectedChannel === "email" && !subject.trim())
                }
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-5 py-3 rounded-2xl font-medium text-sm transition-colors shrink-0"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 border-t border-gray-200 px-5 py-3 text-center text-xs text-gray-400 shrink-0">
            View-only access — you cannot send messages
          </div>
        )}
      </div>
    </div>
  );
}
