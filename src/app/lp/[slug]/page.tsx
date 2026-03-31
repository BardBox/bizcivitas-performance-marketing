"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, ArrowRight, X } from "lucide-react";
import InquiryModal from "@/components/InquiryModal";
import EngagementTracker from "@/components/EngagementTracker";
import Footer from "@/components/Footer";
import { API_BASE_URL } from "@/lib/api";

interface LandingPageData {
  _id: string;
  title: string;
  slug: string;
  type: "page" | "popup";
  status: "draft" | "published";
  description?: string;
  content?: string;
  buildMethod?: "visual" | "code" | "upload" | "github";
  subdomain?: string;
  staticPath?: string;
  settings?: {
    triggerType?: "time" | "scroll" | "exit_intent";
    triggerValue?: number;
    successMessage?: string;
    redirectUrl?: string;
  };
}

export default function LandingPageRoute() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LandingPageData | null>(null);
  const [popups, setPopups] = useState<LandingPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageNotFound, setPageNotFound] = useState(false);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [activePopup, setActivePopup] = useState<LandingPageData | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pm/landing-pages`)
      .then((r) => r.json())
      .then((data) => {
        const all: LandingPageData[] = data.data || [];
        // Match by slug OR by subdomain (when accessed via subdomain rewrite)
        const match = all.find(
          (p) =>
            p.type === "page" &&
            p.status === "published" &&
            (p.slug === slug || p.subdomain === slug)
        );
        if (match) {
          setPage(match);
          document.title = `${match.title} | BizCivitas`;
          // If static (upload/github) — redirect to the static file served by the backend
          if ((match.buildMethod === "upload" || match.buildMethod === "github") && match.staticPath) {
            const backendBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
            window.location.href = `${backendBase}${match.staticPath}index.html`;
            return;
          }
        } else {
          setPageNotFound(true);
        }
        setPopups(all.filter((p) => p.type === "popup" && p.status === "published"));
      })
      .catch(() => setPageNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  // Fire popup triggers once page is loaded
  useEffect(() => {
    if (!page || popups.length === 0) return;
    const popup = popups[0]; // first published popup
    const trigger = popup.settings?.triggerType ?? "time";
    const value = popup.settings?.triggerValue ?? 5;

    if (trigger === "time") {
      const t = setTimeout(() => setActivePopup(popup), value * 1000);
      return () => clearTimeout(t);
    }

    if (trigger === "scroll") {
      const onScroll = () => {
        const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (pct >= value) {
          setActivePopup(popup);
          window.removeEventListener("scroll", onScroll);
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    if (trigger === "exit_intent") {
      const onMouseOut = (e: MouseEvent) => {
        if (e.clientY <= 0) {
          setActivePopup(popup);
          document.removeEventListener("mouseleave", onMouseOut);
        }
      };
      document.addEventListener("mouseleave", onMouseOut);
      return () => document.removeEventListener("mouseleave", onMouseOut);
    }
  }, [page, popups]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (pageNotFound || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
        <img src="/images/logo-footer.png" alt="BizCivitas" className="h-10 mb-4" />
        <h1 className="text-2xl font-bold text-navy">Page not found</h1>
        <p className="text-gray-500 text-sm max-w-sm">
          This page doesn&apos;t exist or hasn&apos;t been published yet.
        </p>
        <a href="/" className="mt-2 text-primary underline text-sm">
          Go to homepage
        </a>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <EngagementTracker />

      {/* Page content rendered from admin HTML editor */}
      {page.content ? (
        <div
          className="lp-content"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      ) : (
        /* Default hero if no custom content */
        <div className="py-24 px-6 text-center max-w-3xl mx-auto">
          <img src="/images/logo-footer.png" alt="BizCivitas" className="h-10 mx-auto mb-8" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-navy leading-tight mb-4">
            {page.title}
          </h1>
          {page.description && (
            <p className="text-gray-600 text-lg mb-8">{page.description}</p>
          )}
          <button
            onClick={() => setInquiryOpen(true)}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-xl text-lg transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      <Footer />

      {/* Sticky CTA bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy py-3 px-4 flex items-center justify-between gap-4 shadow-2xl md:hidden">
        <p className="text-white text-sm font-medium truncate">
          Join BizCivitas Today
        </p>
        <button
          onClick={() => setInquiryOpen(true)}
          className="shrink-0 bg-primary hover:bg-primary-dark text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors cursor-pointer"
        >
          Apply Now
        </button>
      </div>

      {/* Desktop sticky CTA */}
      <button
        onClick={() => setInquiryOpen(true)}
        className="hidden md:flex fixed bottom-8 right-8 z-40 items-center gap-2 bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-full shadow-2xl text-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
      >
        Apply Now
        <ArrowRight className="w-4 h-4" />
      </button>

      <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />

      {/* Popup overlay triggered by settings */}
      {activePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.3s_ease-out]">
            <button
              onClick={() => setActivePopup(null)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {activePopup.content ? (
              <div
                className="popup-content"
                dangerouslySetInnerHTML={{ __html: activePopup.content }}
              />
            ) : (
              <div className="px-8 py-10 text-center">
                <h2 className="text-2xl font-bold text-navy mb-3">{activePopup.title}</h2>
                {activePopup.description && (
                  <p className="text-gray-500 mb-6">{activePopup.description}</p>
                )}
                <button
                  onClick={() => { setActivePopup(null); setInquiryOpen(true); }}
                  className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-xl transition-all cursor-pointer"
                >
                  Apply Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to   { opacity: 1; transform: scale(1); }
        }
        .lp-content h1, .lp-content h2, .lp-content h3 { font-weight: 700; color: #1a1a2e; }
        .lp-content p { color: #4b5563; line-height: 1.75; }
        .lp-content a { color: #f97316; }
        .lp-content img { max-width: 100%; height: auto; }
        .lp-content ul, .lp-content ol { padding-left: 1.5rem; }
      `}</style>
    </main>
  );
}
