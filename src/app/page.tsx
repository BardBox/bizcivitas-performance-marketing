"use client";

import { useEffect, useState } from "react";
import Hero from "@/components/Hero";
import StrugglingWith from "@/components/StrugglingWith";
import StopWaiting from "@/components/StopWaiting";
import SuccessStories from "@/components/SuccessStories";
import Membership from "@/components/Membership";
import WhyBizcivitas from "@/components/WhyBizcivitas";
import Footer from "@/components/Footer";
import OfferModal from "@/components/OfferModal";
import EngagementTracker from "@/components/EngagementTracker";
import ReturnVisitorRedirect from "@/components/ReturnVisitorRedirect";
import InquiryModal from "@/components/InquiryModal";
import { API_BASE_URL } from "@/lib/api";

interface LandingPageData {
  content?: string;
  title?: string;
}

export default function Home() {
  const [lpData, setLpData] = useState<LandingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [inquiryOpen, setInquiryOpen] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/pm/landing-pages`)
      .then((r) => r.json())
      .then((data) => {
        const all = data.data || [];
        const home = all.find(
          (p: { slug: string; type: string; status: string }) =>
            p.slug === "bizcivitas-home" &&
            p.type === "page" &&
            p.status === "published"
        );
        setLpData(home || null);
      })
      .catch(() => setLpData(null))
      .finally(() => setLoading(false));
  }, []);

  // Expose inquiry opener for buttons inside admin HTML content
  useEffect(() => {
    (window as any).__openInquiry = () => setInquiryOpen(true);
    const handler = () => setInquiryOpen(true);
    document.addEventListener("open-inquiry", handler);
    return () => document.removeEventListener("open-inquiry", handler);
  }, []);

  // While loading, show nothing (avoids flash)
  if (loading) return null;

  // If admin has custom content for homepage, render it
  if (lpData?.content) {
    return (
      <main className="min-h-screen bg-white">
        <EngagementTracker />
        <ReturnVisitorRedirect />

        <div
          className="lp-content"
          dangerouslySetInnerHTML={{ __html: lpData.content }}
        />

        {/* Sticky CTA bar — mobile */}
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-navy py-3 px-4 flex items-center justify-between gap-4 shadow-2xl md:hidden">
          <p className="text-white text-sm font-medium truncate">Join BizCivitas Today</p>
          <button
            onClick={() => setInquiryOpen(true)}
            className="shrink-0 bg-primary hover:bg-primary-dark text-white font-bold py-2 px-5 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Apply Now
          </button>
        </div>

        <InquiryModal isOpen={inquiryOpen} onClose={() => setInquiryOpen(false)} />
        <OfferModal />
      </main>
    );
  }

  // Fallback — original React components (shown if no admin content set)
  return (
    <main className="min-h-screen">
      <EngagementTracker />
      <ReturnVisitorRedirect />
      <Hero />
      <StrugglingWith />
      <StopWaiting />
      <SuccessStories />
      <Membership />
      <WhyBizcivitas />
      <Footer />
      <OfferModal />
    </main>
  );
}
