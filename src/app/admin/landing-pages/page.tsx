"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Plus, Pencil, Trash2, Loader2, X, Globe, Layers,
  ExternalLink, ChevronDown, Code2, Upload, Github,
  Eye, Check, RefreshCw, ArrowLeft,
} from "lucide-react";
import {
  useGetLandingPagesQuery,
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
  useDeleteLandingPageMutation,
  type LandingPage,
  type LandingPageType,
  type LandingPageStatus,
  type PopupTrigger,
  type BuildMethod,
} from "@/store/endpoints/landingPages";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { API_BASE_URL } from "@/lib/api";

const CodeEditorPane = dynamic(() => import("./CodeEditorPane"), { ssr: false, loading: () => <BuilderLoading /> });

function BuilderLoading() {
  return (
    <div className="flex items-center justify-center bg-gray-900 rounded-lg" style={{ height: "calc(100vh - 260px)" }}>
      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
    </div>
  );
}

const toSlug = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const STATUS_LABELS: Record<LandingPageStatus, { label: string; cls: string; dot: string }> = {
  draft:     { label: "Draft",     cls: "bg-gray-100 text-gray-600",   dot: "bg-gray-400"  },
  published: { label: "Published", cls: "bg-green-50 text-green-700",  dot: "bg-green-500" },
};

const BUILD_METHODS: { key: BuildMethod; label: string; icon: React.ElementType; description: string }[] = [
  { key: "code",   label: "Code Editor",  icon: Code2,   description: "Write HTML/CSS directly" },
  { key: "upload", label: "Upload ZIP",   icon: Upload,  description: "Upload a pre-built ZIP file" },
  { key: "github", label: "GitHub Repo",  icon: Github,  description: "Pull from a GitHub repository" },
];

interface FormState {
  title: string;
  slug: string;
  status: LandingPageStatus;
  description: string;
  subdomain: string;
  // code/visual
  content: string;
  cssContent: string;
  // popup
  triggerType: PopupTrigger;
  triggerValue: string;
  successMessage: string;
  redirectUrl: string;
  // github
  githubRepo: string;
  githubBranch: string;
}

const EMPTY_FORM: FormState = {
  title: "", slug: "", status: "draft", description: "", subdomain: "",
  content: "", cssContent: "",
  triggerType: "time", triggerValue: "5",
  successMessage: "Thank you! We'll be in touch shortly.",
  redirectUrl: "",
  githubRepo: "", githubBranch: "main",
};

type ActiveTab = "page" | "popup";
type EditorView = "list" | "builder";

export default function LandingPagesPage() {
  const { canView, canEdit } = useAdminPermissions();

  // All hooks first — no early return before this
  const [activeTab, setActiveTab]       = useState<ActiveTab>("page");
  const [view, setView]                 = useState<EditorView>("list");
  const [editingItem, setEditingItem]   = useState<LandingPage | null>(null);
  const [buildMethod, setBuildMethod]   = useState<BuildMethod>("code");
  const [form, setForm]                 = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");
  const [successMsg, setSuccessMsg]     = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [slugManual, setSlugManual]     = useState(false);
  // Upload state
  const [zipFile, setZipFile]           = useState<File | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadDone, setUploadDone]     = useState(false);
  const [pulling, setPulling]           = useState(false);
  const [pullDone, setPullDone]         = useState(false);
  const [dragOver, setDragOver]         = useState(false);
  const fileInputRef                    = useRef<HTMLInputElement>(null);

  const { data: allItems = [], isLoading, refetch } = useGetLandingPagesQuery();
  const [createItem] = useCreateLandingPageMutation();
  const [updateItem] = useUpdateLandingPageMutation();
  const [deleteItem] = useDeleteLandingPageMutation();

  // Slug auto-generation
  useEffect(() => {
    if (!slugManual && form.title) {
      setForm((f) => ({ ...f, slug: toSlug(f.title) }));
    }
  }, [form.title, slugManual]);

  // Permission guard after all hooks
  if (!canView("landing_pages")) return <AccessDenied />;

  const items = allItems.filter((i) => i.type === activeTab);

  const openCreate = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setBuildMethod("code");
    setSlugManual(false);
    setError(""); setSuccessMsg("");
    setZipFile(null); setUploadDone(false); setPullDone(false);
    setView("builder");
  };

  const openEdit = (item: LandingPage) => {
    setEditingItem(item);
    setForm({
      title:          item.title,
      slug:           item.slug,
      status:         item.status,
      description:    item.description ?? "",
      subdomain:      item.subdomain ?? "",
      content:        item.content ?? "",
      cssContent:     "",
      triggerType:    item.settings?.triggerType ?? "time",
      triggerValue:   String(item.settings?.triggerValue ?? 5),
      successMessage: item.settings?.successMessage ?? "Thank you! We'll be in touch shortly.",
      redirectUrl:    item.settings?.redirectUrl ?? "",
      githubRepo:     item.githubRepo ?? "",
      githubBranch:   item.githubBranch ?? "main",
    });
    setBuildMethod(item.buildMethod ?? "code");
    setSlugManual(true);
    setError(""); setSuccessMsg("");
    setZipFile(null); setUploadDone(!!item.staticPath); setPullDone(!!item.staticPath);
    setView("builder");
  };

  const handleSave = async () => {
    setError(""); setSuccessMsg("");
    if (!form.title.trim()) { setError("Title is required."); return; }
    if (!form.slug.trim())  { setError("Slug is required."); return; }

    // For upload/github methods, the static file must already be uploaded
    if (buildMethod === "upload" && !uploadDone && !editingItem?.staticPath) {
      setError("Please upload a ZIP file first."); return;
    }

    setSaving(true);
    try {
      const settings = {
        ...(activeTab === "popup" && {
          triggerType:  form.triggerType,
          triggerValue: Number(form.triggerValue) || 0,
        }),
        successMessage: form.successMessage || undefined,
        redirectUrl:    form.redirectUrl || undefined,
      };

      const payload = {
        title:        form.title.trim(),
        slug:         form.slug.trim(),
        type:         activeTab,
        status:       form.status,
        description:  form.description || undefined,
        content:      buildMethod === "code" ? form.content : undefined,
        settings,
        buildMethod,
        subdomain:    form.subdomain.trim() || undefined,
        githubRepo:   form.githubRepo || undefined,
        githubBranch: form.githubBranch || "main",
      };

      if (editingItem) {
        await updateItem({ id: editingItem._id, ...payload }).unwrap();
      } else {
        await createItem(payload).unwrap();
      }
      setSuccessMsg("Saved successfully!");
      refetch();
      setTimeout(() => setView("list"), 800);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setError(msg || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
    setDeleteConfirm(null);
  };

  const handleZipUpload = async () => {
    if (!zipFile || !editingItem) return;
    setUploading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("zip", zipFile);
      const res = await fetch(`${API_BASE_URL}/pm/landing-pages/${editingItem._id}/upload-zip`, {
        method: "POST", body: fd,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setUploadDone(true);
      setSuccessMsg("ZIP uploaded and extracted!");
      refetch();
    } catch (e: unknown) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleGithubPull = async () => {
    if (!editingItem || !form.githubRepo) { setError("Enter a GitHub repo URL first."); return; }
    setPulling(true); setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/pm/landing-pages/${editingItem._id}/pull-github`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepo: form.githubRepo, githubBranch: form.githubBranch }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      setPullDone(true);
      setSuccessMsg("Repository pulled successfully!");
      refetch();
    } catch (e: unknown) {
      setError((e as Error).message || "Pull failed.");
    } finally {
      setPulling(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const METHOD_ICON: Record<BuildMethod, React.ElementType> = {
    visual: Code2,
    code:   Code2,
    upload: Upload,
    github: Github,
  };

  /* ─── BUILDER VIEW ─── */
  if (view === "builder") {
    return (
      <div className="flex flex-col h-screen bg-[#f5f5f5]">
        {/* Builder Top Bar */}
        <div className="bg-[#1a1a2e] text-white px-4 py-3 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setView("list")}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-gray-600">|</span>
            <span className="text-sm font-medium truncate">
              {editingItem ? `Edit: ${editingItem.title}` : `New ${activeTab === "page" ? "Landing Page" : "Popup"}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Status */}
            {(["draft", "published"] as LandingPageStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                  form.status === s
                    ? s === "published" ? "bg-green-500 text-white border-green-500" : "bg-gray-600 text-white border-gray-600"
                    : "bg-transparent text-gray-400 border-gray-600 hover:border-gray-400"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}

            {editingItem && form.status === "published" && (
              <a
                href={`/${activeTab === "page" ? "lp" : "popup"}/${form.slug}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-400 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" /> Preview
              </a>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-70 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left sidebar — meta fields */}
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
            <div className="px-4 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Page title"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Slug *</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#f97316]">
                  <span className="px-2 py-2 bg-gray-50 text-gray-400 text-xs border-r border-gray-300">/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => { setSlugManual(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })); }}
                    placeholder="my-page"
                    className="flex-1 px-2 py-2 text-xs outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Short description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subdomain</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:border-[#f97316]">
                  <input
                    type="text"
                    value={form.subdomain}
                    onChange={(e) => setForm((f) => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    placeholder="e.g. membership"
                    className="flex-1 px-3 py-2 text-xs outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">e.g. membership.yourdomain.com</p>
              </div>

              {/* Popup trigger settings */}
              {activeTab === "popup" && (
                <div className="border border-orange-100 bg-orange-50 rounded-xl p-3 space-y-3">
                  <p className="text-xs font-semibold text-[#1a1a2e]">Popup Trigger</p>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Trigger Type</label>
                    <select
                      value={form.triggerType}
                      onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value as PopupTrigger }))}
                      className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-[#f97316]"
                    >
                      <option value="time">Time Delay</option>
                      <option value="scroll">Scroll Depth</option>
                      <option value="exit_intent">Exit Intent</option>
                    </select>
                  </div>
                  {form.triggerType !== "exit_intent" && (
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-1">
                        {form.triggerType === "time" ? "Delay (seconds)" : "Scroll (%)"}
                      </label>
                      <input
                        type="number" min="0"
                        max={form.triggerType === "scroll" ? "100" : "300"}
                        value={form.triggerValue}
                        onChange={(e) => setForm((f) => ({ ...f, triggerValue: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#f97316]"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Success Message</label>
                    <input
                      type="text" value={form.successMessage}
                      onChange={(e) => setForm((f) => ({ ...f, successMessage: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#f97316]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-gray-600 mb-1">Redirect URL</label>
                    <input
                      type="text" value={form.redirectUrl}
                      onChange={(e) => setForm((f) => ({ ...f, redirectUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#f97316]"
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>
              )}
              {successMsg && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-xs px-3 py-2 rounded-lg">{successMsg}</div>
              )}
            </div>
          </div>

          {/* Main builder area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Build method tabs */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-1">
              {BUILD_METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setBuildMethod(m.key)}
                    title={m.description}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      buildMethod === m.key
                        ? "bg-[#1a1a2e] text-white"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Builder panels */}
            <div className="flex-1 overflow-auto p-4">
              {buildMethod === "code" && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">HTML</label>
                    <CodeEditorPane
                      value={form.content}
                      onChange={(v) => setForm((f) => ({ ...f, content: v }))}
                      language="html"
                    />
                  </div>
                </div>
              )}

              {buildMethod === "upload" && (
                <div className="max-w-xl mx-auto mt-6 space-y-4">
                  {/* Requirements notice */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
                    <p className="font-semibold">ZIP requirements</p>
                    <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                      <li>Must contain an <code className="bg-blue-100 px-1 rounded">index.html</code> (at root, or inside <code className="bg-blue-100 px-1 rounded">dist/</code>, <code className="bg-blue-100 px-1 rounded">build/</code>, or <code className="bg-blue-100 px-1 rounded">out/</code>)</li>
                      <li>Must be a <strong>pre-built</strong> static site — HTML, CSS, JS files only</li>
                      <li>Max 50 MB upload · 200 MB extracted</li>
                    </ul>
                    <p className="text-red-600 font-medium mt-1">✗ Do not upload React/Vue/Next.js source code — build it first locally then ZIP the output folder</p>
                  </div>

                  <div
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault(); setDragOver(false);
                      const f = e.dataTransfer.files[0];
                      if (!f) return;
                      if (!f.name.endsWith(".zip")) {
                        setError("Only .zip files are supported. Please upload a ZIP file.");
                        return;
                      }
                      setError("");
                      setZipFile(f); setUploadDone(false);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
                      dragOver ? "border-[#f97316] bg-orange-50" : "border-gray-300 hover:border-gray-400 bg-white"
                    }`}
                  >
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm font-medium text-gray-700">
                      {zipFile ? zipFile.name : "Drop your ZIP file here"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse · .zip files only</p>
                  </div>
                  <input
                    ref={fileInputRef} type="file" accept=".zip,application/zip" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (!f.name.endsWith(".zip")) {
                        setError("Only .zip files are supported.");
                        return;
                      }
                      setError("");
                      setZipFile(f); setUploadDone(false);
                    }}
                  />

                  {!editingItem && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-3 rounded-lg">
                      Save the page first with basic details, then come back to upload the ZIP.
                    </div>
                  )}

                  {editingItem && (
                    <button
                      onClick={handleZipUpload}
                      disabled={!zipFile || uploading}
                      className="w-full flex items-center justify-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {uploading ? "Uploading…" : uploadDone ? "Re-upload ZIP" : "Upload ZIP"}
                    </button>
                  )}

                  {uploadDone && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                      <Check className="w-4 h-4 shrink-0" />
                      ZIP uploaded and deployed at <code className="font-mono text-xs">/lp/{form.slug}/</code>
                    </div>
                  )}
                </div>
              )}

              {buildMethod === "github" && (
                <div className="max-w-xl mx-auto mt-6 space-y-4">
                  <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Github className="w-5 h-5 text-gray-700" />
                      <h3 className="font-semibold text-gray-800">GitHub Repository</h3>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Repository URL *</label>
                      <input
                        type="text"
                        value={form.githubRepo}
                        onChange={(e) => setForm((f) => ({ ...f, githubRepo: e.target.value }))}
                        placeholder="https://github.com/username/repo.git"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f97316] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Branch</label>
                      <input
                        type="text"
                        value={form.githubBranch}
                        onChange={(e) => setForm((f) => ({ ...f, githubBranch: e.target.value }))}
                        placeholder="main"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#f97316]"
                      />
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
                      <p className="font-semibold">Repo requirements</p>
                      <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                        <li>Must have <code className="bg-blue-100 px-1 rounded">index.html</code> at root, or inside <code className="bg-blue-100 px-1 rounded">dist/</code>, <code className="bg-blue-100 px-1 rounded">build/</code>, <code className="bg-blue-100 px-1 rounded">out/</code>, or <code className="bg-blue-100 px-1 rounded">_site/</code></li>
                        <li>Must be a <strong>pre-built static site</strong> — HTML, CSS, JS only</li>
                      </ul>
                      <p className="text-red-600 font-medium mt-1">✗ Source code repos (React, Vue, Next.js) are not supported — push your built output to a separate branch or use ZIP upload</p>
                    </div>
                  </div>

                  {!editingItem && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-3 rounded-lg">
                      Save the page first, then pull the GitHub repo.
                    </div>
                  )}

                  {editingItem && (
                    <button
                      onClick={handleGithubPull}
                      disabled={pulling || !form.githubRepo}
                      className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {pulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                      {pulling ? "Pulling…" : pullDone ? "Re-pull Repo" : "Clone & Deploy"}
                    </button>
                  )}

                  {pullDone && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
                      <Check className="w-4 h-4 shrink-0" />
                      Deployed from GitHub at <code className="font-mono text-xs">/lp/{form.slug}/</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ─── LIST VIEW ─── */
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Landing Pages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build, manage and publish landing pages and popups</p>
        </div>
        {canEdit("landing_pages") && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create {activeTab === "page" ? "Page" : "Popup"}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {(["page", "popup"] as ActiveTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab ? "bg-white text-[#1a1a2e] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "page" ? <Globe className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
            {tab === "page" ? "Pages" : "Popups"}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeTab === tab ? "bg-orange-100 text-[#f97316]" : "bg-gray-200 text-gray-500"
            }`}>
              {allItems.filter((i) => i.type === tab).length}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              {activeTab === "page" ? <Globe className="w-5 h-5 text-gray-400" /> : <Layers className="w-5 h-5 text-gray-400" />}
            </div>
            <p className="text-gray-500 text-sm">No {activeTab === "page" ? "landing pages" : "popups"} yet.</p>
            {canEdit("landing_pages") && (
              <button onClick={openCreate} className="mt-3 text-sm text-[#f97316] hover:underline cursor-pointer">
                Create your first {activeTab === "page" ? "page" : "popup"}
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Title</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Slug</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Build Method</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Subdomain</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Updated</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item) => {
                const MethodIcon = METHOD_ICON[item.buildMethod ?? "code"];
                return (
                  <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-[#1a1a2e]">{item.title}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        /{item.slug}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                        <MethodIcon className="w-3.5 h-3.5" />
                        {BUILD_METHODS.find((m) => m.key === (item.buildMethod ?? "code"))?.label ?? "Code"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500 font-mono">
                      {item.subdomain ? `${item.subdomain}.yourdomain.com` : "—"}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_LABELS[item.status].cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_LABELS[item.status].dot}`} />
                        {STATUS_LABELS[item.status].label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{formatDate(item.updatedAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {item.status === "published" && (
                          <a
                            href={`/${item.type === "page" ? "lp" : "popup"}/${item.slug}`}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                            title="Preview"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        {canEdit("landing_pages") && (
                          <>
                            <button
                              onClick={() => openEdit(item)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#f97316] hover:bg-orange-50 transition-colors cursor-pointer"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(item._id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Delete {activeTab === "page" ? "Page" : "Popup"}?</h2>
            <p className="text-sm text-gray-500 mb-5">This action cannot be undone. Any deployed static files will also be removed.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
