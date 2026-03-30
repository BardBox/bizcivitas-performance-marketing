import { Eye } from "lucide-react";

export function ViewOnlyBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-700">
      <Eye className="w-4 h-4 shrink-0" />
      You have view-only access to this section. Contact your administrator to request edit permissions.
    </div>
  );
}
