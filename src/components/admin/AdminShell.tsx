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
  Mail,
  FileText,
  Plug,
  LogOut,
  Menu,
  X,
  Zap,
  Globe,
  Server,
  Database,
  Cloud,
  MessageSquare,
  MessageCircle,
  BarChart,
  Shield,
  Bot,
  UserCog,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import type { SectionKey } from "@/store/endpoints/adminUsers";

// Map icon name strings to lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Plug, Zap, Globe, Server, Database, Cloud,
  Mail, MessageSquare, CreditCard, BarChart, Shield, Bot,
};

interface PluginNav {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

const navItems: { label: string; href: string; icon: React.ElementType; section: SectionKey }[] = [
  { label: "Dashboard",      href: "/admin",                  icon: LayoutDashboard,   section: "dashboard"  },
  { label: "Inquiries",      href: "/admin/inquiries",        icon: MessageSquareText, section: "inquiries"  },
  { label: "Conversations",  href: "/admin/conversations",    icon: MessageSquare,     section: "inquiries"  },
  { label: "Plans",          href: "/admin/plans",            icon: CreditCard,        section: "plans"      },
  { label: "Members",        href: "/admin/members",          icon: Users,             section: "members"    },
  { label: "Stories",        href: "/admin/stories",          icon: Star,              section: "stories"    },
  { label: "Contacts",       href: "/admin/kanban",           icon: Columns3,          section: "contacts"   },
  { label: "Pipeline",       href: "/admin/scoring",          icon: Gauge,             section: "pipeline"   },
  { label: "Email",          href: "/admin/email",            icon: Mail,              section: "email"      },
  { label: "WhatsApp",       href: "/admin/whatsapp",         icon: MessageCircle,     section: "whatsapp"   },
  { label: "Templates",      href: "/admin/templates",        icon: FileText,          section: "templates"  },
  { label: "API",            href: "/admin/api-integrations", icon: Plug,              section: "api"        },
];

const superAdminNavItems: { label: string; href: string; icon: React.ElementType }[] = [
  { label: "Users",      href: "/admin/users",            icon: UserCog },
];

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pluginNavItems, setPluginNavItems] = useState<PluginNav[]>([]);
  const { canView, isSuperAdmin } = useAdminPermissions();

  useEffect(() => {
    fetch(`${API_BASE_URL}/pm/api-plugins/nav`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setPluginNavItems(data.data);
      })
      .catch(() => {});
  }, []);

  // Don't show sidebar on login page
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const visibleNavItems = navItems.filter((item) => canView(item.section));

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
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => {
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

          {/* Dynamic plugin nav items */}
          {pluginNavItems.length > 0 && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Plugins</p>
              </div>
              {pluginNavItems.map((p) => {
                const href = `/admin/plugins/${p.slug}`;
                const isActive = pathname === href;
                const Icon = ICON_MAP[p.icon] || Plug;
                return (
                  <a
                    key={p.slug}
                    href={href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#f97316] text-white"
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" style={!isActive ? { color: p.color } : undefined} />
                    {p.name}
                  </a>
                );
              })}
            </>
          )}

          {/* Super admin only: Users management */}
          {isSuperAdmin && (
            <>
              <div className="pt-3 pb-1 px-3">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Admin</p>
              </div>
              <a
                href="/admin/users"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === "/admin/users"
                    ? "bg-[#f97316] text-white"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <UserCog className="w-4 h-4" />
                Users
              </a>
            </>
          )}
        </nav>

        {/* Settings + Logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <a
            href="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              pathname === "/admin/settings"
                ? "bg-[#f97316] text-white"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            Settings
          </a>
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
      <div className="flex-1 min-w-0 admin-main">
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
