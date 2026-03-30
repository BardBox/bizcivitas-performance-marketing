import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import StoreProvider from "@/store/StoreProvider";
import { AdminPermissionProvider } from "@/hooks/useAdminPermissions";
import { ThemeProvider } from "@/components/admin/ThemeProvider";

export const metadata: Metadata = {
  title: "Admin - BizCivitas Performance Marketing",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StoreProvider>
      <AdminPermissionProvider>
        <ThemeProvider>
          <AdminShell>{children}</AdminShell>
        </ThemeProvider>
      </AdminPermissionProvider>
    </StoreProvider>
  );
}
