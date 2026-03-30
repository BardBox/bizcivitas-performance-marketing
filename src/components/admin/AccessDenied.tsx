import { ShieldOff } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <ShieldOff className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Access Denied</h2>
        <p className="text-gray-500 text-sm max-w-sm">
          You don&apos;t have permission to view this section. Contact your administrator to request access.
        </p>
      </div>
    </div>
  );
}
