"use client";

import { useState } from "react";
import {
  Plus, Pencil, Trash2, Loader2, X, ClipboardList,
  GripVertical, ChevronDown, CheckSquare, AlignLeft,
  Type, Phone, Mail, Hash, Calendar,
} from "lucide-react";
import {
  useGetFormsQuery,
  useCreateFormMutation,
  useUpdateFormMutation,
  useDeleteFormMutation,
  type Form,
  type FormField,
  type FormFieldType,
} from "@/store/endpoints/forms";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { AccessDenied } from "@/components/admin/AccessDenied";

const FIELD_TYPE_OPTIONS: { value: FormFieldType; label: string; icon: React.ElementType }[] = [
  { value: "text",     label: "Short Text",  icon: Type },
  { value: "textarea", label: "Long Text",   icon: AlignLeft },
  { value: "email",    label: "Email",       icon: Mail },
  { value: "phone",    label: "Phone",       icon: Phone },
  { value: "number",   label: "Number",      icon: Hash },
  { value: "date",     label: "Date",        icon: Calendar },
  { value: "select",   label: "Dropdown",    icon: ChevronDown },
  { value: "radio",    label: "Radio",       icon: CheckSquare },
  { value: "checkbox", label: "Checkbox",    icon: CheckSquare },
];

const makeId = () => Math.random().toString(36).slice(2, 9);

const makeField = (): FormField => ({
  id: makeId(),
  type: "text",
  label: "",
  placeholder: "",
  required: false,
  options: [],
});

interface FormState {
  title: string;
  description: string;
  status: "active" | "inactive";
  successMessage: string;
  redirectUrl: string;
  fields: FormField[];
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  status: "active",
  successMessage: "Thank you! Your response has been submitted.",
  redirectUrl: "",
  fields: [],
};

const NEEDS_OPTIONS: FormFieldType[] = ["select", "radio", "checkbox"];

export default function FormsPage() {
  const { canView, canEdit } = useAdminPermissions();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedField, setExpandedField] = useState<string | null>(null);

  const { data: forms = [], isLoading } = useGetFormsQuery();
  const [createForm] = useCreateFormMutation();
  const [updateForm] = useUpdateFormMutation();
  const [deleteForm] = useDeleteFormMutation();

  if (!canView("forms")) return <AccessDenied />;

  const openCreate = () => {
    setEditingForm(null);
    setForm(EMPTY_FORM);
    setExpandedField(null);
    setError("");
    setModalOpen(true);
  };

  const openEdit = (f: Form) => {
    setEditingForm(f);
    setForm({
      title: f.title,
      description: f.description ?? "",
      status: f.status,
      successMessage: f.successMessage ?? "Thank you! Your response has been submitted.",
      redirectUrl: f.redirectUrl ?? "",
      fields: f.fields.map((field) => ({ ...field, options: field.options ?? [] })),
    });
    setExpandedField(null);
    setError("");
    setModalOpen(true);
  };

  const addField = () => {
    const newField = makeField();
    setForm((f) => ({ ...f, fields: [...f.fields, newField] }));
    setExpandedField(newField.id);
  };

  const removeField = (id: string) => {
    setForm((f) => ({ ...f, fields: f.fields.filter((field) => field.id !== id) }));
    if (expandedField === id) setExpandedField(null);
  };

  const updateField = (id: string, patch: Partial<FormField>) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  };

  const addOption = (fieldId: string) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((field) =>
        field.id === fieldId
          ? { ...field, options: [...(field.options ?? []), ""] }
          : field
      ),
    }));
  };

  const updateOption = (fieldId: string, idx: number, value: string) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((field) => {
        if (field.id !== fieldId) return field;
        const options = [...(field.options ?? [])];
        options[idx] = value;
        return { ...field, options };
      }),
    }));
  };

  const removeOption = (fieldId: string, idx: number) => {
    setForm((f) => ({
      ...f,
      fields: f.fields.map((field) => {
        if (field.id !== fieldId) return field;
        const options = (field.options ?? []).filter((_, i) => i !== idx);
        return { ...field, options };
      }),
    }));
  };

  const handleSave = async () => {
    setError("");
    if (!form.title.trim()) { setError("Form title is required."); return; }
    if (form.fields.length === 0) { setError("Add at least one field."); return; }
    const emptyLabel = form.fields.find((f) => !f.label.trim());
    if (emptyLabel) { setError("All fields must have a label."); return; }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description || undefined,
        status: form.status,
        successMessage: form.successMessage || undefined,
        redirectUrl: form.redirectUrl || undefined,
        fields: form.fields,
      };
      if (editingForm) {
        await updateForm({ id: editingForm._id, ...payload }).unwrap();
      } else {
        await createForm(payload).unwrap();
      }
      setModalOpen(false);
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message;
      setError(msg || "Failed to save form. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteForm(id);
    setDeleteConfirm(null);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const FieldTypeIcon = ({ type }: { type: FormFieldType }) => {
    const option = FIELD_TYPE_OPTIONS.find((o) => o.value === type);
    const Icon = option?.icon ?? Type;
    return <Icon className="w-3.5 h-3.5" />;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a2e]">Forms</h1>
          <p className="text-sm text-gray-500 mt-0.5">Build and manage lead capture forms</p>
        </div>
        {canEdit("forms") && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#f97316] hover:bg-[#ea580c] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Form
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#f97316]" />
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <ClipboardList className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">No forms yet.</p>
            {canEdit("forms") && (
              <button
                onClick={openCreate}
                className="mt-3 text-sm text-[#f97316] hover:underline cursor-pointer"
              >
                Create your first form
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Form</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Fields</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Submissions</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">Last Updated</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {forms.map((f) => (
                <tr key={f._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#1a1a2e]">{f.title}</p>
                    {f.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{f.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-700">{f.fields.length}</span>
                      <span className="text-gray-400">field{f.fields.length !== 1 ? "s" : ""}</span>
                    </div>
                    {f.fields.length > 0 && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {f.fields.slice(0, 4).map((field) => (
                          <span key={field.id} className="inline-flex items-center gap-0.5 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                            <FieldTypeIcon type={field.type} />
                            {field.label || field.type}
                          </span>
                        ))}
                        {f.fields.length > 4 && (
                          <span className="text-[10px] text-gray-400">+{f.fields.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-600 font-medium">{f.submissions ?? 0}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      f.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${f.status === "active" ? "bg-green-500" : "bg-gray-400"}`} />
                      {f.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{formatDate(f.updatedAt)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit("forms") && (
                        <>
                          <button
                            onClick={() => openEdit(f)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#f97316] hover:bg-orange-50 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(f._id)}
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-[#1a1a2e]">
                {editingForm ? "Edit Form" : "Create Form"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              {/* Title + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Form Title <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Contact Us, Request Demo, Newsletter Signup"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short description (optional)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
                </div>
              </div>

              {/* Status toggle */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: f.status === "active" ? "inactive" : "active" }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    form.status === "active" ? "bg-[#f97316]" : "bg-gray-200"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    form.status === "active" ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
                <span className="text-sm font-medium text-gray-700">
                  {form.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Form Fields Builder */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#f97316]" />
                    <h3 className="text-sm font-semibold text-[#1a1a2e]">Form Fields</h3>
                    <span className="text-xs text-gray-400 font-normal">({form.fields.length} field{form.fields.length !== 1 ? "s" : ""})</span>
                  </div>
                  <button
                    type="button"
                    onClick={addField}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#f97316] hover:text-[#ea580c] transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Field
                  </button>
                </div>

                {form.fields.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center">
                    <p className="text-sm text-gray-400 mb-2">No fields yet</p>
                    <button
                      type="button"
                      onClick={addField}
                      className="text-sm text-[#f97316] hover:underline cursor-pointer"
                    >
                      + Add your first field
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    {form.fields.map((field, idx) => (
                      <div key={field.id} className="bg-white">
                        {/* Field row header */}
                        <div
                          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => setExpandedField(expandedField === field.id ? null : field.id)}
                        >
                          <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                          <span className="text-xs font-semibold text-gray-400 w-5 shrink-0">{idx + 1}</span>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              <FieldTypeIcon type={field.type} />
                              {FIELD_TYPE_OPTIONS.find((o) => o.value === field.type)?.label ?? field.type}
                            </span>
                            <span className="text-sm font-medium text-gray-700 truncate">
                              {field.label || <span className="text-gray-400 italic">Untitled field</span>}
                            </span>
                            {field.required && (
                              <span className="text-xs text-red-400 font-medium shrink-0">Required</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                            className="p-1 rounded text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors cursor-pointer shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Expanded field config */}
                        {expandedField === field.id && (
                          <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3 pt-3">
                              {/* Field type */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Field Type</label>
                                <div className="relative">
                                  <select
                                    value={field.type}
                                    onChange={(e) => updateField(field.id, {
                                      type: e.target.value as FormFieldType,
                                      options: NEEDS_OPTIONS.includes(e.target.value as FormFieldType) ? (field.options ?? []) : [],
                                    })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs appearance-none focus:outline-none focus:border-[#f97316] bg-white pr-7"
                                  >
                                    {FIELD_TYPE_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                                </div>
                              </div>
                              {/* Label */}
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Label <span className="text-red-400">*</span></label>
                                <input
                                  type="text"
                                  value={field.label}
                                  onChange={(e) => updateField(field.id, { label: e.target.value })}
                                  placeholder="Field label"
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#f97316]"
                                />
                              </div>
                              {/* Placeholder */}
                              {!["checkbox", "radio"].includes(field.type) && (
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
                                  <input
                                    type="text"
                                    value={field.placeholder ?? ""}
                                    onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                                    placeholder="Hint text..."
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#f97316]"
                                  />
                                </div>
                              )}
                              {/* Required */}
                              <div className="flex items-center gap-2 pt-4">
                                <button
                                  type="button"
                                  onClick={() => updateField(field.id, { required: !field.required })}
                                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer ${
                                    field.required ? "bg-[#f97316]" : "bg-gray-200"
                                  }`}
                                >
                                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                    field.required ? "translate-x-4.5" : "translate-x-0.5"
                                  }`} />
                                </button>
                                <span className="text-xs font-medium text-gray-600">Required</span>
                              </div>
                            </div>

                            {/* Options for select/radio/checkbox */}
                            {NEEDS_OPTIONS.includes(field.type) && (
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-medium text-gray-600">Options</label>
                                  <button
                                    type="button"
                                    onClick={() => addOption(field.id)}
                                    className="text-xs text-[#f97316] hover:underline cursor-pointer"
                                  >
                                    + Add option
                                  </button>
                                </div>
                                {(field.options ?? []).length === 0 ? (
                                  <p className="text-xs text-gray-400 italic">No options yet. Add at least one.</p>
                                ) : (
                                  <div className="space-y-1.5">
                                    {(field.options ?? []).map((opt, oidx) => (
                                      <div key={oidx} className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={opt}
                                          onChange={(e) => updateOption(field.id, oidx, e.target.value)}
                                          placeholder={`Option ${oidx + 1}`}
                                          className="flex-1 border border-gray-300 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-[#f97316]"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => removeOption(field.id, oidx)}
                                          className="text-gray-300 hover:text-red-400 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Success / Redirect */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Success Message</label>
                  <input
                    type="text"
                    value={form.successMessage}
                    onChange={(e) => setForm((f) => ({ ...f, successMessage: e.target.value }))}
                    placeholder="Shown after form submission"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Redirect URL <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={form.redirectUrl}
                    onChange={(e) => setForm((f) => ({ ...f, redirectUrl: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#f97316] focus:ring-1 focus:ring-[#f97316]/30"
                  />
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
                {editingForm ? "Save Changes" : "Create Form"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-[#1a1a2e] mb-2">Delete Form?</h2>
            <p className="text-sm text-gray-500 mb-5">
              This will permanently delete the form and all its configuration.
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
