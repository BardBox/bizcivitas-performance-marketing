"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  Mail,
  CreditCard,
  Send,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Plus,
  Plug,
  Trash2,
  X,
  ArrowRight,
  Info,
  HelpCircle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ViewOnlyBanner } from "@/components/admin/ViewOnlyBanner";

// ── Types ──

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  envVars: string[];
  configured: boolean;
  docs: string;
  usedIn: string[];
}

interface TestResult {
  connected: boolean;
  error?: string;
  [key: string]: unknown;
}

interface Plugin {
  _id: string;
  name: string;
  slug: string;
  description: string;
  baseUrl: string;
  authType: string;
  icon: string;
  color: string;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  endpoints: { _id: string; name: string; method: string; path: string }[];
  createdAt: string;
}

// ── Integration-specific config ──

const integrationConfig: Record<
  string,
  { icon: React.ElementType; bg: string; text: string }
> = {
  mailerlite: { icon: Mail, bg: "bg-green-50", text: "text-green-700" },
  gmail_smtp: { icon: Send, bg: "bg-red-50", text: "text-red-700" },
  razorpay: { icon: CreditCard, bg: "bg-blue-50", text: "text-blue-700" },
};

const AUTH_TYPES = [
  { value: "none", label: "No Auth" },
  { value: "bearer", label: "Bearer Token" },
  { value: "api_key_header", label: "API Key (Header)" },
  { value: "basic", label: "Basic Auth (user:pass)" },
];

const ICON_OPTIONS = [
  "Plug", "Zap", "Globe", "Server", "Database", "Cloud",
  "Mail", "MessageSquare", "CreditCard", "BarChart", "Shield", "Bot",
];

const COLOR_OPTIONS = [
  "#6366f1", "#f97316", "#22c55e", "#3b82f6", "#ef4444",
  "#a855f7", "#14b8a6", "#f59e0b", "#ec4899", "#64748b",
];

export default function ApiIntegrationsPage() {
  const { canView, canEdit, loading: permLoading } = useAdminPermissions();
  const router = useRouter();

  // Built-in integrations
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(true);
  const [testingAll, setTestingAll] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Plugins
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [pluginsLoading, setPluginsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [pluginTestingSlug, setPluginTestingSlug] = useState<string | null>(null);
  const [pluginTestResults, setPluginTestResults] = useState<Record<string, { connected: boolean; error?: string }>>({});

  // Add form
  const [form, setForm] = useState({
    name: "",
    description: "",
    baseUrl: "",
    authType: "none",
    authValue: "",
    authHeaderName: "X-API-Key",
    icon: "Plug",
    color: "#6366f1",
  });
  const [creating, setCreating] = useState(false);
  const [showAbout, setShowAbout] = useState(true);

  // ── Fetch built-in integrations ──

  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-integrations`);
      const data = await res.json();
      if (data.success) setIntegrations(data.data);
    } catch (err) {
      console.error("Failed to fetch integrations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch plugins ──

  const fetchPlugins = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins`);
      const data = await res.json();
      if (data.success) setPlugins(data.data);
    } catch (err) {
      console.error("Failed to fetch plugins:", err);
    } finally {
      setPluginsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
    fetchPlugins();
  }, [fetchIntegrations, fetchPlugins]);

  // ── Built-in actions ──

  const testSingle = async (id: string) => {
    setTestingId(id);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-integrations/${id}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) setTestResults((prev) => ({ ...prev, [id]: data.data }));
    } catch {
      setTestResults((prev) => ({ ...prev, [id]: { connected: false, error: "Network error" } }));
    } finally {
      setTestingId(null);
    }
  };

  const testAll = async () => {
    setTestingAll(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-integrations/test-all`, { method: "POST" });
      const data = await res.json();
      if (data.success) setTestResults(data.data);
    } catch (err) {
      console.error("Failed to test all:", err);
    } finally {
      setTestingAll(false);
    }
  };

  // ── Plugin actions ──

  const createPlugin = async () => {
    if (!form.name.trim() || !form.baseUrl.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setPlugins((prev) => [data.data, ...prev]);
        setShowAddModal(false);
        setForm({ name: "", description: "", baseUrl: "", authType: "none", authValue: "", authHeaderName: "X-API-Key", icon: "Plug", color: "#6366f1" });
      }
    } catch (err) {
      console.error("Failed to create plugin:", err);
    } finally {
      setCreating(false);
    }
  };

  const deletePlugin = async (slug: string) => {
    setDeletingSlug(slug);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPlugins((prev) => prev.filter((p) => p.slug !== slug));
      }
    } catch (err) {
      console.error("Failed to delete plugin:", err);
    } finally {
      setDeletingSlug(null);
    }
  };

  const testPlugin = async (slug: string) => {
    setPluginTestingSlug(slug);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) setPluginTestResults((prev) => ({ ...prev, [slug]: data.data }));
    } catch {
      setPluginTestResults((prev) => ({ ...prev, [slug]: { connected: false, error: "Network error" } }));
    } finally {
      setPluginTestingSlug(null);
    }
  };

  const configuredCount = integrations.filter((i) => i.configured).length;

  if (!permLoading && !canView("api")) return <AccessDenied />;

  if (loading && pluginsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {!canEdit("api") && <ViewOnlyBanner />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-6 h-6 text-orange-500" />
            API Integrations
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Built-in services &amp; custom API plugins for Performance Marketing
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAbout(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors cursor-pointer border border-indigo-200"
          >
            <Info className="w-4 h-4" />
            About
          </button>
          <button
            onClick={testAll}
            disabled={testingAll}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {testingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {testingAll ? "Testing..." : "Test Built-in"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add API Plugin
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{integrations.length}</p>
              <p className="text-xs text-gray-500">Built-in APIs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Plug className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{plugins.length}</p>
              <p className="text-xs text-gray-500">Custom Plugins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {configuredCount + plugins.filter((p) => p.isActive).length}
              </p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── About Modal ── */}
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Info className="w-4.5 h-4.5 text-indigo-600" />
                </div>
                About API Integrations
              </h2>
              <button onClick={() => setShowAbout(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {/* Intro */}
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Manage all API connections for Performance Marketing — both built-in services and custom plugins you add.
              </p>

              {/* Built-in vs Custom cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 p-4 border border-emerald-200/60">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-emerald-900">Built-in Services</h4>
                  </div>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Pre-configured integrations (<span className="font-medium">MailerLite</span>, <span className="font-medium">Gmail SMTP</span>, <span className="font-medium">Razorpay</span>) set up via environment variables in your <code className="bg-emerald-200/60 px-1.5 py-0.5 rounded font-mono text-[11px] text-emerald-900">.env</code> file. Click the <span className="font-medium">expand arrow</span> on each service to view required env vars.
                  </p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-purple-50 to-violet-50 p-4 border border-purple-200/60">
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                      <Plug className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-sm font-bold text-purple-900">Custom API Plugins</h4>
                  </div>
                  <p className="text-xs text-purple-800 leading-relaxed">
                    Connect any external REST API (<span className="font-medium">analytics</span>, <span className="font-medium">CRM</span>, <span className="font-medium">ad platforms</span>, etc.) by clicking <span className="inline-flex items-center gap-1 bg-purple-200/50 px-1.5 py-0.5 rounded text-[11px] font-semibold text-purple-900">+ Add API Plugin</span>. You&apos;ll need the base URL and auth credentials.
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-100" />

              {/* How to add a plugin */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-orange-600" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900">How to Add a Custom Plugin</h4>
                </div>

                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-900">Plugin Name &amp; Description</span>
                      <br />
                      Give it a recognizable name (e.g. <span className="text-indigo-600 font-medium">&quot;Google Analytics&quot;</span>, <span className="text-indigo-600 font-medium">&quot;HubSpot CRM&quot;</span>) and a short note about what it does.
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-900">Base URL</span>
                      <br />
                      The root URL of the API. Find this in the provider&apos;s docs under &quot;Getting Started&quot; or &quot;API Reference&quot;.
                      <br />
                      <span className="text-gray-500">Example:</span> <code className="bg-indigo-100 px-1.5 py-0.5 rounded font-mono text-[11px] text-indigo-700">https://api.hubspot.com/v3</code>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-900">Authentication</span>
                      <br />
                      Choose how the API verifies your identity. Check the provider&apos;s docs:
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="flex items-center gap-2 bg-white rounded-md px-2.5 py-1.5 border border-gray-200">
                          <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                          <span><span className="font-semibold text-gray-800">No Auth</span> <span className="text-gray-500">— Public APIs</span></span>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-md px-2.5 py-1.5 border border-gray-200">
                          <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          <span><span className="font-semibold text-gray-800">Bearer Token</span> <span className="text-gray-500">— From API Keys page</span></span>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-md px-2.5 py-1.5 border border-gray-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                          <span><span className="font-semibold text-gray-800">API Key</span> <span className="text-gray-500">— Custom header (e.g. <code className="font-mono text-[10px]">X-API-Key</code>)</span></span>
                        </div>
                        <div className="flex items-center gap-2 bg-white rounded-md px-2.5 py-1.5 border border-gray-200">
                          <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                          <span><span className="font-semibold text-gray-800">Basic Auth</span> <span className="text-gray-500">— <code className="font-mono text-[10px]">user:password</code></span></span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                    <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      <span className="font-bold text-gray-900">Test Connection</span>
                      <br />
                      After adding, click <span className="inline-flex items-center bg-gray-200 px-1.5 py-0.5 rounded text-[11px] font-semibold text-gray-800">Test</span> to verify the API is reachable and credentials are valid.
                    </div>
                  </div>
                </div>
              </div>

              {/* Credentials tip */}
              <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 px-4 py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="text-xs text-amber-900 leading-relaxed">
                  <span className="font-bold text-amber-950">Where to find API credentials?</span>
                  <br />
                  Log in to the API provider&apos;s website → go to <span className="font-semibold bg-amber-200/50 px-1 py-0.5 rounded">Settings</span> / <span className="font-semibold bg-amber-200/50 px-1 py-0.5 rounded">Developer</span> / <span className="font-semibold bg-amber-200/50 px-1 py-0.5 rounded">API</span> section → copy your API key, token, or credentials.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white flex items-center justify-end px-6 py-4 border-t border-gray-200 rounded-b-2xl">
              <button
                onClick={() => setShowAbout(false)}
                className="px-5 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] transition-colors cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Built-in Integrations ── */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Built-in Services
      </h2>
      <div className="space-y-3 mb-10">
        {integrations.map((integration) => {
          const config = integrationConfig[integration.id] || { icon: Zap, bg: "bg-gray-50", text: "text-gray-700" };
          const Icon = config.icon;
          const result = testResults[integration.id];
          const isTesting = testingId === integration.id;
          const isExpanded = expandedId === integration.id;

          return (
            <div key={integration.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm">
              <div className="flex items-center gap-4 p-4">
                <div className={`w-11 h-11 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${config.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm">{integration.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
                      {integration.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{integration.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {integration.configured ? (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Configured</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">Not Set</span>
                    </span>
                  )}
                  {result && (
                    result.connected ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                        <XCircle className="w-3 h-3" />Failed
                      </span>
                    )
                  )}
                  <button onClick={() => testSingle(integration.id)} disabled={isTesting || testingAll} className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer">
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
                  </button>
                  <button onClick={() => setExpandedId(isExpanded ? null : integration.id)} className="p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Environment Variables</h4>
                      <div className="space-y-1.5">
                        {integration.envVars.map((v) => (
                          <div key={v} className="text-xs">
                            <code className="bg-gray-100 px-2 py-1 rounded text-gray-700 font-mono">{v}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Used In</h4>
                      <div className="space-y-1">
                        {integration.usedIn.map((u) => (
                          <div key={u} className="flex items-center gap-1.5 text-xs text-gray-700">
                            <span className="w-1 h-1 rounded-full bg-gray-400" />{u}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Connection Details</h4>
                      {result ? (
                        <div className="space-y-1.5">
                          {Object.entries(result).filter(([k]) => k !== "connected" && k !== "id").map(([key, value]) => (
                            <div key={key} className="flex items-start gap-2 text-xs">
                              <span className="text-gray-500 min-w-[60px]">{key}:</span>
                              <span className="text-gray-900 break-all">{typeof value === "object" ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Click &quot;Test&quot; to check connectivity</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <a href={integration.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700">
                      <ExternalLink className="w-3.5 h-3.5" />View API Documentation
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Custom Plugins ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
          Custom API Plugins
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add Plugin
        </button>
      </div>

      {plugins.length === 0 && !pluginsLoading ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <Plug className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 mb-1">No custom API plugins yet</p>
          <p className="text-xs text-gray-400 mb-4">
            Connect external APIs like analytics, CRM, or any REST API
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Your First Plugin
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {plugins.map((plugin) => {
            const pResult = pluginTestResults[plugin.slug];
            const isTesting = pluginTestingSlug === plugin.slug;
            const isDeleting = deletingSlug === plugin.slug;

            return (
              <div key={plugin._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm">
                <div className="flex items-center gap-4 p-4">
                  {/* Color dot icon */}
                  <div
                    className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${plugin.color}15` }}
                  >
                    <Plug className="w-5 h-5" style={{ color: plugin.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 text-sm">{plugin.name}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-700">
                        Plugin
                      </span>
                      {!plugin.isActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {plugin.description || plugin.baseUrl}
                    </p>
                  </div>

                  {/* Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Test result */}
                    {pResult && (
                      pResult.connected ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" />Failed
                        </span>
                      )
                    )}
                    {!pResult && plugin.lastTestedAt && (
                      plugin.lastTestSuccess ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />Last OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3" />Last Failed
                        </span>
                      )
                    )}

                    <button
                      onClick={() => testPlugin(plugin.slug)}
                      disabled={isTesting}
                      className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
                    </button>

                    <button
                      onClick={() => router.push(`/admin/plugins/${plugin.slug}`)}
                      className="px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      Open <ArrowRight className="w-3 h-3" />
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Delete plugin "${plugin.name}"?`)) deletePlugin(plugin.slug);
                      }}
                      disabled={isDeleting}
                      className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-50 cursor-pointer"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Endpoints summary */}
                {plugin.endpoints.length > 0 && (
                  <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/50 flex items-center gap-2 text-xs text-gray-500">
                    <span>{plugin.endpoints.length} endpoint{plugin.endpoints.length > 1 ? "s" : ""}</span>
                    <span className="text-gray-300">|</span>
                    {plugin.endpoints.slice(0, 3).map((ep) => (
                      <span key={ep._id} className="inline-flex items-center gap-1">
                        <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-gray-200 text-gray-600">{ep.method}</span>
                        <span className="text-gray-600">{ep.path}</span>
                      </span>
                    ))}
                    {plugin.endpoints.length > 3 && <span>+{plugin.endpoints.length - 3} more</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Plugin Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Plug className="w-5 h-5 text-purple-600" />
                Connect API Plugin
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plugin Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Google Analytics, HubSpot CRM"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this API do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Base URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base URL *</label>
                <input
                  type="url"
                  value={form.baseUrl}
                  onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                  placeholder="https://api.example.com/v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Auth Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Authentication</label>
                <select
                  value={form.authType}
                  onChange={(e) => setForm({ ...form, authType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                >
                  {AUTH_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Auth Value */}
              {form.authType !== "none" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.authType === "bearer" && "Bearer Token"}
                    {form.authType === "api_key_header" && "API Key"}
                    {form.authType === "basic" && "Credentials (user:password)"}
                  </label>
                  <input
                    type="password"
                    value={form.authValue}
                    onChange={(e) => setForm({ ...form, authValue: e.target.value })}
                    placeholder={form.authType === "basic" ? "username:password" : "Your API key or token"}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Custom Header Name for API Key */}
              {form.authType === "api_key_header" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Header Name</label>
                  <input
                    type="text"
                    value={form.authHeaderName}
                    onChange={(e) => setForm({ ...form, authHeaderName: e.target.value })}
                    placeholder="X-API-Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Color + Icon */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-all ${
                          form.color === c ? "border-gray-900 scale-110" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {ICON_OPTIONS.map((ico) => (
                      <button
                        key={ico}
                        onClick={() => setForm({ ...form, icon: ico })}
                        className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer border transition-all ${
                          form.icon === ico
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                        }`}
                      >
                        {ico}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={createPlugin}
                disabled={creating || !form.name.trim() || !form.baseUrl.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Connect Plugin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
