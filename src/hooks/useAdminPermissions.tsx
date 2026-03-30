"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { PermissionLevel, PermissionsMap, SectionKey, DashboardWidget, DashboardWidgetsMap } from "@/store/endpoints/adminUsers";

interface AdminUser {
  email: string;
  role: "pm-admin" | "pm-subadmin";
  name?: string;
  userId?: string;
  permissions: PermissionsMap | null; // null = super admin (full access)
  dashboardWidgets?: DashboardWidgetsMap | null;
}

interface PermissionContextValue {
  user: AdminUser | null;
  loading: boolean;
  isSuperAdmin: boolean;
  canView: (section: SectionKey) => boolean;
  canEdit: (section: SectionKey) => boolean;
  canViewWidget: (widget: DashboardWidget) => boolean;
}

const AdminPermissionContext = createContext<PermissionContextValue>({
  user: null,
  loading: true,
  isSuperAdmin: false,
  canView: () => true,
  canEdit: () => true,
  canViewWidget: () => true,
});

export function AdminPermissionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/verify")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated && data?.user) {
          setUser(data.user as AdminUser);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isSuperAdmin = user?.role === "pm-admin";

  const canView = (section: SectionKey): boolean => {
    if (!user) return false;
    if (user.permissions === null) return true; // super admin
    const level: PermissionLevel = (user.permissions as PermissionsMap)[section] ?? "none";
    return level === "edit" || level === "view";
  };

  const canEdit = (section: SectionKey): boolean => {
    if (!user) return false;
    if (user.permissions === null) return true; // super admin
    const level: PermissionLevel = (user.permissions as PermissionsMap)[section] ?? "none";
    return level === "edit";
  };

  const canViewWidget = (widget: DashboardWidget): boolean => {
    if (!user) return false;
    if (user.permissions === null) return true; // super admin sees everything
    if (!user.dashboardWidgets) return true; // no config = show all
    return user.dashboardWidgets[widget] !== false;
  };

  return (
    <AdminPermissionContext.Provider value={{ user, loading, isSuperAdmin, canView, canEdit, canViewWidget }}>
      {children}
    </AdminPermissionContext.Provider>
  );
}

export function useAdminPermissions(): PermissionContextValue {
  return useContext(AdminPermissionContext);
}
