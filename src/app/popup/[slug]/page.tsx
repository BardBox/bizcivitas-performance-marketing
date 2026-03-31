"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, X, Clock, MousePointer, TrendingUp } from "lucide-react";
import InquiryModal from "@/components/InquiryModal";
import { API_BASE_URL } from "@/lib/api";

interface PopupData {
  _id: string;
  title: string;
  slug: string;
  type: "page" | "popup";
  status: "draft" | "published";
  description?: string;
  content?: string;
  settings?: {
    triggerType?: "time" | "scroll" | "exit_intent";
    triggerValue?: number;
    successMessage?: string;
    redirectUrl?: string;
  };
}

const TRIGGER_ICONS = {
  time:        Clock,
  scroll:      TrendingUp,
  exit_intent: MousePointer,
};

const TRIGGER_LABELS = {
  time:        "Time Delay",
  scroll:      "Scroll Depth",
  exit_intent: "Exit Intent",
};

export default function PopupPreviewRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [popup, setPopup] = useState<PopupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pm/landing-pages`)
      .then((r) => r.json())
      .then((data) => {
        const all: PopupData[] = data.data || [];
        const match = all.find((p) => p.slug === slug && p.type === "popup");
        if (match) {
          setPopup(match);
          document.title = `Preview: ${match.title} | BizCivitas`;
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !popup) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <img src="/images/logo-footer.png" alt="BizCivitas" className="h-10 mb-4" />
        <h1 className="text-2xl font-bold text-navy">Popup not found</h1>
        <p className="text-gray-500 text-sm max-w-sm">
          This popup doesn&apos;t exist or the slug is incorrect.
        </p>
        <a href="/admin/landing-pages" className="mt-2 text-primary underline text-sm">
          Back to admin
        </a>
      </div>
    );
  }

  const triggerType = popup.settings?.triggerType ?? "time";
  const TriggerIcon = TRIGGER_ICONS[triggerType];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Preview bar */}
      <div className="bg-navy text-white px-4 py-2 text-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-semibold text-primary uppercase tracking-wider">Preview</span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-300">{popup.title}</span>
          <span className="text-gray-300">·</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            popup.status === "published" ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"
          }`}>
            {popup.status === "published" ? "Published" : "Draft"}
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <TriggerIcon className="w-3 h-3" />
            {TRIGGER_LABELS[triggerType]}
            {triggerType !== "exit_intent" && popup.settings?.triggerValue != null && (
              <span>({popup.settings.triggerValue}{triggerType === "time" ? "s" : "%"})</span>
            )}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-primary hover:text-primary/80 font-semibold cursor-pointer whitespace-nowrap"
        >
          Show popup
        </button>
      </div>

      {/* Blurred page background */}
      <div className={`transition-all duration-300 ${isOpen ? "blur-sm pointer-events-none select-none" : ""}`}>
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-6 opacity-40">
          <div className="h-8 bg-gray-300 rounded-full w-2/3" />
          <div className="h-4 bg-gray-200 rounded-full w-full" />
          <div className="h-4 bg-gray-200 rounded-full w-5/6" />
          <div className="h-4 bg-gray-200 rounded-full w-4/6" />
          <div className="h-32 bg-gray-200 rounded-2xl w-full mt-8" />
          <div className="h-4 bg-gray-200 rounded-full w-3/4" />
          <div className="h-4 bg-gray-200 rounded-full w-full" />
          <div className="h-4 bg-gray-200 rounded-full w-2/3" />
        </div>
      </div>

      {/* Popup overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {popup.content ? (
              <div
                className="popup-content"
                dangerouslySetInnerHTML={{ __html: popup.content }}
              />
            ) : (
              /* Default popup layout if no custom HTML */
              <div className="bg-gradient-to-br from-primary via-orange-500 to-yellow-500 p-8 text-center relative overflow-hidden">
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full" />
                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
                <div className="relative z-10">
                  <img
                    src="/images/square.png"
                    alt="BizCivitas"
                    className="w-16 h-16 mx-auto mb-4 rounded-full bg-white p-2 object-contain"
                  />
                  <h2 className="text-white text-2xl font-bold mb-2">{popup.title}</h2>
                  {popup.description && (
                    <p className="text-white/90 text-sm mb-6">{popup.description}</p>
                  )}
                  <button
                    onClick={() => { setIsOpen(false); setInquiryOpen(true); }}
                    className="bg-white text-primary font-bold py-3 px-8 rounded-xl text-sm transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Apply Now
                  </button>
                  <p className="text-white/60 text-xs mt-4">No spam. Cancel anytime.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .popup-content h1, .popup-content h2 { font-weight: 700; color: #1a1a2e; }
        .popup-content p { color: #4b5563; }
        .popup-content img { max-width: 100%; height: auto; }
      `}</style>
    </div>
  );
}
