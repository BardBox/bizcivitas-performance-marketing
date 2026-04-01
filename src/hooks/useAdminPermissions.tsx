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
  refetch: () => Promise<void>;
}

const AdminPermissionContext = createContext<PermissionContextValue>({
  user: null,
  loading: true,
  isSuperAdmin: false,
  canView: () => true,
  canEdit: () => true,
  canViewWidget: () => true,
  refetch: async () => {},
});

export function AdminPermissionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/verify");
      const data = res.ok ? await res.json() : null;
      if (data?.authenticated && data?.user) {
        setUser(data.user as AdminUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const isSuperAdmin = user?.role === "pm-admin";

  const canView = (section: SectionKey): boolean => {
    if (!user) return false;
    if (user.permissions == null) return true; // super admin (null or undefined)
    const level: PermissionLevel = (user.permissions as PermissionsMap)[section] ?? "none";
    return level === "edit" || level === "view";
  };

  const canEdit = (section: SectionKey): boolean => {
    if (!user) return false;
    if (user.permissions == null) return true; // super admin (null or undefined)
    const level: PermissionLevel = (user.permissions as PermissionsMap)[section] ?? "none";
    return level === "edit";
  };

  const canViewWidget = (widget: DashboardWidget): boolean => {
    if (!user) return false;
    if (user.permissions == null) return true; // super admin sees everything
    if (!user.dashboardWidgets) return true; // no config = show all
    return user.dashboardWidgets[widget] !== false;
  };

  return (
    <AdminPermissionContext.Provider value={{ user, loading, isSuperAdmin, canView, canEdit, canViewWidget, refetch: fetchUser }}>
      {children}
    </AdminPermissionContext.Provider>
  );
}

export function useAdminPermissions(): PermissionContextValue {
  return useContext(AdminPermissionContext);
}
