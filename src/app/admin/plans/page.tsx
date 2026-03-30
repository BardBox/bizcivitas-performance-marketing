"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Star,
  Check,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";
import { ViewOnlyBanner } from "@/components/admin/ViewOnlyBanner";

interface Plan {
  _id: string;
  name: string;
  description: string;
  amount: number;
  discountPrice: number | null;
  duration: string;
  features: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

const DURATION_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half-yearly", label: "Half-Yearly" },
  { value: "annual", label: "Annual" },
  { value: "lifetime", label: "Lifetime" },
];

export default function PlansPage() {
  const { canView, canEdit, loading: permLoading } = useAdminPermissions();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    amount: "",
    discountPercent: "",
    duration: "annual",
    features: "",
    isActive: true,
    isDefault: false,
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pm/plans`);
      const data = await res.json();
      if (res.ok) {
        setPlans(data.data || []);
      }
    } catch {
      console.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      amount: "",
      discountPercent: "",
      duration: "annual",
      features: "",
      isActive: true,
      isDefault: false,
    });
    setShowModal(true);
  };

  const openEditModal = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      amount: plan.amount.toString(),
      discountPercent: plan.discountPrice != null && plan.amount > 0
        ? Math.round(((plan.amount - plan.discountPrice) / plan.amount) * 100).toString()
        : "",
      duration: plan.duration,
      features: plan.features.join("\n"),
      isActive: plan.isActive,
      isDefault: plan.isDefault,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name,
      description: formData.description,
      amount: Number(formData.amount),
      discountPrice: formData.discountPercent && Number(formData.discountPercent) > 0
        ? Math.round(Number(formData.amount) * (1 - Number(formData.discountPercent) / 100))
        : null,
      duration: formData.duration,
      features: formData.features
        .split("\n")
        .map((f) => f.trim())
        .filter(Boolean),
      isActive: formData.isActive,
      isDefault: formData.isDefault,
    };

    try {
      const url = editingPlan
        ? `${API_BASE_URL}/pm/plans/${editingPlan._id}`
        : `${API_BASE_URL}/pm/plans`;

      const res = await fetch(url, {
        method: editingPlan ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchPlans();
      }
    } catch {
      console.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;

    setDeleting(id);
    try {
      const res = await fetch(`${API_BASE_URL}/pm/plans/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchPlans();
      }
    } catch {
      console.error("Failed to delete plan");
    } finally {
      setDeleting(null);
    }
  };

  const toggleActive = async (plan: Plan) => {
    try {
      await fetch(`${API_BASE_URL}/pm/plans/${plan._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });
      fetchPlans();
    } catch {
      console.error("Failed to toggle plan status");
    }
  };

  const setAsDefault = async (plan: Plan) => {
    try {
      await fetch(`${API_BASE_URL}/pm/plans/${plan._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      fetchPlans();
    } catch {
      console.error("Failed to set default plan");
    }
  };

  if (!permLoading && !canView("plans")) return <AccessDenied />;

  return (
    <div className="p-6 md:p-8">
      {!canEdit("plans") && <ViewOnlyBanner />}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Plans</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage membership plans and pricing
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-4 py-2 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Plan
        </button>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-8 h-8 text-[#f97316] animate-spin mx-auto" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <p className="text-gray-400 text-sm">No plans created yet.</p>
          <button
            onClick={openCreateModal}
            className="mt-3 text-[#f97316] hover:underline text-sm font-medium cursor-pointer"
          >
            Create your first plan
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <div
              key={plan._id}
              className={`bg-white rounded-xl shadow-sm border-2 overflow-hidden ${
                plan.isDefault
                  ? "border-[#f97316]"
                  : plan.isActive
                  ? "border-transparent"
                  : "border-gray-200 opacity-60"
              }`}
            >
              {/* Plan Header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-[#1a1a2e]">{plan.name}</h3>
                      {plan.isDefault && (
                        <span className="bg-[#f97316]/10 text-[#f97316] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {plan.duration}
                    </p>
                  </div>
                  <div className="text-right">
                    {plan.discountPrice != null ? (
                      <>
                        <span className="inline-block bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded mb-1">
                          {Math.round(((plan.amount - plan.discountPrice) / plan.amount) * 100)}% OFF
                        </span>
                        <p className="text-sm text-gray-400 line-through">
                          ₹{plan.amount.toLocaleString("en-IN")}
                        </p>
                        <p className="text-2xl font-bold text-green-600">
                          ₹{plan.discountPrice.toLocaleString("en-IN")}
                        </p>
                      </>
                    ) : (
                      <p className="text-2xl font-bold text-[#1a1a2e]">
                        ₹{plan.amount.toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {plan.description && (
                <div className="px-5 py-3 border-b border-gray-50">
                  <p className="text-xs text-gray-500">{plan.description}</p>
                </div>
              )}

              {/* Features */}
              {plan.features.length > 0 && (
                <div className="px-5 py-3 border-b border-gray-50">
                  <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1.5">
                    Features
                  </p>
                  <ul className="space-y-1">
                    {plan.features.map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-1.5 text-xs text-gray-600"
                      >
                        <Check className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Status + Actions */}
              <div className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActive(plan)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                      plan.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {plan.isActive ? "Active" : "Inactive"}
                  </button>
                  {!plan.isDefault && plan.isActive && (
                    <button
                      onClick={() => setAsDefault(plan)}
                      className="text-[10px] text-gray-400 hover:text-[#f97316] cursor-pointer"
                      title="Set as default"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openEditModal(plan)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#1a1a2e] cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(plan._id)}
                    disabled={deleting === plan._id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {deleting === plan._id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1a1a2e]">
                {editingPlan ? "Edit Plan" : "Create Plan"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-1">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. Digital Membership"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                />
              </div>

              {/* Original Price + Discount % */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1a2e] mb-1">
                    Original Price (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    placeholder="e.g. 1999"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1a1a2e] mb-1">
                    Discount (%){" "}
                    <span className="text-gray-400 font-normal">optional</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={formData.discountPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, discountPercent: e.target.value })
                    }
                    placeholder="e.g. 20"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
                </div>
              </div>

              {/* Auto-calculated discount price */}
              {formData.discountPercent && Number(formData.discountPercent) > 0 && Number(formData.amount) > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-gray-600">
                    After <span className="font-bold text-green-700">{formData.discountPercent}%</span> discount
                  </span>
                  <div className="text-right">
                    <span className="text-sm text-gray-400 line-through mr-2">
                      ₹{Number(formData.amount).toLocaleString("en-IN")}
                    </span>
                    <span className="text-lg font-bold text-green-700">
                      ₹{Math.round(Number(formData.amount) * (1 - Number(formData.discountPercent) / 100)).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              )}

              {/* Duration */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-1">
                  Duration
                </label>
                <select
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 bg-white"
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Short description of the plan"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                />
              </div>

              {/* Features */}
              <div>
                <label className="block text-xs font-semibold text-[#1a1a2e] mb-1">
                  Features{" "}
                  <span className="text-gray-400 font-normal">
                    (one per line)
                  </span>
                </label>
                <textarea
                  value={formData.features}
                  onChange={(e) =>
                    setFormData({ ...formData, features: e.target.value })
                  }
                  rows={3}
                  placeholder={"Access to all events\nBusiness directory listing\nNetworking tools"}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 resize-none"
                />
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#f97316]"
                  />
                  <span className="text-sm text-gray-600">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) =>
                      setFormData({ ...formData, isDefault: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#f97316]"
                  />
                  <span className="text-sm text-gray-600">
                    Set as default plan
                  </span>
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-2.5 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : editingPlan ? (
                  "Update Plan"
                ) : (
                  "Create Plan"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
