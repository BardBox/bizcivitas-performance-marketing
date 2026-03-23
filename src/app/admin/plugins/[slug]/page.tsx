"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Play,
  Settings,
  Globe,
  Shield,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  Save,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface Endpoint {
  _id: string;
  name: string;
  method: string;
  path: string;
  description: string;
  sampleBody: string;
}

interface Plugin {
  _id: string;
  name: string;
  slug: string;
  description: string;
  baseUrl: string;
  authType: string;
  authValue: string;
  authHeaderName: string;
  customHeaders: Record<string, string>;
  endpoints: Endpoint[];
  icon: string;
  color: string;
  isActive: boolean;
  lastTestedAt: string | null;
  lastTestSuccess: boolean | null;
  createdAt: string;
  updatedAt: string;
}

interface ProxyResponse {
  status: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: unknown;
  error?: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PUT: "bg-amber-100 text-amber-700",
  PATCH: "bg-purple-100 text-purple-700",
  DELETE: "bg-red-100 text-red-700",
};

const AUTH_LABELS: Record<string, string> = {
  none: "No Auth",
  bearer: "Bearer Token",
  api_key_header: "API Key (Header)",
  basic: "Basic Auth",
};

export default function PluginDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Test connection
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ connected: boolean; status?: number; error?: string } | null>(null);

  // Settings editing
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    baseUrl: "",
    authType: "none",
    authValue: "",
    authHeaderName: "X-API-Key",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Add endpoint
  const [showAddEndpoint, setShowAddEndpoint] = useState(false);
  const [endpointForm, setEndpointForm] = useState({
    name: "",
    method: "GET",
    path: "/",
    description: "",
    sampleBody: "",
  });
  const [addingEndpoint, setAddingEndpoint] = useState(false);

  // API playground
  const [playgroundEndpoint, setPlaygroundEndpoint] = useState<Endpoint | null>(null);
  const [playMethod, setPlayMethod] = useState("GET");
  const [playPath, setPlayPath] = useState("/");
  const [playBody, setPlayBody] = useState("");
  const [executing, setExecuting] = useState(false);
  const [response, setResponse] = useState<ProxyResponse | null>(null);
  const [showResponseHeaders, setShowResponseHeaders] = useState(false);

  // Fetch plugin
  const fetchPlugin = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}`);
      const data = await res.json();
      if (data.success) {
        setPlugin(data.data);
        setSettingsForm({
          name: data.data.name,
          description: data.data.description,
          baseUrl: data.data.baseUrl,
          authType: data.data.authType,
          authValue: data.data.authValue || "",
          authHeaderName: data.data.authHeaderName || "X-API-Key",
          isActive: data.data.isActive,
        });
      } else {
        setError("Plugin not found");
      }
    } catch {
      setError("Failed to load plugin");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPlugin();
  }, [fetchPlugin]);

  // Test connection
  const handleTest = async () => {
    if (!plugin) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) setTestResult(data.data);
    } catch {
      setTestResult({ connected: false, error: "Network error" });
    } finally {
      setTesting(false);
    }
  };

  // Save settings
  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });
      const data = await res.json();
      if (data.success) {
        setPlugin(data.data);
        setShowSettings(false);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  // Add endpoint
  const handleAddEndpoint = async () => {
    if (!endpointForm.name.trim() || !endpointForm.path.trim()) return;
    setAddingEndpoint(true);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}/endpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(endpointForm),
      });
      const data = await res.json();
      if (data.success) {
        setPlugin(data.data);
        setShowAddEndpoint(false);
        setEndpointForm({ name: "", method: "GET", path: "/", description: "", sampleBody: "" });
      }
    } catch (err) {
      console.error("Failed to add endpoint:", err);
    } finally {
      setAddingEndpoint(false);
    }
  };

  // Remove endpoint
  const handleRemoveEndpoint = async (endpointId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}/endpoints/${endpointId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) setPlugin(data.data);
    } catch (err) {
      console.error("Failed to remove endpoint:", err);
    }
  };

  // Execute request (playground)
  const handleExecute = async () => {
    setExecuting(true);
    setResponse(null);
    try {
      const payload: { method: string; path: string; body?: string } = {
        method: playMethod,
        path: playPath,
      };
      if (playBody.trim() && ["POST", "PUT", "PATCH"].includes(playMethod)) {
        try {
          payload.body = JSON.parse(playBody);
        } catch {
          payload.body = playBody;
        }
      }
      const res = await fetch(`${API_BASE_URL}/pm/api-plugins/${slug}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) setResponse(data.data);
    } catch {
      setResponse({ status: 0, error: "Network error" });
    } finally {
      setExecuting(false);
    }
  };

  // Load endpoint into playground
  const loadEndpoint = (ep: Endpoint) => {
    setPlaygroundEndpoint(ep);
    setPlayMethod(ep.method);
    setPlayPath(ep.path);
    setPlayBody(ep.sampleBody || "");
    setResponse(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !plugin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-500 mb-4">{error || "Plugin not found"}</p>
        <button
          onClick={() => router.push("/admin/api-integrations")}
          className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to API Integrations
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button
          onClick={() => router.push("/admin/api-integrations")}
          className="mt-1 p-1.5 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${plugin.color}15` }}
        >
          <Globe className="w-6 h-6" style={{ color: plugin.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{plugin.name}</h1>
            {plugin.isActive ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Active
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{plugin.description || "No description"}</p>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{plugin.baseUrl}</span>
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> {AUTH_LABELS[plugin.authType] || plugin.authType}
            </span>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleTest}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Test
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              showSettings ? "bg-[#1a1a2e] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </button>
        </div>
      </div>

      {/* Test Result Banner */}
      {testResult && (
        <div className={`mb-6 p-3 rounded-lg text-sm flex items-center gap-2 ${
          testResult.connected ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
        }`}>
          {testResult.connected ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Connected successfully (Status: {testResult.status})
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4" />
              Connection failed: {testResult.error || `Status ${testResult.status}`}
            </>
          )}
          <button onClick={() => setTestResult(null)} className="ml-auto p-0.5 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4" /> Plugin Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                type="text"
                value={settingsForm.name}
                onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base URL</label>
              <input
                type="url"
                value={settingsForm.baseUrl}
                onChange={(e) => setSettingsForm({ ...settingsForm, baseUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input
                type="text"
                value={settingsForm.description}
                onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Auth Type</label>
              <select
                value={settingsForm.authType}
                onChange={(e) => setSettingsForm({ ...settingsForm, authType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="api_key_header">API Key (Header)</option>
                <option value="basic">Basic Auth</option>
              </select>
            </div>
            {settingsForm.authType !== "none" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {settingsForm.authType === "bearer" ? "Token" : settingsForm.authType === "basic" ? "user:password" : "API Key"}
                </label>
                <input
                  type="password"
                  value={settingsForm.authValue}
                  onChange={(e) => setSettingsForm({ ...settingsForm, authValue: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            {settingsForm.authType === "api_key_header" && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Header Name</label>
                <input
                  type="text"
                  value={settingsForm.authHeaderName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, authHeaderName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium text-gray-600">Active</label>
              <button
                onClick={() => setSettingsForm({ ...settingsForm, isActive: !settingsForm.isActive })}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                  settingsForm.isActive ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  settingsForm.isActive ? "translate-x-5" : ""
                }`} />
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-gray-100">
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Two-column: Endpoints + Playground */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Endpoints List (2 cols) */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Endpoints ({plugin.endpoints.length})
            </h2>
            <button
              onClick={() => setShowAddEndpoint(true)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>

          {plugin.endpoints.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-300 p-6 text-center">
              <Globe className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-xs text-gray-500 mb-3">No endpoints configured</p>
              <button
                onClick={() => setShowAddEndpoint(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Add your first endpoint
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {plugin.endpoints.map((ep) => (
                <div
                  key={ep._id}
                  className={`bg-white rounded-lg border p-3 cursor-pointer transition-all hover:shadow-sm ${
                    playgroundEndpoint?._id === ep._id
                      ? "border-blue-300 ring-1 ring-blue-100"
                      : "border-gray-200"
                  }`}
                  onClick={() => loadEndpoint(ep)}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${METHOD_COLORS[ep.method] || "bg-gray-100 text-gray-700"}`}>
                      {ep.method}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate flex-1">{ep.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Remove "${ep.name}"?`)) handleRemoveEndpoint(ep._id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1">{ep.path}</p>
                  {ep.description && (
                    <p className="text-xs text-gray-400 mt-1">{ep.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* API Playground (3 cols) */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            API Playground
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Request bar */}
            <div className="flex items-center gap-2 p-3 border-b border-gray-100">
              <select
                value={playMethod}
                onChange={(e) => setPlayMethod(e.target.value)}
                className={`px-2 py-1.5 rounded text-xs font-bold border-0 cursor-pointer focus:ring-2 focus:ring-blue-500 ${METHOD_COLORS[playMethod] || "bg-gray-100 text-gray-700"}`}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="flex-1 flex items-center bg-gray-50 rounded-lg border border-gray-200 px-2">
                <span className="text-xs text-gray-400 truncate max-w-[120px]">{plugin.baseUrl}</span>
                <input
                  type="text"
                  value={playPath}
                  onChange={(e) => setPlayPath(e.target.value)}
                  placeholder="/endpoint"
                  className="flex-1 px-1 py-1.5 bg-transparent text-sm font-mono focus:outline-none"
                />
              </div>
              <button
                onClick={handleExecute}
                disabled={executing}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {executing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                Send
              </button>
            </div>

            {/* Request body */}
            {["POST", "PUT", "PATCH"].includes(playMethod) && (
              <div className="border-b border-gray-100">
                <div className="px-3 py-2 bg-gray-50/50">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Request Body (JSON)</label>
                </div>
                <textarea
                  value={playBody}
                  onChange={(e) => setPlayBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  rows={4}
                  className="w-full px-3 py-2 text-xs font-mono focus:outline-none resize-none"
                />
              </div>
            )}

            {/* Response */}
            <div className="min-h-[200px]">
              {executing ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                </div>
              ) : response ? (
                <div>
                  {/* Status bar */}
                  <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border-b border-gray-100">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      response.status >= 200 && response.status < 300
                        ? "bg-green-100 text-green-700"
                        : response.status >= 400
                        ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {response.status} {response.statusText || ""}
                    </span>
                    {response.error && (
                      <span className="text-xs text-red-600">{response.error}</span>
                    )}
                    <div className="ml-auto flex gap-1">
                      {response.headers && (
                        <button
                          onClick={() => setShowResponseHeaders(!showResponseHeaders)}
                          className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded cursor-pointer hover:bg-gray-300"
                        >
                          {showResponseHeaders ? <ChevronUp className="w-3 h-3 inline" /> : <ChevronDown className="w-3 h-3 inline" />} Headers
                        </button>
                      )}
                      <button
                        onClick={() => copyToClipboard(JSON.stringify(response.body, null, 2))}
                        className="text-[10px] px-2 py-0.5 bg-gray-200 text-gray-600 rounded cursor-pointer hover:bg-gray-300 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    </div>
                  </div>

                  {/* Response headers */}
                  {showResponseHeaders && response.headers && (
                    <div className="px-3 py-2 bg-gray-50/50 border-b border-gray-100 max-h-[120px] overflow-y-auto">
                      {Object.entries(response.headers).map(([k, v]) => (
                        <div key={k} className="text-[10px] font-mono py-0.5">
                          <span className="text-gray-500">{k}:</span>{" "}
                          <span className="text-gray-700">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Response body */}
                  <pre className="px-3 py-3 text-xs font-mono text-gray-800 overflow-auto max-h-[400px] whitespace-pre-wrap break-all">
                    {typeof response.body === "string"
                      ? response.body
                      : JSON.stringify(response.body, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Play className="w-8 h-8 mb-2" />
                  <p className="text-xs">
                    {plugin.endpoints.length > 0
                      ? "Select an endpoint or enter a path, then click Send"
                      : "Enter a path and click Send to make a request"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Endpoint Modal */}
      {showAddEndpoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-bold text-gray-900">Add Endpoint</h2>
              <button onClick={() => setShowAddEndpoint(false)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={endpointForm.name}
                  onChange={(e) => setEndpointForm({ ...endpointForm, name: e.target.value })}
                  placeholder="e.g. List Users"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Method</label>
                  <select
                    value={endpointForm.method}
                    onChange={(e) => setEndpointForm({ ...endpointForm, method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Path *</label>
                  <input
                    type="text"
                    value={endpointForm.path}
                    onChange={(e) => setEndpointForm({ ...endpointForm, path: e.target.value })}
                    placeholder="/users"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input
                  type="text"
                  value={endpointForm.description}
                  onChange={(e) => setEndpointForm({ ...endpointForm, description: e.target.value })}
                  placeholder="What does this endpoint do?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {["POST", "PUT", "PATCH"].includes(endpointForm.method) && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Sample Body (JSON)</label>
                  <textarea
                    value={endpointForm.sampleBody}
                    onChange={(e) => setEndpointForm({ ...endpointForm, sampleBody: e.target.value })}
                    placeholder='{"key": "value"}'
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200">
              <button onClick={() => setShowAddEndpoint(false)} className="px-4 py-2 text-sm text-gray-600 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleAddEndpoint}
                disabled={addingEndpoint || !endpointForm.name.trim() || !endpointForm.path.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a2e] text-white rounded-lg text-sm font-medium hover:bg-[#2a2a4e] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {addingEndpoint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Endpoint
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
