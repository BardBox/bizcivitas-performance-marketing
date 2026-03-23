import type { Metadata } from "next";
import AdminShell from "@/components/admin/AdminShell";
import StoreProvider from "@/store/StoreProvider";

export const metadata: Metadata = {
  title: "Admin - BizCivitas Performance Marketing",
  robots: "noindex, nofollow",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return<StoreProvider>
  <AdminShell>{children}</AdminShell>
</StoreProvider>;
}
