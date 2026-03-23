"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Send,
  Eye,
  X,
  FileText,
  Search,
  Users,
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Template {
  _id: string;
  name: string;
  subject: string;
  preheader: string;
  htmlContent: string;
  category: string;
  isActive: boolean;
  autoSend: string;
  lastSentAt: string | null;
  sentCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Inquiry {
  _id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  city?: string;
  status: string;
  pipelineStage?: string;
  createdAt: string;
}

const CATEGORIES = ["welcome", "follow-up", "promotion", "reminder", "custom"];

const CATEGORY_COLORS: Record<string, string> = {
  welcome: "bg-green-100 text-green-700",
  "follow-up": "bg-blue-100 text-blue-700",
  promotion: "bg-purple-100 text-purple-700",
  reminder: "bg-yellow-100 text-yellow-700",
  custom: "bg-gray-100 text-gray-700",
};

export default function TemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Send modal state
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendTemplateId, setSendTemplateId] = useState<string | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const [selectedInquiries, setSelectedInquiries] = useState<Set<string>>(new Set());
  const [sendSearch, setSendSearch] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualEmails, setManualEmails] = useState<string[]>([]);
  const [sendMode, setSendMode] = useState<"all" | "selected" | "manual">("selected");
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: "",
    subject: "",
    preheader: "",
    htmlContent: "",
    category: "custom",
    autoSend: "none",
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-templates`);
      const data = await res.json();
      if (data.statusCode === 200) {
        setTemplates(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch templates:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
    fetchTemplates();
  }, [router, fetchTemplates]);

  const resetForm = () => {
    setForm({ name: "", subject: "", preheader: "", htmlContent: "", category: "custom", autoSend: "none" });
    setEditingId(null);
  };

  const handleEdit = (template: Template) => {
    setForm({
      name: template.name,
      subject: template.subject,
      preheader: template.preheader,
      htmlContent: template.htmlContent,
      category: template.category,
      autoSend: template.autoSend || "none",
    });
    setEditingId(template._id);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.htmlContent) {
      alert("Name, subject, and HTML content are required");
      return;
    }

    setSaving(true);
    try {
      const url = editingId
        ? `${API_BASE_URL}/pm/email-templates/${editingId}`
        : `${API_BASE_URL}/pm/email-templates`;

      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.statusCode === 200 || data.statusCode === 201) {
        setShowEditor(false);
        resetForm();
        await fetchTemplates();
      } else {
        alert(data.message || "Failed to save template");
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-templates/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        await fetchTemplates();
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const openSendModal = async (id: string) => {
    setSendTemplateId(id);
    setShowSendModal(true);
    setSelectedInquiries(new Set());
    setManualEmails([]);
    setManualEmail("");
    setSendSearch("");
    setSendMode("selected");
    setSendResult(null);
    setInquiriesLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/inquiry?page=1&limit=500`);
      const data = await res.json();
      if (data.statusCode === 200) {
        setInquiries(data.data?.inquiries || data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch inquiries:", err);
    } finally {
      setInquiriesLoading(false);
    }
  };

  const addManualEmail = () => {
    const email = manualEmail.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !manualEmails.includes(email)) {
      setManualEmails((prev) => [...prev, email]);
      setManualEmail("");
    }
  };

  const handleSend = async () => {
    if (!sendTemplateId) return;

    let emails: string[] = [];
    if (sendMode === "all") {
      emails = inquiries.map((i) => i.email);
    } else if (sendMode === "selected") {
      emails = inquiries.filter((i) => selectedInquiries.has(i._id)).map((i) => i.email);
    } else {
      emails = [...manualEmails];
    }

    if (emails.length === 0) {
      setSendResult({ success: false, message: "No recipients selected. Please select at least one." });
      return;
    }

    setSending(sendTemplateId);
    setSendResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-templates/${sendTemplateId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        setSendResult({ success: true, message: `Campaign sent successfully to ${emails.length} recipient${emails.length > 1 ? "s" : ""}!` });
        await fetchTemplates();
      } else {
        setSendResult({ success: false, message: data.message || "Failed to send campaign" });
      }
    } catch (err) {
      console.error("Send failed:", err);
      setSendResult({ success: false, message: "Failed to send campaign. Please try again." });
    } finally {
      setSending(null);
    }
  };

  const filteredInquiries = inquiries.filter((i) => {
    if (!sendSearch.trim()) return true;
    const q = sendSearch.toLowerCase();
    return (
      i.fullName?.toLowerCase().includes(q) ||
      i.email?.toLowerCase().includes(q) ||
      i.companyName?.toLowerCase().includes(q) ||
      i.phone?.includes(q) ||
      i.city?.toLowerCase().includes(q)
    );
  });

  const toggleInquiry = (id: string) => {
    setSelectedInquiries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    const allFilteredIds = filteredInquiries.map((i) => i._id);
    const allSelected = allFilteredIds.every((id) => selectedInquiries.has(id));
    setSelectedInquiries((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        allFilteredIds.forEach((id) => next.delete(id));
      } else {
        allFilteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handlePreview = (html: string) => {
    setPreviewHtml(html);
    setShowPreview(true);
  };

  const handleToggleActive = async (template: Template) => {
    try {
      await fetch(`${API_BASE_URL}/pm/email-templates/${template._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      await fetchTemplates();
    } catch (err) {
      console.error("Toggle failed:", err);
    }
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Email Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage email templates for MailerLite campaigns
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowEditor(true);
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No templates yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template._id}
              className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${
                !template.isActive ? "opacity-60" : ""
              } ${template.isActive ? "border-gray-200" : "border-gray-300 border-dashed"}`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#1a1a2e] truncate">
                    {template.name}
                  </h3>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{template.subject}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ml-2 whitespace-nowrap ${
                    CATEGORY_COLORS[template.category] || CATEGORY_COLORS.custom
                  }`}
                >
                  {template.category}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-400 mb-4 flex-wrap">
                <span>Sent {template.sentCount}x</span>
                {template.lastSentAt && (
                  <span>
                    Last: {new Date(template.lastSentAt).toLocaleDateString("en-IN")}
                  </span>
                )}
                {template.autoSend === "on_inquiry" && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    Auto: On Inquiry
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => handlePreview(template.htmlContent)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-[#1a1a2e] hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                  title="Preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button
                  onClick={() => handleEdit(template)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => openSendModal(template._id)}
                  disabled={!template.isActive}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send Campaign"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send
                </button>
                <div className="flex-1" />
                <button
                  onClick={() => handleToggleActive(template)}
                  className={`text-[10px] px-2 py-1 rounded-full cursor-pointer ${
                    template.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {template.isActive ? "Active" : "Inactive"}
                </button>
                <button
                  onClick={() => handleDelete(template._id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">
                {editingId ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetForm();
                }}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Welcome Email"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Auto Send
                  </label>
                  <select
                    value={form.autoSend}
                    onChange={(e) => setForm({ ...form, autoSend: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                  >
                    <option value="none">None (manual only)</option>
                    <option value="on_inquiry">On New Inquiry</option>
                  </select>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Auto-sends this template when a new inquiry is submitted
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Email Subject
                </label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="e.g. Welcome to BizCivitas!"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Preheader Text{" "}
                  <span className="text-gray-400 font-normal">(optional - shown in inbox preview)</span>
                </label>
                <input
                  type="text"
                  value={form.preheader}
                  onChange={(e) => setForm({ ...form, preheader: e.target.value })}
                  placeholder="e.g. Start growing your business network today"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-gray-600">
                    HTML Content
                  </label>
                  <button
                    onClick={() => handlePreview(form.htmlContent)}
                    disabled={!form.htmlContent}
                    className="text-xs text-[#f97316] hover:underline cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview
                  </button>
                </div>
                <textarea
                  value={form.htmlContent}
                  onChange={(e) => setForm({ ...form, htmlContent: e.target.value })}
                  placeholder="Paste your HTML email content here..."
                  rows={14}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-70"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update Template" : "Create Template"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">Email Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  srcDoc={previewHtml}
                  className="w-full min-h-[500px]"
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Send Campaign Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a2e] flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <Send className="w-4 h-4 text-[#f97316]" />
                  </div>
                  Send Campaign
                </h2>
                <p className="text-xs text-gray-400 mt-1 ml-10">
                  {templates.find((t) => t._id === sendTemplateId)?.name} — {templates.find((t) => t._id === sendTemplateId)?.subject}
                </p>
              </div>
              <button
                onClick={() => { setShowSendModal(false); setSendResult(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Send Mode Tabs */}
            <div className="flex border-b border-gray-100">
              <button
                onClick={() => setSendMode("selected")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  sendMode === "selected"
                    ? "text-[#f97316] border-b-2 border-[#f97316] bg-orange-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Users className="w-4 h-4" />
                Select Inquiries
              </button>
              <button
                onClick={() => setSendMode("manual")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  sendMode === "manual"
                    ? "text-[#f97316] border-b-2 border-[#f97316] bg-orange-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Mail className="w-4 h-4" />
                Manual Emails
              </button>
              <button
                onClick={() => setSendMode("all")}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer ${
                  sendMode === "all"
                    ? "text-[#f97316] border-b-2 border-[#f97316] bg-orange-50/50"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Send className="w-4 h-4" />
                Send to All
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {/* Result Banner */}
              {sendResult && (
                <div className={`mx-4 mt-4 rounded-lg px-4 py-3 flex items-center gap-2.5 text-sm ${
                  sendResult.success
                    ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}>
                  {sendResult.success
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    : <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  }
                  {sendResult.message}
                </div>
              )}

              {/* Select Inquiries Tab */}
              {sendMode === "selected" && (
                <div className="p-4">
                  {/* Search Bar */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={sendSearch}
                      onChange={(e) => setSendSearch(e.target.value)}
                      placeholder="Search by name, email, company, phone..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                    />
                  </div>

                  {/* Select All + Count */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filteredInquiries.length > 0 && filteredInquiries.every((i) => selectedInquiries.has(i._id))}
                        onChange={toggleAllFiltered}
                        className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316] cursor-pointer"
                      />
                      Select all {sendSearch ? "filtered" : ""} ({filteredInquiries.length})
                    </label>
                    <span className="text-xs font-medium text-[#f97316]">
                      {selectedInquiries.size} selected
                    </span>
                  </div>

                  {/* Inquiry List */}
                  {inquiriesLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : filteredInquiries.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">
                        {sendSearch ? "No inquiries match your search" : "No inquiries found"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                      {filteredInquiries.map((inquiry) => {
                        const isSelected = selectedInquiries.has(inquiry._id);
                        return (
                          <label
                            key={inquiry._id}
                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#f97316] bg-orange-50/60 shadow-sm"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleInquiry(inquiry._id)}
                              className="rounded border-gray-300 text-[#f97316] focus:ring-[#f97316] cursor-pointer flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 truncate">
                                  {inquiry.fullName}
                                </span>
                                {inquiry.companyName && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 truncate max-w-[120px]">
                                    {inquiry.companyName}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs text-gray-500 truncate">{inquiry.email}</span>
                                {inquiry.phone && (
                                  <span className="text-xs text-gray-400">{inquiry.phone}</span>
                                )}
                                {inquiry.city && (
                                  <span className="text-xs text-gray-400">{inquiry.city}</span>
                                )}
                              </div>
                            </div>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                              inquiry.status === "converted"
                                ? "bg-green-100 text-green-700"
                                : inquiry.status === "contacted"
                                ? "bg-blue-100 text-blue-700"
                                : inquiry.status === "qualified"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-600"
                            }`}>
                              {inquiry.status}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Manual Emails Tab */}
              {sendMode === "manual" && (
                <div className="p-4">
                  <p className="text-xs text-gray-500 mb-3">
                    Add email addresses manually for testing or sending to specific people not in your inquiry list.
                  </p>

                  {/* Add Email Input */}
                  <div className="flex gap-2 mb-4">
                    <input
                      type="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManualEmail(); } }}
                      placeholder="Enter email address..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#f97316]/30 focus:border-[#f97316]"
                    />
                    <button
                      onClick={addManualEmail}
                      disabled={!manualEmail.trim()}
                      className="px-4 py-2 bg-[#f97316] text-white text-sm font-medium rounded-lg hover:bg-[#ea580c] disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>

                  {/* Email Chips */}
                  {manualEmails.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                      <Mail className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No emails added yet</p>
                      <p className="text-xs text-gray-400 mt-0.5">Type an email above and press Enter or click Add</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {manualEmails.map((email) => (
                        <div
                          key={email}
                          className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center">
                              <Mail className="w-3.5 h-3.5 text-[#f97316]" />
                            </div>
                            <span className="text-sm text-gray-700">{email}</span>
                          </div>
                          <button
                            onClick={() => setManualEmails((prev) => prev.filter((e) => e !== email))}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <p className="text-xs text-gray-400 mt-2 text-right">
                        {manualEmails.length} email{manualEmails.length > 1 ? "s" : ""} added
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Send to All Tab */}
              {sendMode === "all" && (
                <div className="p-4">
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Send to all inquiries</p>
                      <p className="text-xs text-amber-700 mt-1">
                        This will send the email campaign to <strong>all {inquiries.length} inquiries</strong> in your list. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                  {!inquiriesLoading && (
                    <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold text-gray-900">{inquiries.length}</p>
                          <p className="text-xs text-gray-500">Total Recipients</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-green-600">
                            {inquiries.filter((i) => i.status === "converted").length}
                          </p>
                          <p className="text-xs text-gray-500">Converted</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">
                            {inquiries.filter((i) => i.status === "new" || i.status === "contacted").length}
                          </p>
                          <p className="text-xs text-gray-500">Active Leads</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <div className="text-xs text-gray-500">
                {sendMode === "selected" && `${selectedInquiries.size} recipient${selectedInquiries.size !== 1 ? "s" : ""} selected`}
                {sendMode === "manual" && `${manualEmails.length} email${manualEmails.length !== 1 ? "s" : ""} added`}
                {sendMode === "all" && `${inquiries.length} total recipient${inquiries.length !== 1 ? "s" : ""}`}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setShowSendModal(false); setSendResult(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={
                    sending !== null ||
                    (sendMode === "selected" && selectedInquiries.size === 0) ||
                    (sendMode === "manual" && manualEmails.length === 0)
                  }
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#f97316] hover:bg-[#ea580c] text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendMode === "all" ? `Send to All (${inquiries.length})` : "Send Campaign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
