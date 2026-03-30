"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, ShieldCheck, LayoutDashboard, Eye, EyeOff, X } from "lucide-react";
import {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
  DASHBOARD_WIDGETS,
  DEFAULT_DASHBOARD_WIDGETS,
  type AdminUser,
  type PermissionLevel,
  type SectionKey,
  type PermissionsMap,
  type DashboardWidgetsMap,
} from "@/store/endpoints/adminUsers";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";

const SECTIONS: { key: SectionKey; label: string }[] = [
  { key: "dashboard",  label: "Dashboard"  },
  { key: "inquiries",  label: "Inquiries"  },
  { key: "plans",      label: "Plans"      },
  { key: "members",    label: "Members"    },
  { key: "stories",    label: "Stories"    },
  { key: "contacts",   label: "Contacts"   },
  { key: "pipeline",   label: "Pipeline"   },
  { key: "email",      label: "Email"      },
  { key: "whatsapp",   label: "WhatsApp"   },
  { key: "templates",  label: "Templates"  },
  { key: "api",        label: "API"        },
];

const DEFAULT_PERMISSIONS = (): PermissionsMap =>
  Object.fromEntries(SECTIONS.map((s) => [s.key, "none"])) as PermissionsMap;

interface FormState {
  name: string;
  email: string;
  password: string;
  isActive: boolean;
  permissions: PermissionsMap;
  dashboardWidgets: DashboardWidgetsMap;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  password: "",
  isActive: true,
  permissions: DEFAULT_PERMISSIONS(),
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS(),
};

const LEVEL_LABELS: { value: PermissionLevel; label: string }[] = [
  { value: "none", label: "None" },
  { value: "view", label: "View" },
  { value: "edit", label: "Edit" },
];

export default function AdminUsersPage() {
  const router = useRouter();
  const { isSuperAdmin, loading: permLoading } = useAdminPermissions();

  const { data: users = [], isLoading } = useGetAdminUsersQuery();
  const [createUser] = useCreateAdminUserMutation();
  const [updateUser] = useUpdateAdminUserMutation();
  const [deleteUser] = useDeleteAdminUserMutation();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Redirect non-super-admins
  if (!permLoading && !isSuperAdmin) {
    router.replace("/admin");
    return null;
  }

  const openCreate = () => {
    setEditingUser(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowPassword(false);
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      isActive: user.isActive,
      permissions: { ...DEFAULT_PERMISSIONS(), ...user.permissions },
      dashboardWidgets: { ...DEFAULT_DASHBOARD_WIDGETS(), ...user.dashboardWidgets },
    });
    setError("");
    setShowPassword(false);
    setModalOpen(true);
  };

  const handlePermissionChange = (key: SectionKey, value: PermissionLevel) => {
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [key]: value } }));
  };

  const handleSave = async () => {
    setError("");
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    if (!editingUser && !form.password.trim()) {
      setError("Password is required for new users.");
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        const payload: Parameters<typeof updateUser>[0] = {
          id: editingUser._id,
          name: form.name,
          isActive: form.isActive,
          permissions: form.permissions,
          dashboardWidgets: form.dashboardWidgets,
        };
        if (form.password.trim()) payload.password = form.password;
        await updateUser(payload).unwrap();
      } else {
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          isActive: form.isActive,
          permissions: form.permissions,
          dashboardWidgets: form.dashboardWidgets,
        }).unwrap();
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setError(msg || "Failed to save user.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
    setDeleteConfirm(null);
  };

  const permissionSummary = (permissions: PermissionsMap) => {
    const editCount = Object.values(permissions).filter((v) => v === "edit").length;
    const viewCount = Object.values(permissions).filter((v) => v === "view").length;
    const parts = [];
    if (editCount) parts.push(`${editCount} edit`);
    if (viewCount) parts.push(`${viewCount} view`);
    return parts.length ? parts.join(", ") : "No access";
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Admin Users</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage sub-admin accounts and their permissions</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            No sub-admin users yet. Click &quot;Add User&quot; to create one.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Name</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Email</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Permissions</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-[#1a1a2e]">{user.name}</td>
                  <td className="px-5 py-3.5 text-gray-600">{user.email}</td>
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.isActive
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-green-500" : "bg-gray-400"}`}
                      />
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500 text-xs">{permissionSummary(user.permissions)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(user)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#f97316] hover:bg-orange-50 transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user._id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1a1a2e]">
                {editingUser ? "Edit User" : "Add User"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                    disabled={!!editingUser}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password {editingUser && <span className="text-gray-400 font-normal">(leave blank to keep)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder={editingUser ? "New password (optional)" : "Set password"}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      form.isActive ? "bg-[#f97316]" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        form.isActive ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700">
                    {form.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Dashboard Widgets visibility */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <LayoutDashboard className="w-4 h-4 text-[#f97316]" />
                  <h3 className="text-sm font-semibold text-[#1a1a2e]">Dashboard Widgets</h3>
                  <span className="text-xs text-gray-400 font-normal">— choose what this user sees on the dashboard</span>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-gray-100">
                    {DASHBOARD_WIDGETS.map((widget) => (
                      <label
                        key={widget.key}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              dashboardWidgets: {
                                ...f.dashboardWidgets,
                                [widget.key]: !f.dashboardWidgets[widget.key],
                              },
                            }))
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                            form.dashboardWidgets[widget.key] ? "bg-[#f97316]" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              form.dashboardWidgets[widget.key] ? "translate-x-4.5" : "translate-x-0.5"
                            }`}
                          />
                        </button>
                        <span className="text-sm text-gray-700">{widget.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Permissions grid */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#f97316]" />
                  <h3 className="text-sm font-semibold text-[#1a1a2e]">Section Permissions</h3>
                </div>
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Section</th>
                        {LEVEL_LABELS.map((l) => (
                          <th key={l.value} className="text-center px-4 py-2.5 font-semibold text-gray-600 w-20">
                            {l.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {SECTIONS.map((section) => (
                        <tr key={section.key} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-700">{section.label}</td>
                          {LEVEL_LABELS.map((level) => (
                            <td key={level.value} className="text-center px-4 py-2.5">
                              <input
                                type="radio"
                                name={`perm-${section.key}`}
                                value={level.value}
                                checked={form.permissions[section.key] === level.value}
                                onChange={() => handlePermissionChange(section.key, level.value)}
                                className="accent-[#f97316] w-4 h-4 cursor-pointer"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-70 cursor-pointer"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Delete User?</h2>
            <p className="text-sm text-gray-500 mb-5">
              This action cannot be undone. The user will lose access immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
