"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  GripVertical,
  Eye,
  EyeOff,
} from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Story {
  _id: string;
  name: string;
  image: string;
  logo: string;
  quote: string;
  isActive: boolean;
  order: number;
}

export default function StoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<Story | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    quote: "",
    order: 0,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragCounterRef = useRef<Record<number, number>>({});

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/stories/all`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.data) {
        const sorted = [...data.data].sort((a: Story, b: Story) => a.order - b.order);
        setStories(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch stories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const openAddModal = () => {
    setEditingStory(null);
    setForm({ name: "", quote: "", order: stories.length + 1 });
    setImageFile(null);
    setLogoFile(null);
    setImagePreview("");
    setLogoPreview("");
    setModalOpen(true);
  };

  const openEditModal = (story: Story) => {
    setEditingStory(story);
    setForm({
      name: story.name,
      quote: story.quote,
      order: story.order,
    });
    setImageFile(null);
    setLogoFile(null);
    setImagePreview(story.image || "");
    setLogoPreview(story.logo || "");
    setModalOpen(true);
  };

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "logo"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    if (type === "image") {
      setImageFile(file);
      setImagePreview(preview);
    } else {
      setLogoFile(file);
      setLogoPreview(preview);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.quote.trim()) return;
    setSaving(true);
    try {
      const url = editingStory
        ? `${API_BASE_URL}/api/v1/pm/stories/${editingStory._id}`
        : `${API_BASE_URL}/api/v1/pm/stories`;
      const method = editingStory ? "PATCH" : "POST";

      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("quote", form.quote);
      formData.append("order", String(form.order));
      if (imageFile) formData.append("image", imageFile);
      if (logoFile) formData.append("logo", logoFile);

      const res = await fetch(url, {
        method,
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        setModalOpen(false);
        fetchStories();
      }
    } catch (err) {
      console.error("Failed to save story:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this story?")) return;
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/stories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      fetchStories();
    } catch (err) {
      console.error("Failed to delete story:", err);
    }
  };

  const toggleActive = async (story: Story) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/pm/stories/${story._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive: !story.isActive }),
      });
      fetchStories();
    } catch (err) {
      console.error("Failed to toggle story:", err);
    }
  };

  // --- Drag-and-drop handlers ---
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
    setTimeout(() => {
      const el = document.getElementById(`story-${index}`);
      if (el) el.style.opacity = "0.4";
    }, 0);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null) {
      const el = document.getElementById(`story-${dragIndex}`);
      if (el) el.style.opacity = "1";
    }
    setDragIndex(null);
    setDragOverIndex(null);
    dragCounterRef.current = {};
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragCounterRef.current[index] = (dragCounterRef.current[index] || 0) + 1;
    if (dragIndex !== null && dragIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (index: number) => {
    dragCounterRef.current[index] = (dragCounterRef.current[index] || 0) - 1;
    if (dragCounterRef.current[index] <= 0) {
      dragCounterRef.current[index] = 0;
      if (dragOverIndex === index) {
        setDragOverIndex(null);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    // Reorder locally
    const reordered = [...stories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Assign new order values
    const updated = reordered.map((s, i) => ({ ...s, order: i + 1 }));
    setStories(updated);
    handleDragEnd();

    // Persist all order changes to backend
    try {
      await Promise.all(
        updated.map((s) =>
          fetch(`${API_BASE_URL}/api/v1/pm/stories/${s._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ order: s.order }),
          })
        )
      );
    } catch (err) {
      console.error("Failed to update order:", err);
      fetchStories(); // Revert on failure
    }
  };

  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Member Stories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Drag to reorder. Changes are saved automatically.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Story
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No stories yet</p>
          <p className="text-sm mt-1">Add your first member success story</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {stories.map((story, index) => (
            <div
              key={story._id}
              id={`story-${index}`}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnd={handleDragEnd}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={() => handleDragLeave(index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              className={`bg-white rounded-xl border p-5 flex items-center gap-5 transition-all select-none ${
                story.isActive ? "border-gray-200" : "border-gray-100 opacity-50"
              } ${
                dragOverIndex === index && dragIndex !== index
                  ? "border-t-2 border-t-[#f97316] shadow-lg translate-y-[-2px]"
                  : ""
              } ${
                dragIndex === index ? "shadow-2xl scale-[1.02]" : ""
              }`}
            >
              <div className="cursor-grab active:cursor-grabbing flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors">
                <GripVertical className="w-4 h-4 text-gray-400" />
              </div>

              {/* Image */}
              <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                {story.image ? (
                  <img
                    src={story.image}
                    alt={story.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-lg font-bold">
                    {story.name[0]}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{story.name}</h3>
                  {!story.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">
                  {story.quote}
                </p>
                {story.logo && (
                  <img
                    src={story.logo}
                    alt="logo"
                    className="h-5 mt-1.5 object-contain"
                  />
                )}
              </div>

              {/* Order */}
              <span className="text-xs text-gray-400 font-mono flex-shrink-0">
                #{story.order}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => toggleActive(story)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title={story.isActive ? "Hide" : "Show"}
                >
                  {story.isActive ? (
                    <Eye className="w-4 h-4" />
                  ) : (
                    <EyeOff className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => openEditModal(story)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(story._id)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                {editingStory ? "Edit Story" : "Add Story"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Member Name *
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  placeholder="e.g. Jaimi Panchal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quote / Success Story *
                </label>
                <textarea
                  value={form.quote}
                  onChange={(e) => setForm({ ...form, quote: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                  rows={3}
                  placeholder='"Has Received Rs.8,00,000/- Worth of Business."'
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Member Photo
                  </label>
                  <label className="block border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-orange-300 transition-colors">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-16 h-16 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs py-2">
                        Click to upload
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "image")}
                    />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Logo
                  </label>
                  <label className="block border-2 border-dashed border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-orange-300 transition-colors">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo Preview"
                        className="h-10 object-contain mx-auto"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs py-2">
                        Click to upload
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileChange(e, "logo")}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.quote.trim()}
                className="bg-[#f97316] hover:bg-[#ea580c] text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingStory ? (
                  "Update"
                ) : (
                  "Add Story"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
