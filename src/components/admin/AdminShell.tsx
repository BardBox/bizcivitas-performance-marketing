"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquareText,
  CreditCard,
  Users,
  Gauge,
  Star,
  Columns3,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Inquiries",
    href: "/admin/inquiries",
    icon: MessageSquareText,
  },
  {
    label: "Plans",
    href: "/admin/plans",
    icon: CreditCard,
  },
  {
    label: "Members",
    href: "/admin/members",
    icon: Users,
  },
  {
    label: "Stories",
    href: "/admin/stories",
    icon: Star,
  },
  {
    label: "Context",
    href: "/admin/kanban",
    icon: Columns3,
  },
  {
    label: "Pipeline",
    href: "/admin/scoring",
    icon: Gauge,
  },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Don't show sidebar on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-56 bg-[#1a1a2e] text-white flex flex-col z-50 transition-transform md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between border-b border-white/10">
          <div>
            <img
              src="/images/logo-footer.png"
              alt="BizCivitas"
              className="h-8"
            />
            <p className="text-[10px] text-gray-400 mt-1 tracking-wider uppercase">
              PM Admin
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#f97316] text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden bg-[#1a1a2e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-300 hover:text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <img
            src="/images/logo-footer.png"
            alt="BizCivitas"
            className="h-7"
          />
          <div className="w-5" />
        </header>

        <main>{children}</main>
      </div>
    </div>
  );
}
