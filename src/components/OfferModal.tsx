"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import InquiryModal from "./InquiryModal";

export default function OfferModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [hasAutoShown, setHasAutoShown] = useState(false);

  // Auto-trigger after 2 seconds on first visit
  // Skip if returning visitor from email/WhatsApp with existing inquiry (they'll see redirect overlay instead)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isFromCampaign = params.get("utm_source") || params.get("utm_medium");
    const hasInquiry = params.get("inquiry_id") || localStorage.getItem("pm_inquiry_id");
    if (isFromCampaign && hasInquiry) return; // ReturnVisitorRedirect handles this

    const timer = setTimeout(() => {
      if (!hasAutoShown) {
        setIsOpen(true);
        setHasAutoShown(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [hasAutoShown]);

  return (
    <>
      {/* Floating Button - Right Side */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 bottom-6 z-40 cursor-pointer group"
      >
        <img
          src="/percentage.png"
          alt="20% OFF"
          className="w-20 h-20 object-contain drop-shadow-xl group-hover:scale-110 transition-transform duration-300"
        />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg">
            {/* Corner Ribbon */}
            <div
              className="absolute z-30 pointer-events-none"
              style={{
                top: "-30px",
                left: "-10px",
                width: "200px",
                height: "180px",
              }}
            >
              <img
                src="/images/ribbio.png"
                alt=""
                className="w-[70%] h-full object-contain"
                style={{ transform: "rotate(0deg)" }}
              />
             
            </div>

            {/* Card */}
            <div className="overflow-hidden rounded-2xl shadow-2xl animate-[scaleIn_0.3s_ease-out]">

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 bg-white/20 hover:bg-white/40 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top gradient section */}
            <div className="bg-gradient-to-br from-primary via-orange-500 to-yellow-500 px-8 pt-10 pb-8 text-center relative overflow-hidden">
              {/* Decorative circles */}
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full" />
              <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
              <div className="absolute top-6 right-20 w-16 h-16 bg-white/5 rounded-full" />

              {/* BizCivitas Logo */}
              <div className="relative z-10 mb-5 flex justify-center">
                <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center p-3">
                  <img
                    src="/images/square.png"
                    alt="BizCivitas"
                    className="h-14 w-14 object-contain"
                  />
                </div>
              </div>

              <h2 className="text-white text-2xl md:text-3xl font-bold relative z-10 leading-tight">
                Get your Digital
                <br />
                Membership at{" "}
                <span className="bg-white text-primary px-2 py-0.5 rounded-md inline-block">
                  20% off
                </span>
              </h2>
              <p className="text-white/90 text-sm mt-3 relative z-10">
                Fast-track your network before spots fill.
              </p>
            </div>

            {/* Bottom white section */}
            <div className="bg-white px-8 py-8 text-center">
              {/* Tagline */}
              <p className="text-navy font-semibold text-lg tracking-wide mb-6">
                Connect. Learn. Grow.
              </p>

              {/* Price */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-gray-400 line-through text-2xl font-medium">
                  ₹6,999/-
                </span>
                <span className="text-4xl font-extrabold text-green">
                  ₹5,599/-
                </span>
              </div>

              {/* CTA Button */}
              <div>
                <button
                  onClick={() => { setIsOpen(false); setShowForm(true); }}
                  className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-4 px-8 rounded-xl text-lg transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                >
                  Access Now
                </button>
              </div>

              <p className="text-gray-400 text-xs mt-4">
                No spam. Cancel anytime.
              </p>
            </div>
            </div>{/* end card */}
          </div>
        </div>
      )}

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

      <InquiryModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
      />
    </>
  );
}
