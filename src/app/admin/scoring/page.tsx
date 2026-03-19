"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Save,
  RotateCcw,
  Gauge,
  Plus,
  Pencil,
  Trash2,
  X,
  Lock,
  Zap,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

interface ScoringEvent {
  _id: string;
  key: string;
  label: string;
  description: string;
  score: number;
  icon: string;
  isSystem: boolean;
  isActive: boolean;
}

interface PipelineStage {
  _id: string;
  key: string;
  label: string;
  minScore: number;
  color: string;
  order: number;
  isSystem: boolean;
}

interface Thresholds {
  cold: number;
  warm: number;
  hot: number;
}

interface Decay {
  enabled: boolean;
  inactiveDays: number;
  decayAmount: number;
}

interface ScoringConfig {
  _id: string;
  events: ScoringEvent[];
  pipelineStages: PipelineStage[];
  thresholds: Thresholds;
  decay: Decay;
}

export default function ScoringPage() {
  const router = useRouter();
  const [config, setConfig] = useState<ScoringConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Local editable copies
  const [events, setEvents] = useState<ScoringEvent[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>({ cold: 11, warm: 26, hot: 51 });
  const [decay, setDecay] = useState<Decay>({ enabled: true, inactiveDays: 30, decayAmount: 10 });

  // Add/Edit modal state for events
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScoringEvent | null>(null);
  const [modalForm, setModalForm] = useState({ key: "", label: "", description: "", score: 5 });
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // Add/Edit modal state for pipeline stages
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null);
  const [stageForm, setStageForm] = useState({ key: "", label: "", minScore: 0, color: "#8b5cf6" });
  const [stageSaving, setStageSaving] = useState(false);
  const [stageError, setStageError] = useState("");

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config`);
      const data = await res.json();
      if (data.statusCode === 200) {
        setConfig(data.data);
        setEvents(data.data.events || []);
        setPipelineStages((data.data.pipelineStages || []).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
        setThresholds(data.data.thresholds);
        setDecay(data.data.decay);
      }
    } catch (err) {
      console.error("Failed to fetch scoring config:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/verify").then((res) => {
      if (!res.ok) router.push("/admin/login");
    });
  }, [router]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Save thresholds, decay, and event score changes
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: events.map((e) => ({ _id: e._id, score: e.score, isActive: e.isActive })),
          pipelineStages: pipelineStages.map((s) => ({ _id: s._id, label: s.label, minScore: s.minScore, color: s.color, order: s.order })),
          thresholds,
          decay,
        }),
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        setConfig(data.data);
        setEvents(data.data.events);
        setPipelineStages((data.data.pipelineStages || []).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset all scoring values to defaults? Custom events and stages will be removed.")) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/reset`, { method: "POST" });
      const data = await res.json();
      if (data.statusCode === 200) {
        setConfig(data.data);
        setEvents(data.data.events);
        setPipelineStages((data.data.pipelineStages || []).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
        setThresholds(data.data.thresholds);
        setDecay(data.data.decay);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to reset config:", err);
    } finally {
      setSaving(false);
    }
  };

  // Open modal for adding
  const openAddModal = () => {
    setEditingEvent(null);
    setModalForm({ key: "", label: "", description: "", score: 5 });
    setModalError("");
    setShowModal(true);
  };

  // Open modal for editing custom event
  const openEditModal = (event: ScoringEvent) => {
    setEditingEvent(event);
    setModalForm({ key: event.key, label: event.label, description: event.description, score: event.score });
    setModalError("");
    setShowModal(true);
  };

  // Auto-generate key from label
  const handleLabelChange = (label: string) => {
    setModalForm((prev) => ({
      ...prev,
      label,
      key: editingEvent ? prev.key : label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }));
  };

  // Save new or edit existing event
  const handleModalSave = async () => {
    if (!modalForm.label.trim()) {
      setModalError("Label is required");
      return;
    }
    if (!modalForm.key.trim()) {
      setModalError("Key is required");
      return;
    }

    setModalSaving(true);
    setModalError("");
    try {
      let res;
      if (editingEvent) {
        // Update existing
        res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/events/${editingEvent._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalForm),
        });
      } else {
        // Add new
        res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(modalForm),
        });
      }

      const data = await res.json();
      if (data.statusCode === 200 || data.statusCode === 201) {
        setConfig(data.data);
        setEvents(data.data.events);
        setShowModal(false);
      } else {
        setModalError(data.message || "Failed to save event");
      }
    } catch (err) {
      setModalError("Network error");
    } finally {
      setModalSaving(false);
    }
  };

  // Delete custom event
  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this custom event?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/events/${eventId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.statusCode === 200) {
        setConfig(data.data);
        setEvents(data.data.events);
      }
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // Toggle event active/inactive locally
  const toggleEventActive = (eventId: string) => {
    setEvents((prev) =>
      prev.map((e) => (e._id === eventId ? { ...e, isActive: !e.isActive } : e))
    );
  };

  // Update score locally
  const updateEventScore = (eventId: string, score: number) => {
    setEvents((prev) =>
      prev.map((e) => (e._id === eventId ? { ...e, score: Math.max(0, score) } : e))
    );
  };

  // Example journey calculation
  const getScore = (key: string) => {
    const e = events.find((ev) => ev.key === key && ev.isActive);
    return e ? e.score : 0;
  };
  const exampleScore = getScore("page_visit") + getScore("time_2min") + getScore("pricing_visit") + getScore("form_submitted");
  const sortedStagesDesc = [...pipelineStages].sort((a, b) => b.minScore - a.minScore);
  const getExampleStage = (score: number) => {
    for (const stage of sortedStagesDesc) {
      if (score >= stage.minScore) return { label: stage.label, color: stage.color };
    }
    return { label: "New", color: "#3b82f6" };
  };
  const exampleStage = getExampleStage(exampleScore);

  // Pipeline stage CRUD
  const openAddStageModal = () => {
    setEditingStage(null);
    setStageForm({ key: "", label: "", minScore: 0, color: "#8b5cf6" });
    setStageError("");
    setShowStageModal(true);
  };

  const openEditStageModal = (stage: PipelineStage) => {
    setEditingStage(stage);
    setStageForm({ key: stage.key, label: stage.label, minScore: stage.minScore, color: stage.color });
    setStageError("");
    setShowStageModal(true);
  };

  const handleStageLabelChange = (label: string) => {
    setStageForm((prev) => ({
      ...prev,
      label,
      key: editingStage ? prev.key : label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
    }));
  };

  const handleStageSave = async () => {
    if (!stageForm.label.trim()) { setStageError("Label is required"); return; }
    setStageSaving(true);
    setStageError("");
    try {
      let res;
      if (editingStage) {
        res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/stages/${editingStage._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stageForm),
        });
      } else {
        res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/stages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stageForm),
        });
      }
      const data = await res.json();
      if (data.statusCode === 200 || data.statusCode === 201) {
        setConfig(data.data);
        setPipelineStages((data.data.pipelineStages || []).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
        setShowStageModal(false);
      } else {
        setStageError(data.message || "Failed to save stage");
      }
    } catch { setStageError("Network error"); }
    finally { setStageSaving(false); }
  };

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm("Delete this pipeline stage?")) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/scoring-config/stages/${stageId}`, { method: "DELETE" });
      const data = await res.json();
      if (data.statusCode === 200) {
        setConfig(data.data);
        setPipelineStages((data.data.pipelineStages || []).sort((a: PipelineStage, b: PipelineStage) => a.order - b.order));
      }
    } catch (err) { console.error("Failed to delete stage:", err); }
  };

  const updateStageLocally = (stageId: string, field: string, value: number | string) => {
    setPipelineStages((prev) =>
      prev.map((s) => (s._id === stageId ? { ...s, [field]: value } : s))
    );
  };

  const systemEvents = events.filter((e) => e.isSystem);
  const customEvents = events.filter((e) => !e.isSystem);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e] flex items-center gap-2">
            <Gauge className="w-6 h-6 text-[#f97316]" />
            Scoring Configuration
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Adjust engagement points, manage event categories, and set pipeline thresholds
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 cursor-pointer transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-[#f97316] text-white text-sm font-medium rounded-lg hover:bg-[#ea6c0e] cursor-pointer transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* System Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a1a2e] flex items-center gap-2">
              System Events
              <Lock className="w-3.5 h-3.5 text-gray-400" />
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Built-in tracking events — adjust scores or toggle on/off</p>
          </div>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {systemEvents.map((event) => (
              <div
                key={event._id}
                className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors ${
                  event.isActive
                    ? "bg-gray-50 border-gray-100"
                    : "bg-gray-100/50 border-gray-200 opacity-60"
                }`}
              >
                <div className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1a1a2e]">{event.label}</p>
                  <p className="text-[10px] text-gray-400">{event.description}</p>
                </div>
                <button
                  onClick={() => toggleEventActive(event._id)}
                  className="cursor-pointer flex-shrink-0"
                  title={event.isActive ? "Disable" : "Enable"}
                >
                  {event.isActive ? (
                    <ToggleRight className="w-6 h-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-gray-300" />
                  )}
                </button>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <span className="text-xs text-gray-400">+</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={event.score}
                    onChange={(e) => updateEventScore(event._id, parseInt(e.target.value) || 0)}
                    disabled={!event.isActive}
                    className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1.5 text-sm font-bold text-[#f97316] focus:outline-none focus:border-[#f97316] bg-white disabled:opacity-40"
                  />
                  <span className="text-xs text-gray-400">pts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Custom Events */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a1a2e]">Custom Events</h2>
            <p className="text-xs text-gray-400 mt-0.5">Add your own scoring events to track custom user actions</p>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a2e] text-white text-sm font-medium rounded-lg hover:bg-[#2a2a3e] cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Event
          </button>
        </div>
        <div className="p-6">
          {customEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Zap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No custom events yet</p>
              <p className="text-xs mt-1">Click &quot;Add Event&quot; to create one</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customEvents.map((event) => (
                <div
                  key={event._id}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-colors ${
                    event.isActive
                      ? "bg-orange-50/50 border-orange-100"
                      : "bg-gray-100/50 border-gray-200 opacity-60"
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-white border border-orange-200 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-4 h-4 text-[#f97316]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a1a2e]">{event.label}</p>
                    <p className="text-[10px] text-gray-400">{event.description || event.key}</p>
                  </div>
                  <button
                    onClick={() => toggleEventActive(event._id)}
                    className="cursor-pointer flex-shrink-0"
                    title={event.isActive ? "Disable" : "Enable"}
                  >
                    {event.isActive ? (
                      <ToggleRight className="w-6 h-6 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-300" />
                    )}
                  </button>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-xs text-gray-400">+</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={event.score}
                      onChange={(e) => updateEventScore(event._id, parseInt(e.target.value) || 0)}
                      disabled={!event.isActive}
                      className="w-14 text-center border border-gray-200 rounded-lg px-1 py-1.5 text-sm font-bold text-[#f97316] focus:outline-none focus:border-[#f97316] bg-white disabled:opacity-40"
                    />
                    <span className="text-xs text-gray-400">pts</span>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => openEditModal(event)}
                      className="p-1.5 text-gray-400 hover:text-[#f97316] hover:bg-orange-50 rounded-lg cursor-pointer transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event._id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[#1a1a2e]">Pipeline Stages</h2>
            <p className="text-xs text-gray-400 mt-0.5">Score ranges that determine each pipeline stage</p>
          </div>
          <button
            onClick={openAddStageModal}
            className="flex items-center gap-1.5 bg-[#f97316] hover:bg-[#ea580c] text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Stage
          </button>
        </div>
        <div className="p-6">
          {/* Visual pipeline bar */}
          <div className="mb-6">
            <div className="flex rounded-lg overflow-hidden h-10 border border-gray-200">
              {[...pipelineStages].sort((a, b) => a.minScore - b.minScore).map((stage, i, arr) => {
                const maxScore = arr[arr.length - 1]?.minScore || 51;
                const nextMin = arr[i + 1]?.minScore ?? maxScore + 30;
                const total = maxScore + 30;
                const width = i === arr.length - 1
                  ? undefined
                  : `${((nextMin - stage.minScore) / total) * 100}%`;
                return (
                  <div
                    key={stage._id}
                    className={`flex items-center justify-center text-xs font-semibold ${i === arr.length - 1 ? "flex-1" : ""}`}
                    style={{
                      backgroundColor: stage.color + "20",
                      color: stage.color,
                      width: width,
                    }}
                  >
                    {stage.label} ({stage.minScore}{i === arr.length - 1 ? "+" : `–${nextMin - 1}`})
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stage cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...pipelineStages].sort((a, b) => a.order - b.order).map((stage) => (
              <div
                key={stage._id}
                className="border rounded-xl p-4 relative"
                style={{ borderColor: stage.color + "40", backgroundColor: stage.color + "08" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: stage.color }}>
                      {stage.label}
                    </p>
                    {stage.isSystem && <Lock className="w-3 h-3 text-gray-400" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {!stage.isSystem && (
                      <>
                        <button onClick={() => openEditStageModal(stage)} className="p-1 hover:bg-white rounded cursor-pointer">
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        <button onClick={() => handleDeleteStage(stage._id)} className="p-1 hover:bg-white rounded cursor-pointer">
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Starts at</span>
                  <input
                    type="number"
                    min="0"
                    value={stage.minScore}
                    onChange={(e) => updateStageLocally(stage._id, "minScore", Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-16 text-center border rounded-lg px-2 py-1.5 text-sm font-bold focus:outline-none bg-white"
                    style={{ borderColor: stage.color + "60", color: stage.color }}
                  />
                  <span className="text-xs text-gray-500">points</span>
                  <input
                    type="color"
                    value={stage.color}
                    onChange={(e) => updateStageLocally(stage._id, "color", e.target.value)}
                    className="w-7 h-7 rounded border border-gray-200 cursor-pointer ml-auto"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Score Decay */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-[#1a1a2e]">Score Decay</h2>
          <p className="text-xs text-gray-400 mt-0.5">Automatically reduce scores for inactive leads</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={decay.enabled}
                onChange={(e) => setDecay((prev) => ({ ...prev, enabled: e.target.checked }))}
                className="w-4 h-4 accent-[#f97316]"
              />
              <span className="text-sm font-medium text-[#1a1a2e]">Enable score decay</span>
            </label>
            {decay.enabled && (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">After</span>
                  <input
                    type="number"
                    min="1"
                    value={decay.inactiveDays}
                    onChange={(e) => setDecay((prev) => ({ ...prev, inactiveDays: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-[#1a1a2e] focus:outline-none focus:border-[#f97316] bg-white"
                  />
                  <span className="text-sm text-gray-500">days inactive</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Reduce by</span>
                  <input
                    type="number"
                    min="0"
                    value={decay.decayAmount}
                    onChange={(e) => setDecay((prev) => ({ ...prev, decayAmount: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-16 text-center border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-[#1a1a2e] focus:outline-none focus:border-[#f97316] bg-white"
                  />
                  <span className="text-sm text-gray-500">points</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Example Journey */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-[#1a1a2e]">Example User Journey</h2>
          <p className="text-xs text-gray-400 mt-0.5">Preview how a typical user flows through the pipeline</p>
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
              Visit homepage <span className="font-bold text-[#f97316]">+{getScore("page_visit")}</span>
            </span>
            <span className="text-gray-300">&rarr;</span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
              Stay 2 min <span className="font-bold text-[#f97316]">+{getScore("time_2min")}</span>
            </span>
            <span className="text-gray-300">&rarr;</span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
              Visit pricing <span className="font-bold text-[#f97316]">+{getScore("pricing_visit")}</span>
            </span>
            <span className="text-gray-300">&rarr;</span>
            <span className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg">
              Submit form <span className="font-bold text-[#f97316]">+{getScore("form_submitted")}</span>
            </span>
            <span className="text-gray-300">=</span>
            <span className="bg-[#1a1a2e] text-white px-4 py-1.5 rounded-lg font-bold">
              {exampleScore} pts
            </span>
            <span className="font-bold text-lg" style={{ color: exampleStage.color }}>
              {exampleStage.label}
            </span>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="bg-[#1a1a2e] px-6 py-4 flex items-center justify-between">
              <h3 className="text-white font-semibold">
                {editingEvent ? "Edit Event" : "Add Custom Event"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Event Label <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="e.g. Video Watched"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Event Key <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={modalForm.key}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, key: e.target.value }))}
                  placeholder="auto-generated from label"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#f97316] bg-gray-50"
                />
                <p className="text-[10px] text-gray-400 mt-1">Used in tracking code. Auto-generated from label.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                <input
                  type="text"
                  value={modalForm.description}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g. User watches a product video"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  Score (points) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={modalForm.score}
                  onChange={(e) => setModalForm((prev) => ({ ...prev, score: Math.max(0, parseInt(e.target.value) || 0) }))}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-[#f97316] focus:outline-none focus:border-[#f97316]"
                />
              </div>

              {modalError && (
                <p className="text-red-500 text-xs">{modalError}</p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 text-sm rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleModalSave}
                  disabled={modalSaving}
                  className="px-5 py-2 bg-[#f97316] text-white text-sm font-medium rounded-lg hover:bg-[#ea6c0e] cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {modalSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingEvent ? "Update" : "Add Event"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline Stage Modal */}
      {showStageModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-[#1a1a2e]">
                {editingStage ? "Edit Stage" : "Add Pipeline Stage"}
              </h3>
              <button onClick={() => setShowStageModal(false)} className="p-1 hover:bg-gray-100 rounded-lg cursor-pointer">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {stageError && (
                <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg">{stageError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage Name *</label>
                <input
                  type="text"
                  value={stageForm.label}
                  onChange={(e) => handleStageLabelChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="e.g. Very Hot"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
                <input
                  type="text"
                  value={stageForm.key}
                  onChange={(e) => setStageForm((prev) => ({ ...prev, key: e.target.value }))}
                  disabled={!!editingStage?.isSystem}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Score *</label>
                  <input
                    type="number"
                    min="0"
                    value={stageForm.minScore}
                    onChange={(e) => setStageForm((prev) => ({ ...prev, minScore: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stageForm.color}
                      onChange={(e) => setStageForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={stageForm.color}
                      onChange={(e) => setStageForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowStageModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleStageSave}
                disabled={stageSaving}
                className="px-5 py-2 bg-[#f97316] text-white text-sm font-medium rounded-lg hover:bg-[#ea580c] cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {stageSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingStage ? "Update" : "Add Stage"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
