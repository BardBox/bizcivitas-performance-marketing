"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowRight, X, Clock, CreditCard } from "lucide-react";

const REDIRECT_DELAY = 5; // seconds

export default function ReturnVisitorRedirect() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(REDIRECT_DELAY);
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if visitor is coming from email/WhatsApp (UTM params present)
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const urlInquiryId = params.get("inquiry_id");

    // Only trigger for visitors coming from email/WhatsApp campaigns
    const isFromCampaign = utmSource || utmMedium;
    if (!isFromCampaign) return;

    // Get inquiry ID from URL param or localStorage
    const storedInquiryId = localStorage.getItem("pm_inquiry_id");
    const resolvedId = urlInquiryId || storedInquiryId;

    if (!resolvedId) return; // No inquiry found — they haven't filled the form yet

    setInquiryId(resolvedId);
    setVisible(true);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!visible || dismissed) return;

    if (countdown <= 0) {
      window.location.href = `/checkout?inquiry_id=${inquiryId}`;
      return;
    }

    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [visible, dismissed, countdown, inquiryId]);

  const handleRedirectNow = useCallback(() => {
    if (inquiryId) {
      window.location.href = `/checkout?inquiry_id=${inquiryId}`;
    }
  }, [inquiryId]);

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  const progress = ((REDIRECT_DELAY - countdown) / REDIRECT_DELAY) * 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-md animate-[scaleIn_0.3s_ease-out]">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top gradient bar */}
          <div className="bg-gradient-to-r from-primary via-orange-500 to-yellow-500 px-6 py-5 text-center relative overflow-hidden">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />

            <div className="relative z-10">
              <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <CreditCard className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-white text-xl font-bold">Welcome Back!</h2>
              <p className="text-white/80 text-sm mt-1">
                Your application is ready for payment
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 text-center">
            <p className="text-gray-600 text-sm mb-5">
              You&apos;ve already submitted your application.
              <br />
              Complete your payment to activate your membership.
            </p>

            {/* Countdown */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-500">
                Redirecting in <span className="font-bold text-primary text-lg">{countdown}</span> seconds
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-orange-500 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={handleRedirectNow}
                className="w-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white font-bold py-3.5 rounded-xl text-sm transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 active:scale-[0.98]"
              >
                Go to Payment Now
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 text-xs font-medium cursor-pointer transition-colors py-1"
              >
                Stay on this page
              </button>
            </div>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
