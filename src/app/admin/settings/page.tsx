"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/admin/ThemeProvider";
import {
  Settings,
  Moon,
  Sun,
  Monitor,
  Bell,
  BellOff,
  Globe,
  Clock,
  Shield,
  User,
  Mail,
  Phone,
  Key,
  Database,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Palette,
  Layout,
  Eye,
  EyeOff,
  RefreshCw,
  Info,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

/* ─── types ─── */
type Theme = "dark" | "light" | "system";
type AccentColor = "orange" | "blue" | "green" | "purple" | "red";

interface AppSettings {
  theme: Theme;
  accent: AccentColor;
  compactSidebar: boolean;
  sidebarCollapsed: boolean;
  showAvatarInitials: boolean;
  notifyNewInquiry: boolean;
  notifyNewMessage: boolean;
  notifySoundEnabled: boolean;
  autoRefreshInterval: number; // seconds
  dateFormat: string;
  timezone: string;
  language: string;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  accent: "orange",
  compactSidebar: false,
  sidebarCollapsed: false,
  showAvatarInitials: true,
  notifyNewInquiry: true,
  notifyNewMessage: true,
  notifySoundEnabled: false,
  autoRefreshInterval: 5,
  dateFormat: "DD/MM/YYYY",
  timezone: "Asia/Kolkata",
  language: "en",
};

const STORAGE_KEY = "bizcivitas_admin_settings";

const ACCENT_OPTIONS: { value: AccentColor; label: string; hex: string }[] = [
  { value: "orange", label: "Orange",  hex: "#f97316" },
  { value: "blue",   label: "Blue",    hex: "#3b82f6" },
  { value: "green",  label: "Green",   hex: "#22c55e" },
  { value: "purple", label: "Purple",  hex: "#a855f7" },
  { value: "red",    label: "Red",     hex: "#ef4444" },
];

function load(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function save(s: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/* ─── Toggle ─── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${on ? "bg-orange-500" : "bg-gray-700"}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

/* ─── Section wrapper ─── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-800">
        <span className="text-orange-400">{icon}</span>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="divide-y divide-gray-800/60">{children}</div>
    </div>
  );
}

/* ─── Row ─── */
function Row({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ──────────────────── Main page ──────────────────── */
export default function SettingsPage() {
  const { setTheme: applyTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [saved, setSaved] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{ name?: string; email?: string } | null>(null);
  const [showApiUrl, setShowApiUrl] = useState(false);

  /* load on mount */
  useEffect(() => {
    setSettings(load());
    // fetch current admin identity
    fetch("/api/admin/verify")
      .then((r) => r.json())
      .then((d) => { if (d.admin) setAdminInfo(d.admin); })
      .catch(() => {});
  }, []);

  const update = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
    // Apply theme immediately via context if theme changed
    if (patch.theme) applyTheme(patch.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetAll = () => {
    save(DEFAULTS);
    setSettings(DEFAULTS);
    applyTheme(DEFAULTS.theme);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const clearCache = () => {
    const keys = Object.keys(localStorage).filter((k) => k !== STORAGE_KEY);
    keys.forEach((k) => localStorage.removeItem(k));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white leading-none">Settings</h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your admin preferences</p>
          </div>
        </div>
        {saved && (
          <div className="flex items-center gap-1.5 text-green-400 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            Saved
          </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-6 space-y-5">

        {/* ── Appearance ── */}
        <Section title="Appearance" icon={<Palette className="w-4 h-4" />}>
          {/* Theme */}
          <Row label="Theme" description="Choose your preferred color scheme">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
              {(["light", "system", "dark"] as Theme[]).map((t) => {
                const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor;
                return (
                  <button
                    key={t}
                    onClick={() => update({ theme: t })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${
                      settings.theme === t ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t}
                  </button>
                );
              })}
            </div>
          </Row>

          {/* Accent color */}
          <Row label="Accent Color" description="Primary color used across the admin panel">
            <div className="flex items-center gap-2">
              {ACCENT_OPTIONS.map(({ value, label, hex }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => update({ accent: value })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    settings.accent === value ? "border-white scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </Row>

          {/* Compact sidebar */}
          <Row label="Compact Sidebar" description="Reduce sidebar item padding">
            <Toggle on={settings.compactSidebar} onChange={(v) => update({ compactSidebar: v })} />
          </Row>

          {/* Avatar initials */}
          <Row label="Show Avatar Initials" description="Display initials in contact avatars">
            <Toggle on={settings.showAvatarInitials} onChange={(v) => update({ showAvatarInitials: v })} />
          </Row>
        </Section>

        {/* ── Notifications ── */}
        <Section title="Notifications" icon={<Bell className="w-4 h-4" />}>
          <Row label="New Inquiry Alert" description="Browser notification when a new inquiry arrives">
            <Toggle on={settings.notifyNewInquiry} onChange={(v) => update({ notifyNewInquiry: v })} />
          </Row>
          <Row label="New Message Alert" description="Notify when a conversation message comes in">
            <Toggle on={settings.notifyNewMessage} onChange={(v) => update({ notifyNewMessage: v })} />
          </Row>
          <Row label="Sound Effects" description="Play a sound on new notifications">
            <Toggle on={settings.notifySoundEnabled} onChange={(v) => update({ notifySoundEnabled: v })} />
          </Row>
        </Section>

        {/* ── Sync & Display ── */}
        <Section title="Sync & Display" icon={<RefreshCw className="w-4 h-4" />}>
          <Row label="Auto Refresh Interval" description="How often conversations auto-sync (seconds)">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
              {[5, 10, 30, 60].map((s) => (
                <button
                  key={s}
                  onClick={() => update({ autoRefreshInterval: s })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    settings.autoRefreshInterval === s ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {s}s
                </button>
              ))}
            </div>
          </Row>

          <Row label="Date Format" description="How dates are displayed in the UI">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-0.5">
              {["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"].map((f) => (
                <button
                  key={f}
                  onClick={() => update({ dateFormat: f })}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    settings.dateFormat === f ? "bg-orange-500 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  {f === "DD/MM/YYYY" ? "D/M/Y" : f === "MM/DD/YYYY" ? "M/D/Y" : "Y-M-D"}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Timezone" description="Used for displaying message timestamps">
            <select
              value={settings.timezone}
              onChange={(e) => update({ timezone: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="Asia/Kolkata">IST (India)</option>
              <option value="UTC">UTC</option>
              <option value="America/New_York">EST (New York)</option>
              <option value="America/Los_Angeles">PST (Los Angeles)</option>
              <option value="Europe/London">GMT (London)</option>
              <option value="Asia/Dubai">GST (Dubai)</option>
              <option value="Asia/Singapore">SGT (Singapore)</option>
            </select>
          </Row>

          <Row label="Language" description="Interface language">
            <select
              value={settings.language}
              onChange={(e) => update({ language: e.target.value })}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="gu">Gujarati</option>
            </select>
          </Row>
        </Section>

        {/* ── Account ── */}
        <Section title="Account" icon={<User className="w-4 h-4" />}>
          {adminInfo?.name && (
            <Row label="Name" description="Your admin account name">
              <span className="text-xs text-gray-400">{adminInfo.name}</span>
            </Row>
          )}
          {adminInfo?.email && (
            <Row label="Email" description="Logged in as">
              <span className="text-xs text-gray-400">{adminInfo.email}</span>
            </Row>
          )}
          <div
            className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-800/40 cursor-pointer transition-colors"
            onClick={() => window.location.href = "/admin/login"}
          >
            <div>
              <p className="text-sm text-white">Change Password</p>
              <p className="text-xs text-gray-500 mt-0.5">Update your admin login credentials</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </div>
        </Section>

        {/* ── Security ── */}
        <Section title="Security" icon={<Shield className="w-4 h-4" />}>
          <Row label="Session Timeout" description="Auto logout after inactivity">
            <select
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              defaultValue="never"
            >
              <option value="never">Never</option>
              <option value="30m">30 minutes</option>
              <option value="1h">1 hour</option>
              <option value="4h">4 hours</option>
              <option value="8h">8 hours</option>
            </select>
          </Row>
          <Row label="Two-Factor Auth" description="Add an extra layer of security">
            <span className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full">Coming soon</span>
          </Row>
        </Section>

        {/* ── System ── */}
        <Section title="System" icon={<Info className="w-4 h-4" />}>
          <Row label="API Base URL" description="Backend server endpoint">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-mono max-w-[160px] truncate">
                {showApiUrl ? API_BASE_URL : "••••••••••••••"}
              </span>
              <button
                onClick={() => setShowApiUrl((v) => !v)}
                className="text-gray-600 hover:text-white transition-colors"
              >
                {showApiUrl ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </Row>
          <Row label="Version" description="Admin panel build">
            <span className="text-xs text-gray-500 font-mono">v1.0.0</span>
          </Row>
          <Row label="Environment" description="Current deployment environment">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
              process.env.NODE_ENV === "production"
                ? "bg-green-500/15 text-green-400 border border-green-500/25"
                : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25"
            }`}>
              {process.env.NODE_ENV === "production" ? "Production" : "Development"}
            </span>
          </Row>
        </Section>

        {/* ── Data & Storage ── */}
        <Section title="Data & Storage" icon={<Database className="w-4 h-4" />}>
          <Row label="Clear App Cache" description="Remove cached data from local storage">
            <button
              onClick={clearCache}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cache
            </button>
          </Row>
          <Row label="Reset All Settings" description="Restore all preferences to defaults">
            <button
              onClick={resetAll}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </Row>
        </Section>

        <p className="text-center text-xs text-gray-700 pb-4">
          BizCivitas Admin · Settings are saved locally in your browser
        </p>
      </div>
    </div>
  );
}
