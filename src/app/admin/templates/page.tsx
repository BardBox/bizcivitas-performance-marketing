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

  const handleSend = async (id: string) => {
    if (!confirm("Send this email campaign to all subscribers in the group?")) return;

    setSending(id);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/email-templates/${id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        alert("Campaign sent successfully!");
        await fetchTemplates();
      } else {
        alert(data.message || "Failed to send campaign");
      }
    } catch (err) {
      console.error("Send failed:", err);
      alert("Failed to send campaign");
    } finally {
      setSending(null);
    }
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
                  onClick={() => handleSend(template._id)}
                  disabled={sending === template._id || !template.isActive}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-[#f97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Send Campaign"
                >
                  {sending === template._id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
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
    </div>
  );
}
