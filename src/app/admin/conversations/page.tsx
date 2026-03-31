"use client";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Mail,
  MessageCircle,
  Loader2,
  RefreshCw,
  Send,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Phone,
  User,
  Building2,
  MapPin,
  Tag,
  Info,
  MessageSquareDashed,
  ChevronRight,
  X,
  SlidersHorizontal,
  Code,
  Eye,
  Type,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";

/* ─────────────────────────── types ──────────────────────────── */
interface Inquiry {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  status?: string;
  companyName?: string;
  city?: string;
  state?: string;
  role?: string;
  teamSize?: string;
  pipelineStage?: string;
  engagementScore?: number;
  notes?: string;
  createdAt: string;
}

interface Message {
  _id: string;
  content: string;
  subject?: string;
  messageTimestamp: string;
  sender: "admin" | "system" | "user";
  channel: "email" | "whatsapp";
  status?: "sent" | "delivered" | "read" | "failed" | "pending";
  metadata?: { isHtml?: boolean; [key: string]: unknown } | null;
}

type RightView = "chat" | "info";

/* ─────────────────────────── helpers ────────────────────────── */
const STATUS_COLOR: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  contacted: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  cold: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  converted: "bg-green-500/20 text-green-400 border-green-500/30",
};

const STATUS_DOT: Record<string, string> = {
  new: "bg-blue-400",
  contacted: "bg-yellow-400",
  hot: "bg-red-400",
  warm: "bg-orange-400",
  cold: "bg-gray-400",
  converted: "bg-green-400",
};

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

function relativeTime(ts: string) {
  const d = new Date(ts), now = new Date();
  const m = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  if (m < 10080) return `${Math.floor(m / 1440)}d ago`;
  return d.toLocaleDateString("en-IN");
}

function msgTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function dateLabel(ts: string) {
  return new Date(ts).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
}

/* ──────────────────── Status icon for messages ──────────────── */
function StatusIcon({ status }: { status?: string }) {
  if (status === "delivered" || status === "read")
    return <span title={status}><CheckCheck className="w-3 h-3 text-blue-300" /></span>;
  if (status === "sent")
    return <span title="Sent"><Check className="w-3 h-3 text-gray-400" /></span>;
  if (status === "failed")
    return <span title="Failed"><AlertCircle className="w-3 h-3 text-red-400" /></span>;
  return <span title="Pending"><Clock className="w-3 h-3 text-gray-600" /></span>;
}

/* ────────────────────── Single channel chat ─────────────────── */
interface ChatPanelProps {
  channel: "email" | "whatsapp";
  messages: Message[];
  inquiryId: string;
  canSend: boolean;
  onSent: () => void;
}

function ChatPanel({ channel, messages, inquiryId, canSend, onSent }: ChatPanelProps) {
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!content.trim()) return;
    if (channel === "email" && !subject.trim()) return;
    setSending(true);
    try {
      const endpoint = channel === "email"
        ? `${API_BASE_URL}/pm/conversations/${inquiryId}/email`
        : `${API_BASE_URL}/pm/conversations/${inquiryId}/whatsapp`;
      const payload = channel === "email" ? { content, subject, isHtml: isHtmlMode } : { content };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Send failed");
      setContent("");
      setSubject("");
      setTimeout(onSent, 500);
    } catch (err) {
      alert(`Failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  const isWA = channel === "whatsapp";
  const accent = isWA ? "green" : "blue";
  const accentBg = isWA ? "bg-green-600 hover:bg-green-500" : "bg-blue-600 hover:bg-blue-500";
  const headerBg = isWA ? "bg-green-900/30 border-green-800/50" : "bg-blue-900/30 border-blue-800/50";
  const headerText = isWA ? "text-green-300" : "text-blue-300";
  const Icon = isWA ? MessageCircle : Mail;

  /* group messages by date */
  const grouped: { date: string; msgs: Message[] }[] = [];
  messages.forEach((m) => {
    const d = new Date(m.messageTimestamp).toDateString();
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) last.msgs.push(m);
    else grouped.push({ date: d, msgs: [m] });
  });

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Channel header */}
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${headerBg}`}>
        <Icon className={`w-4 h-4 ${headerText}`} />
        <span className={`text-xs font-semibold ${headerText} uppercase tracking-wider`}>
          {isWA ? "WhatsApp" : "Email"} · {messages.length} messages
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-50">
            <Icon className="w-8 h-8 text-gray-700" />
            <p className="text-xs text-gray-600">No {isWA ? "WhatsApp" : "email"} messages</p>
          </div>
        ) : (
          grouped.map(({ date, msgs }) => (
            <div key={date}>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-800" />
                <span className="text-xs text-gray-700 shrink-0">{dateLabel(msgs[0].messageTimestamp)}</span>
                <div className="flex-1 h-px bg-gray-800" />
              </div>
              {msgs.map((msg) => {
                const isAdmin = msg.sender === "admin";
                const isSystem = msg.sender === "system";

                if (isSystem) return (
                  <div key={msg._id} className="flex justify-center my-1">
                    <span className="text-xs text-gray-600 bg-gray-800/60 px-3 py-1 rounded-full">{msg.content}</span>
                  </div>
                );

                return (
                  <div key={msg._id} className={`flex gap-2 mb-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 self-end mb-1 ${isAdmin ? "bg-orange-500" : isWA ? "bg-green-700" : "bg-blue-700"}`}>
                      {isAdmin ? "A" : "U"}
                    </div>
                    <div className={`max-w-[75%] flex flex-col gap-0.5 ${isAdmin ? "items-end" : "items-start"}`}>
                      {msg.subject && (
                        <p className={`text-xs font-medium px-1 ${isAdmin ? "text-orange-400 text-right" : `text-${accent}-400`}`}>
                          {msg.subject}
                        </p>
                      )}
                      <div className={`px-3 py-2 text-xs leading-relaxed rounded-2xl ${
                        isAdmin
                          ? "bg-orange-500 text-white rounded-br-sm"
                          : isWA
                          ? "bg-green-900/50 border border-green-800/40 text-green-100 rounded-bl-sm"
                          : "bg-gray-800 border border-gray-700 text-gray-100 rounded-bl-sm"
                      }`}>
                        {msg.metadata?.isHtml ? (
                          <div
                            className="prose prose-xs prose-invert max-w-none break-words [&_img]:max-w-full [&_img]:h-auto"
                            dangerouslySetInnerHTML={{ __html: msg.content }}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                      </div>
                      <div className={`flex items-center gap-1 px-1 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                        <span className="text-xs text-gray-700">{msgTime(msg.messageTimestamp)}</span>
                        {isAdmin && <StatusIcon status={msg.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {canSend && (
        <div className="border-t border-gray-800 px-3 py-2.5 bg-gray-900 shrink-0">
          {channel === "email" && (
            <>
              <input
                type="text"
                placeholder="Subject…"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mb-2 px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              {/* HTML / Text toggle */}
              <div className="flex items-center gap-1 mb-2">
                <button
                  onClick={() => setIsHtmlMode(false)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${!isHtmlMode ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  <Type className="w-3 h-3" /> Text
                </button>
                <button
                  onClick={() => setIsHtmlMode(true)}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${isHtmlMode ? "bg-orange-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
                >
                  <Code className="w-3 h-3" /> HTML
                </button>
                {isHtmlMode && (
                  <button
                    onClick={() => setShowPreview((p) => !p)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-gray-800 text-gray-400 hover:text-white transition-colors ml-auto"
                  >
                    <Eye className="w-3 h-3" /> {showPreview ? "Edit" : "Preview"}
                  </button>
                )}
              </div>
              {isHtmlMode && (
                <p className="text-xs text-gray-500 mb-1">
                  Placeholders: <span className="text-orange-400">{"{{name}}"}</span>{" "}
                  <span className="text-orange-400">{"{{email}}"}</span>{" "}
                  <span className="text-orange-400">{"{{company}}"}</span>{" "}
                  <span className="text-orange-400">{"{{phone}}"}</span>{" "}
                  <span className="text-orange-400">{"{{city}}"}</span>{" "}
                  <span className="text-orange-400">{"{{state}}"}</span>
                </p>
              )}
            </>
          )}
          {/* Preview panel */}
          {isHtmlMode && showPreview && content.trim() && (
            <div
              className="mb-2 p-2 bg-white rounded text-xs text-gray-900 max-h-36 overflow-y-auto prose prose-xs max-w-none [&_img]:max-w-full [&_img]:h-auto"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
          <div className="flex items-end gap-2">
            <textarea
              placeholder={isHtmlMode ? "Paste HTML here…" : `Message via ${isWA ? "WhatsApp" : "email"}…`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
              rows={isHtmlMode ? 4 : 2}
              className={`flex-1 px-3 py-2 text-xs bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none ${isHtmlMode ? "font-mono" : ""}`}
            />
            <button
              onClick={send}
              disabled={sending || !content.trim() || (channel === "email" && !subject.trim())}
              className={`${accentBg} disabled:opacity-30 text-white p-2.5 rounded-xl transition-colors shrink-0`}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────── Main page ───────────────────────── */
export default function ConversationsPage() {
  const router = useRouter();
  const { canView, canEdit, loading: permLoading } = useAdminPermissions();

  /* inquiry list */
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterChannel, setFilterChannel] = useState<string>("all");
  const [filterHasMsg, setFilterHasMsg] = useState<string>("all"); // all | with | without

  /* selected inquiry state */
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [rightView, setRightView] = useState<RightView>("chat");

  /* last message preview cache */
  const [lastMsgCache, setLastMsgCache] = useState<
    Record<string, { content: string; channel: string; ts: string; sender: string }>
  >({});

  /* ── auth check ── */
  useEffect(() => {
    fetch("/api/admin/verify").then((res) => { if (!res.ok) router.push("/admin/login"); });
  }, [router]);

  /* ── fetch all inquiries ── */
  const fetchInquiries = useCallback(async () => {
    setListLoading(true);
    try {
      // Fetch first page to get totalPages
      const first = await fetch(
        `${API_BASE_URL}/pm/inquiry?limit=100&page=1&includeConverted=true`
      );
      const firstData = await first.json();

      // Response shape: { data: { inquiries, total, page, totalPages } }
      const meta = firstData.data || firstData;
      let list: Inquiry[] = Array.isArray(meta.inquiries) ? meta.inquiries : [];
      const totalPages: number = meta.totalPages || 1;

      // Fetch remaining pages in parallel
      if (totalPages > 1) {
        const pageNums = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
        const rest = await Promise.all(
          pageNums.map((p) =>
            fetch(`${API_BASE_URL}/pm/inquiry?limit=100&page=${p}&includeConverted=true`)
              .then((r) => r.json())
              .then((d) => {
                const m = d.data || d;
                return Array.isArray(m.inquiries) ? m.inquiries : [];
              })
              .catch(() => [])
          )
        );
        list = [...list, ...rest.flat()];
      }

      // Sort newest first, then deduplicate by email — keep most recent per contact
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const seen = new Set<string>();
      const unique = list.filter((inq) => {
        const key = inq.email.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setInquiries(unique);
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => { fetchInquiries(); }, [fetchInquiries]);

  /* ── fetch messages for selected inquiry ── */
  const fetchMessages = useCallback(async (id: string, silent = false) => {
    if (silent) setSyncing(true);
    else setMsgLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs: Message[] = data.data?.messages || data.messages || [];
      if (Array.isArray(msgs)) {
        setMessages(msgs);
        // Update last msg cache
        if (msgs.length > 0) {
          const last = msgs[msgs.length - 1];
          setLastMsgCache((prev) => ({
            ...prev,
            [id]: { content: last.content, channel: last.channel, ts: last.messageTimestamp, sender: last.sender },
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      setMsgLoading(false);
      setSyncing(false);
    }
  }, []);

  /* ── select an inquiry ── */
  const selectInquiry = (inq: Inquiry) => {
    setSelected(inq);
    setRightView("chat");
    setMessages([]);
    fetchMessages(inq._id);
  };

  /* ── poll every 5s when a conversation is open ── */
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => fetchMessages(selected._id, true), 5000);
    return () => clearInterval(interval);
  }, [selected, fetchMessages]);

  /* ── filtered list ── */
  const filtered = inquiries.filter((inq) => {
    const q = search.toLowerCase();
    const matchSearch =
      inq.fullName.toLowerCase().includes(q) ||
      inq.email.toLowerCase().includes(q) ||
      inq.phone.includes(q) ||
      (inq.companyName || "").toLowerCase().includes(q);

    const matchStatus = filterStatus === "all" || inq.status === filterStatus;

    const last = lastMsgCache[inq._id];
    const matchChannel =
      filterChannel === "all" ||
      (last && last.channel === filterChannel);

    const matchHasMsg =
      filterHasMsg === "all" ||
      (filterHasMsg === "with" && !!last) ||
      (filterHasMsg === "without" && !last);

    return matchSearch && matchStatus && matchChannel && matchHasMsg;
  });

  const activeFilterCount = [
    filterStatus !== "all",
    filterChannel !== "all",
    filterHasMsg !== "all",
  ].filter(Boolean).length;

  const waMsgs = messages.filter((m) => m.channel === "whatsapp");
  const emailMsgs = messages.filter((m) => m.channel === "email");

  if (!permLoading && !canView("inquiries")) return <AccessDenied />;

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">

      {/* ══════════════ LEFT — Inquiry List ══════════════ */}
      <div className="w-72 shrink-0 flex flex-col border-r border-gray-800 bg-gray-900">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <MessageSquareDashed className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">Conversations</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {listLoading ? "Loading…" : `${filtered.length} contacts`}
              </p>
            </div>
          </div>
          <button
            onClick={fetchInquiries}
            disabled={listLoading}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${listLoading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Search + Filter toggle */}
        <div className="px-3 py-2 border-b border-gray-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-600" />
              <input
                type="text"
                placeholder="Search name, email, phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`relative flex items-center justify-center w-7 h-7 rounded-lg border transition-colors shrink-0 ${
                showFilters || activeFilterCount > 0
                  ? "bg-orange-500/20 border-orange-500/50 text-orange-400"
                  : "border-gray-700 text-gray-500 hover:text-white hover:border-gray-600"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-2.5 space-y-2.5">
              {/* Status */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Status</p>
                <div className="flex flex-wrap gap-1">
                  {["all", "new", "contacted", "warm", "hot", "cold", "converted"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilterStatus(s)}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium capitalize transition-colors ${
                        filterStatus === s
                          ? "bg-orange-500 text-white"
                          : "bg-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Channel */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Last Channel</p>
                <div className="flex gap-1">
                  {[
                    { val: "all", label: "All" },
                    { val: "email", label: "Email", icon: <Mail className="w-3 h-3" /> },
                    { val: "whatsapp", label: "WhatsApp", icon: <MessageCircle className="w-3 h-3" /> },
                  ].map(({ val, label, icon }) => (
                    <button
                      key={val}
                      onClick={() => setFilterChannel(val)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                        filterChannel === val
                          ? "bg-orange-500 text-white"
                          : "bg-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Has messages */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">Messages</p>
                <div className="flex gap-1">
                  {[
                    { val: "all", label: "All" },
                    { val: "with", label: "Has msgs" },
                    { val: "without", label: "No msgs" },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => setFilterHasMsg(val)}
                      className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                        filterHasMsg === val
                          ? "bg-orange-500 text-white"
                          : "bg-gray-700 text-gray-400 hover:text-white"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear */}
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterStatus("all"); setFilterChannel("all"); setFilterHasMsg("all"); }}
                  className="w-full text-xs text-gray-500 hover:text-red-400 transition-colors text-center pt-1"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2 opacity-50">
              <User className="w-6 h-6 text-gray-600" />
              <p className="text-xs text-gray-600">No contacts found</p>
            </div>
          ) : (
            filtered.map((inq) => {
              const last = lastMsgCache[inq._id];
              const isActive = selected?._id === inq._id;
              return (
                <button
                  key={inq._id}
                  onClick={() => selectInquiry(inq)}
                  className={`w-full text-left flex items-center gap-3 px-3 py-3 border-b border-gray-800/60 transition-colors ${
                    isActive ? "bg-orange-500/10 border-l-2 border-l-orange-500" : "hover:bg-gray-800/60"
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold ${isActive ? "bg-orange-500" : "bg-gradient-to-br from-gray-600 to-gray-700"}`}>
                      {initials(inq.fullName)}
                    </div>
                    {inq.status && (
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${STATUS_DOT[inq.status] || "bg-gray-500"}`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-semibold truncate ${isActive ? "text-orange-300" : "text-white"}`}>
                        {inq.fullName}
                      </span>
                      <span className="text-xs text-gray-600 shrink-0">
                        {last ? relativeTime(last.ts) : relativeTime(inq.createdAt)}
                      </span>
                    </div>
                    {last ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        {last.channel === "whatsapp"
                          ? <MessageCircle className="w-3 h-3 text-green-500 shrink-0" />
                          : <Mail className="w-3 h-3 text-blue-400 shrink-0" />}
                        <p className="text-xs text-gray-500 truncate">
                          {last.sender === "admin" && <span className="text-orange-400">You: </span>}
                          {last.content}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-700 mt-0.5 truncate">{inq.email}</p>
                    )}
                  </div>

                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-800 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-gray-600">Live sync · 5s</span>
        </div>
      </div>

      {/* ══════════════ RIGHT — Content Area ══════════════ */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-40">
            <MessageSquareDashed className="w-16 h-16 text-gray-700" />
            <p className="text-gray-500 text-sm">Select a contact to view conversation</p>
          </div>
        ) : (
          <>
            {/* Top bar */}
            <div className="bg-gray-900 border-b border-gray-800 px-5 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {initials(selected.fullName)}
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">{selected.fullName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{selected.email} · {selected.phone}</p>
                </div>
                {selected.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${STATUS_COLOR[selected.status] || "bg-gray-700 text-gray-400 border-gray-600"}`}>
                    {selected.status}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {syncing && <RefreshCw className="w-3.5 h-3.5 text-orange-400 animate-spin" />}

                {/* Toggle: Chat ↔ Info */}
                <div className="flex items-center bg-gray-800 rounded-lg p-0.5">
                  <button
                    onClick={() => setRightView("chat")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightView === "chat" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Chat
                  </button>
                  <button
                    onClick={() => setRightView("info")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${rightView === "info" ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    Info
                  </button>
                </div>

                <button
                  onClick={() => { setSelected(null); setMessages([]); }}
                  className="text-gray-600 hover:text-white transition-colors ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── CHAT VIEW: split WA | Email ── */}
            {rightView === "chat" && (
              <div className="flex flex-1 min-h-0 divide-x divide-gray-800">
                {msgLoading ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  </div>
                ) : (
                  <>
                    {/* WhatsApp panel */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-0">
                      <ChatPanel
                        channel="whatsapp"
                        messages={waMsgs}
                        inquiryId={selected._id}
                        canSend={!!canEdit("inquiries")}
                        onSent={() => fetchMessages(selected._id, true)}
                      />
                    </div>

                    {/* Email panel */}
                    <div className="flex-1 flex flex-col min-w-0 min-h-0">
                      <ChatPanel
                        channel="email"
                        messages={emailMsgs}
                        inquiryId={selected._id}
                        canSend={!!canEdit("inquiries")}
                        onSent={() => fetchMessages(selected._id, true)}
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── INFO VIEW ── */}
            {rightView === "info" && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-2xl mx-auto space-y-5">

                  {/* Profile card */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold shrink-0">
                        {initials(selected.fullName)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white">{selected.fullName}</h2>
                        {selected.companyName && (
                          <p className="text-sm text-gray-400">{selected.companyName}</p>
                        )}
                        {selected.status && (
                          <span className={`inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${STATUS_COLOR[selected.status] || "bg-gray-700 text-gray-400 border-gray-600"}`}>
                            {selected.status}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <InfoRow icon={<Mail className="w-3.5 h-3.5 text-blue-400" />} label="Email" value={selected.email} />
                      <InfoRow icon={<Phone className="w-3.5 h-3.5 text-orange-400" />} label="Phone" value={selected.phone} />
                      {selected.companyName && (
                        <InfoRow icon={<Building2 className="w-3.5 h-3.5 text-purple-400" />} label="Company" value={selected.companyName} />
                      )}
                      {selected.role && (
                        <InfoRow icon={<User className="w-3.5 h-3.5 text-yellow-400" />} label="Role" value={selected.role} />
                      )}
                      {(selected.city || selected.state) && (
                        <InfoRow icon={<MapPin className="w-3.5 h-3.5 text-red-400" />} label="Location" value={[selected.city, selected.state].filter(Boolean).join(", ")} />
                      )}
                      {selected.teamSize && (
                        <InfoRow icon={<User className="w-3.5 h-3.5 text-cyan-400" />} label="Team Size" value={selected.teamSize} />
                      )}
                      {selected.pipelineStage && (
                        <InfoRow icon={<Tag className="w-3.5 h-3.5 text-green-400" />} label="Pipeline" value={selected.pipelineStage} />
                      )}
                      {selected.engagementScore !== undefined && (
                        <InfoRow icon={<Tag className="w-3.5 h-3.5 text-orange-400" />} label="Score" value={String(selected.engagementScore)} />
                      )}
                    </div>
                  </div>

                  {/* Notes */}
                  {selected.notes && (
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{selected.notes}</p>
                    </div>
                  )}

                  {/* Message summary */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Message Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      <StatBox label="Total" value={messages.length} color="text-white" />
                      <StatBox label="WhatsApp" value={waMsgs.length} color="text-green-400" />
                      <StatBox label="Email" value={emailMsgs.length} color="text-blue-400" />
                    </div>
                  </div>

                  {/* Created */}
                  <p className="text-xs text-gray-700 text-center">
                    Contact since {new Date(selected.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* small sub-components */
function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-gray-800/50 rounded-lg px-3 py-2.5">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-gray-600">{label}</p>
        <p className="text-xs text-gray-200 font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-3 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-600 mt-0.5">{label}</p>
    </div>
  );
}
