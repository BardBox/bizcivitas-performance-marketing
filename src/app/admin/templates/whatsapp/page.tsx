"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  MessageCircle,
  X,
  Mail,
  ArrowLeft,
  RefreshCw,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  useGetWhatsappTemplatesQuery,
  useCreateWhatsappTemplateMutation,
  useCreateWhatsappTemplateOnTftMutation,
  useSyncWhatsappTemplatesMutation,
  useGetWhatsappTemplatePreviewQuery,
  useUpdateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
  type WhatsappTemplate,
} from "@/store/endpoints/whatsappTemplates";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ViewOnlyBanner } from "@/components/admin/ViewOnlyBanner";

const CATEGORY_COLORS: Record<string, string> = {
  welcome: "bg-green-100 text-green-700",
  "follow-up": "bg-blue-100 text-blue-700",
  promotion: "bg-purple-100 text-purple-700",
  reminder: "bg-yellow-100 text-yellow-700",
  custom: "bg-gray-100 text-gray-700",
  marketing: "bg-emerald-100 text-emerald-700",
  utility: "bg-indigo-100 text-indigo-700",
  authentication: "bg-orange-100 text-orange-700",
};

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  REJECTED: "bg-red-100 text-red-700",
  LOCAL: "bg-gray-100 text-gray-600",
  UNKNOWN: "bg-gray-100 text-gray-600",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  synced: "Synced",
  created_via_admin: "Created in Admin",
};

const LOCAL_CATEGORIES = [
  "custom",
  "welcome",
  "follow-up",
  "promotion",
  "reminder",
  "marketing",
  "utility",
  "authentication",
];

const TFT_CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const TFT_TYPES = ["standard", "media", "carousel"];

type Notice = { type: "success" | "error"; message: string };

const sanitizeTemplateName = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "-";

const getErrorMessage = (err: unknown, fallback: string) => {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  if (typeof err === "object") {
    const data = (err as { data?: { message?: string; msg?: string } }).data;
    if (data?.message) return data.message;
    if (data?.msg) return data.msg;
    const error = (err as { error?: string }).error;
    if (error) return error;
  }
  return fallback;
};

export default function WhatsAppTemplatesPage() {
  const { canView, canEdit, loading: permLoading } = useAdminPermissions();
  const router = useRouter();
  const [showEditor, setShowEditor] = useState(false);
  const [showCreateOnTft, setShowCreateOnTft] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WhatsappTemplate | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    tftTemplateName: "",
    description: "",
    category: "custom",
  });

  const [tftForm, setTftForm] = useState({
    templatename: "",
    displayName: "",
    description: "",
    msg: "",
    footer: "",
    lang: "en",
    category: "MARKETING",
    temptype: "standard",
    dvariables: "",
    lcap: "",
    lnk: "",
    cbtncap: "",
    callno: "",
  });
  const [quickReplyInput, setQuickReplyInput] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);

  const {
    data: templates = [],
    isLoading,
    isFetching,
  } = useGetWhatsappTemplatesQuery();

  const [createWhatsappTemplate, { isLoading: creatingLocal }] =
    useCreateWhatsappTemplateMutation();
  const [createWhatsappTemplateOnTft, { isLoading: creatingOnTft }] =
    useCreateWhatsappTemplateOnTftMutation();
  const [syncWhatsappTemplates, { isLoading: syncing }] =
    useSyncWhatsappTemplatesMutation();
  const [updateWhatsappTemplate, { isLoading: updating }] =
    useUpdateWhatsappTemplateMutation();
  const [deleteWhatsappTemplate, { isLoading: deleting }] =
    useDeleteWhatsappTemplateMutation();

  const {
    data: previewData,
    isFetching: previewLoading,
    refetch: refetchPreview,
  } = useGetWhatsappTemplatePreviewQuery(previewId ?? "", {
    skip: !previewId,
  });

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  const resetForm = () => {
    setForm({ name: "", tftTemplateName: "", description: "", category: "custom" });
    setEditingId(null);
  };

  const resetTftForm = () => {
    setTftForm({
      templatename: "",
      displayName: "",
      description: "",
      msg: "",
      footer: "",
      lang: "en",
      category: "MARKETING",
      temptype: "standard",
      dvariables: "",
      lcap: "",
      lnk: "",
      cbtncap: "",
      callno: "",
    });
    setQuickReplyInput("");
    setQuickReplies([]);
  };

  const filteredTemplates = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) =>
      [
        t.name,
        t.tftTemplateName,
        t.description,
        t.category,
        t.tftCategory,
        t.tftStatus,
        t.tftMessage,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q))
    );
  }, [templates, search]);

  const detectedVariables = useMemo(() => {
    if (!tftForm.msg) return [];
    const matches = tftForm.msg.match(/{{\s*\d+\s*}}/g) || [];
    const values = matches
      .map((m) => m.replace(/[{}]/g, "").trim())
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [tftForm.msg]);

  const handleEdit = (template: WhatsappTemplate) => {
    setForm({
      name: template.name || "",
      tftTemplateName: template.tftTemplateName || "",
      description: template.description || "",
      category: template.category || "custom",
    });
    setEditingId(template._id);
    setShowEditor(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.tftTemplateName.trim()) {
      setNotice({ type: "error", message: "Name and TFT Template Name are required." });
      return;
    }

    setNotice(null);
    try {
      if (editingId) {
        await updateWhatsappTemplate({
          id: editingId,
          name: form.name.trim(),
          tftTemplateName: form.tftTemplateName.trim(),
          description: form.description.trim(),
          category: form.category.trim() || "custom",
        }).unwrap();
        setNotice({ type: "success", message: "Template updated successfully." });
      } else {
        await createWhatsappTemplate({
          name: form.name.trim(),
          tftTemplateName: form.tftTemplateName.trim(),
          description: form.description.trim(),
          category: form.category.trim() || "custom",
        }).unwrap();
        setNotice({ type: "success", message: "Template added successfully." });
      }
      setShowEditor(false);
      resetForm();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Failed to save template.") });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this WhatsApp template?")) return;
    setNotice(null);
    try {
      await deleteWhatsappTemplate(id).unwrap();
      setNotice({ type: "success", message: "Template deleted successfully." });
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Delete failed.") });
    }
  };

  const handleToggleActive = async (template: WhatsappTemplate) => {
    setNotice(null);
    try {
      await updateWhatsappTemplate({
        id: template._id,
        isActive: !template.isActive,
      }).unwrap();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Failed to update status.") });
    }
  };

  const handleSync = async () => {
    setNotice(null);
    try {
      const result = await syncWhatsappTemplates().unwrap();
      setNotice({
        type: "success",
        message: `Sync complete: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`,
      });
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Sync failed.") });
    }
  };

  const handleCreateOnTft = async () => {
    const cleanName = sanitizeTemplateName(tftForm.templatename);
    if (!cleanName || !tftForm.msg.trim()) {
      setNotice({ type: "error", message: "Template name and message are required." });
      return;
    }

    setNotice(null);
    try {
      await createWhatsappTemplateOnTft({
        templatename: cleanName,
        temptype: tftForm.temptype || "standard",
        msg: tftForm.msg.trim(),
        lang: tftForm.lang.trim() || "en",
        category: tftForm.category || "MARKETING",
        footer: tftForm.footer.trim(),
        dvariables: tftForm.dvariables.trim(),
        lcap: tftForm.lcap.trim(),
        lnk: tftForm.lnk.trim(),
        cbtncap: tftForm.cbtncap.trim(),
        callno: tftForm.callno.trim(),
        qreply: quickReplies,
        displayName: tftForm.displayName.trim(),
        description: tftForm.description.trim(),
      }).unwrap();
      setNotice({
        type: "success",
        message: "Template submitted to TFT for approval.",
      });
      setShowCreateOnTft(false);
      resetTftForm();
    } catch (err) {
      setNotice({ type: "error", message: getErrorMessage(err, "Failed to create on TFT.") });
    }
  };

  const handlePreview = (template: WhatsappTemplate) => {
    setPreviewId(template._id);
    setPreviewTemplate(template);
  };

  const clearPreview = () => {
    setPreviewId(null);
    setPreviewTemplate(null);
  };

  const addQuickReply = () => {
    const value = quickReplyInput.trim();
    if (!value || quickReplies.includes(value)) return;
    setQuickReplies((prev) => [...prev, value]);
    setQuickReplyInput("");
  };

  const removeQuickReply = (value: string) => {
    setQuickReplies((prev) => prev.filter((item) => item !== value));
  };

  if (!permLoading && !canView("templates")) return <AccessDenied />;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-[#25D366]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {!canEdit("templates") && <ViewOnlyBanner />}
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <a
              href="/admin/templates"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500" />
            </a>
            <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-[#25D366]" />
              WhatsApp Templates
            </h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            Create, sync, and manage TFT WhatsApp templates for automated messaging
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin/templates"
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Mail className="w-4 h-4" />
            Email Templates
          </a>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-60"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Sync from TFT
          </button>
          <button
            onClick={() => {
              resetTftForm();
              setShowCreateOnTft(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create on TFT
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowEditor(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Existing
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
        <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-2">
          <Info className="w-3.5 h-3.5" />
          How WhatsApp Templates Work
        </p>
        <p className="text-xs text-green-600">
          Templates must be approved on the TFT/Meta platform. Use{" "}
          <span className="font-medium">Create on TFT</span> to submit new templates,
          or{" "}
          <span className="font-medium">Sync from TFT</span> to pull existing ones. You can
          link approved templates to automations in the{" "}
          <a href="/admin/whatsapp" className="underline font-medium">
            WhatsApp Automations
          </a>{" "}
          page.
        </p>
      </div>

      {notice && (
        <div
          className={`border rounded-xl p-3 mb-4 flex items-start gap-2 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Search + status */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="relative w-full md:max-w-sm">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates, status, or message..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
          />
        </div>
        <div className="text-xs text-gray-400 flex items-center gap-2">
          {isFetching && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isFetching ? "Refreshing templates..." : `${filteredTemplates.length} templates`}
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No WhatsApp templates found.</p>
          <p className="text-gray-400 text-xs mt-1">
            Create one on TFT or sync existing templates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const statusLabel =
              template.tftStatus ||
              (template.source === "manual" ? "LOCAL" : "UNKNOWN");
            const statusColor =
              STATUS_COLORS[statusLabel] || STATUS_COLORS.UNKNOWN;
            const categoryLabel =
              template.tftCategory || template.category || "custom";
            const categoryColor =
              CATEGORY_COLORS[categoryLabel.toLowerCase()] ||
              CATEGORY_COLORS.custom;

            return (
              <div
                key={template._id}
                className={`bg-white border rounded-xl p-5 hover:shadow-md transition-shadow ${
                  !template.isActive ? "opacity-70" : ""
                } ${template.isActive ? "border-gray-200" : "border-gray-300 border-dashed"}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#1a1a2e] truncate">
                      {template.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate mt-0.5 font-mono">
                      {template.tftTemplateName}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-2">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${categoryColor}`}
                    >
                      {categoryLabel}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 line-clamp-3">
                  {template.tftMessage ||
                    template.description ||
                    "No message preview available yet."}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-400 mb-4">
                  <span>Sent: {template.sentCount}</span>
                  {template.lastSentAt && <span>Last: {formatDate(template.lastSentAt)}</span>}
                  {template.lastSyncedAt && (
                    <span>Synced: {formatDate(template.lastSyncedAt)}</span>
                  )}
                  {template.source && (
                    <span className="uppercase tracking-wide">
                      {SOURCE_LABELS[template.source] || template.source}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button
                    onClick={() => handleToggleActive(template)}
                    className={`text-[10px] font-medium px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      template.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreview(template)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Preview"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete"
                      disabled={deleting}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Existing / Edit Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-[#1a1a2e]">
                {editingId ? "Edit" : "Add Existing"} WhatsApp Template
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

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Welcome Message"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  TFT Template Name
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <input
                  type="text"
                  value={form.tftTemplateName}
                  onChange={(e) => setForm({ ...form, tftTemplateName: e.target.value })}
                  placeholder="e.g. welcome_msg_v1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Must exactly match the template name on the TFT WhatsApp platform
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this template do?"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                >
                  {LOCAL_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowEditor(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={creatingLocal || updating || !form.name.trim() || !form.tftTemplateName.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-medium transition-colors disabled:opacity-70"
              >
                {(creatingLocal || updating) && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Update" : "Add"} Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create on TFT Modal */}
      {showCreateOnTft && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a2e]">Create Template on TFT</h2>
                <p className="text-xs text-gray-400">
                  Submit a new template for approval. TFT only allows lowercase letters, numbers, and underscores.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowCreateOnTft(false);
                  resetTftForm();
                }}
                className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    TFT Template Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    value={tftForm.templatename}
                    onChange={(e) => setTftForm({ ...tftForm, templatename: e.target.value })}
                    placeholder="welcome_msg_v1"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                  {tftForm.templatename && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Saved as: <span className="font-mono">{sanitizeTemplateName(tftForm.templatename)}</span>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Display Name
                  </label>
                  <input
                    value={tftForm.displayName}
                    onChange={(e) => setTftForm({ ...tftForm, displayName: e.target.value })}
                    placeholder="Welcome Message"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Category
                  </label>
                  <select
                    value={tftForm.category}
                    onChange={(e) => setTftForm({ ...tftForm, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  >
                    {TFT_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Language
                  </label>
                  <input
                    value={tftForm.lang}
                    onChange={(e) => setTftForm({ ...tftForm, lang: e.target.value })}
                    placeholder="en"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Template Type
                  </label>
                  <select
                    value={tftForm.temptype}
                    onChange={(e) => setTftForm({ ...tftForm, temptype: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  >
                    {TFT_TYPES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Message <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={tftForm.msg}
                  onChange={(e) => setTftForm({ ...tftForm, msg: e.target.value })}
                  placeholder="Hi {{1}}, welcome to BizCivitas! Your city is {{2}}."
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] resize-none"
                />
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 mt-2">
                  <span>Use variables like {"{{1}}"} and {"{{2}}"}.</span>
                  {detectedVariables.length > 0 && (
                    <span>Detected: {detectedVariables.join(", ")}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Footer
                  </label>
                  <input
                    value={tftForm.footer}
                    onChange={(e) => setTftForm({ ...tftForm, footer: e.target.value })}
                    placeholder="BizCivitas Team"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Dynamic Variables (comma separated)
                  </label>
                  <input
                    value={tftForm.dvariables}
                    onChange={(e) => setTftForm({ ...tftForm, dvariables: e.target.value })}
                    placeholder="John, Mumbai"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>
              </div>

              <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                <p className="text-xs font-medium text-gray-600">Quick Reply Buttons</p>
                <div className="flex flex-col gap-2 md:flex-row">
                  <input
                    value={quickReplyInput}
                    onChange={(e) => setQuickReplyInput(e.target.value)}
                    placeholder="Add quick reply"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                  <button
                    onClick={addQuickReply}
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800"
                  >
                    Add
                  </button>
                </div>
                {quickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply) => (
                      <button
                        key={reply}
                        onClick={() => removeQuickReply(reply)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
                        title="Remove"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-600">Link Button</p>
                  <input
                    value={tftForm.lcap}
                    onChange={(e) => setTftForm({ ...tftForm, lcap: e.target.value })}
                    placeholder="Button Caption"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                  <input
                    value={tftForm.lnk}
                    onChange={(e) => setTftForm({ ...tftForm, lnk: e.target.value })}
                    placeholder="https://your-link.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>

                <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-medium text-gray-600">Call Button</p>
                  <input
                    value={tftForm.cbtncap}
                    onChange={(e) => setTftForm({ ...tftForm, cbtncap: e.target.value })}
                    placeholder="Call Now"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                  <input
                    value={tftForm.callno}
                    onChange={(e) => setTftForm({ ...tftForm, callno: e.target.value })}
                    placeholder="919999999999"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Description (internal)
                </label>
                <textarea
                  value={tftForm.description}
                  onChange={(e) => setTftForm({ ...tftForm, description: e.target.value })}
                  placeholder="Optional internal notes"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#25D366] resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowCreateOnTft(false);
                  resetTftForm();
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOnTft}
                disabled={creatingOnTft}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] hover:bg-[#1da851] text-white text-sm font-medium transition-colors disabled:opacity-70"
              >
                {creatingOnTft && <Loader2 className="w-4 h-4 animate-spin" />}
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewId && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-[#1a1a2e]">Template Preview</h2>
                <p className="text-xs text-gray-400 font-mono">
                  {previewTemplate.tftTemplateName}
                </p>
              </div>
              <button onClick={clearPreview} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                {previewTemplate.tftStatus && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[previewTemplate.tftStatus] || STATUS_COLORS.UNKNOWN
                    }`}
                  >
                    {previewTemplate.tftStatus}
                  </span>
                )}
                {(previewTemplate.tftCategory || previewTemplate.category) && (
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      CATEGORY_COLORS[
                        (previewTemplate.tftCategory || previewTemplate.category || "custom").toLowerCase()
                      ] || CATEGORY_COLORS.custom
                    }`}
                  >
                    {previewTemplate.tftCategory || previewTemplate.category}
                  </span>
                )}
                {previewTemplate.tftTemplateType && (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {previewTemplate.tftTemplateType}
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Message</p>
                <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-line">
                  {previewTemplate.tftMessage || "No message available yet."}
                </div>
              </div>

              {(previewTemplate.tftFooter ||
                previewTemplate.tftQuickReply ||
                previewTemplate.tftLink ||
                previewTemplate.tftCallNumber) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-600">
                  {previewTemplate.tftFooter && (
                    <div className="bg-white border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-500 mb-1">Footer</p>
                      <p>{previewTemplate.tftFooter}</p>
                    </div>
                  )}
                  {previewTemplate.tftQuickReply && (
                    <div className="bg-white border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-500 mb-1">Quick Replies</p>
                      <p>{previewTemplate.tftQuickReply}</p>
                    </div>
                  )}
                  {previewTemplate.tftLink && (
                    <div className="bg-white border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-500 mb-1">Link Button</p>
                      <p>{previewTemplate.tftLinkCaption || "Visit"}</p>
                      <p className="text-[11px] text-gray-400">{previewTemplate.tftLink}</p>
                    </div>
                  )}
                  {previewTemplate.tftCallNumber && (
                    <div className="bg-white border border-gray-100 rounded-lg p-3">
                      <p className="font-medium text-gray-500 mb-1">Call Button</p>
                      <p>{previewTemplate.tftCallCaption || "Call"}</p>
                      <p className="text-[11px] text-gray-400">{previewTemplate.tftCallNumber}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">Raw Preview Payload</p>
                  <button
                    onClick={() => refetchPreview()}
                    className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    disabled={previewLoading}
                  >
                    {previewLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    Refresh
                  </button>
                </div>
                <pre className="text-[11px] text-gray-600 whitespace-pre-wrap break-words">
                  {previewLoading
                    ? "Loading preview..."
                    : JSON.stringify(previewData ?? {}, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={clearPreview}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

