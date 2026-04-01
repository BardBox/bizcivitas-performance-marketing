"use client";

import { useState, useRef, useEffect } from "react";
import { X, Loader2, CheckCircle } from "lucide-react";
import { syncEventsToInquiry } from "@/hooks/useEngagementTracker";
import { API_BASE_URL } from "@/lib/api";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

interface InquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InquiryModal({ isOpen, onClose }: InquiryModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    role: "",
    teamSize: "",
    gstNumber: "",
    consentMessages: false,
    consentMarketing: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [error, setError] = useState("");
  const formStartedRef = useRef(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Track form_started on first interaction
  const handleFormFocus = () => {
    if (formStartedRef.current) return;
    formStartedRef.current = true;
    try {
      const events = JSON.parse(sessionStorage.getItem("pm_events") || "[]");
      events.push({ event: "form_started", timestamp: new Date().toISOString() });
      sessionStorage.setItem("pm_events", JSON.stringify(events));
    } catch { /* silent */ }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const params = new URLSearchParams(window.location.search);

      const res = await fetch(`${API_BASE_URL}/pm/inquiry/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          utm_source: params.get("utm_source") || undefined,
          utm_medium: params.get("utm_medium") || undefined,
          utm_campaign: params.get("utm_campaign") || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // Handle existing BizCivitas member trying to sign up via PM
        if (res.status === 409 && data?.data?.alreadyMember) {
          setAlreadyMember(true);
          return;
        }
        const serverMessage = data?.message || data?.error || "Something went wrong";
        if (res.status === 401) {
          throw new Error("Unauthorized: check API endpoint or credentials. " + serverMessage);
        }
        throw new Error(serverMessage);
      }
      const inquiryId = data.data?._id;

      try {
        const events = JSON.parse(sessionStorage.getItem("pm_events") || "[]");
        events.push({ event: "form_submitted", timestamp: new Date().toISOString() });
        sessionStorage.setItem("pm_events", JSON.stringify(events));
        if (inquiryId) {
          await syncEventsToInquiry(inquiryId);
        }
      } catch { /* silent */ }

      setSubmitted(true);

      if (inquiryId) {
        try {
          localStorage.setItem("pm_inquiry_id", inquiryId);
          localStorage.setItem("pm_inquiry_email", formData.email);
        } catch { /* silent */ }
      }

      setTimeout(() => {
        setFormData({
          fullName: "",
          companyName: "",
          email: "",
          phone: "",
          city: "",
          state: "",
          role: "",
          teamSize: "",
          gstNumber: "",
          consentMessages: false,
          consentMarketing: false,
        });
        onClose();
        window.location.href = `/checkout?inquiry_id=${inquiryId}`;
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit inquiry");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl relative shadow-2xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-navy to-navy/90 rounded-t-2xl px-8 py-4 text-center relative flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <h2 className="text-xl md:text-2xl font-bold text-white">
            Ready to network faster?
          </h2>
          <p className="text-primary italic mt-1 text-sm">
            Quick Application. Founder-only access.
          </p>
        </div>

        {/* Scrollable Form */}
        <form
          onSubmit={handleSubmit}
          onFocus={handleFormFocus}
          className="px-8 py-4 space-y-2.5 overflow-y-auto"
        >
          {/* Row 1: Full Name & Company Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                placeholder="Your full name"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="companyName"
                placeholder="Your company name"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
          </div>

          {/* Row 2: Email & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="10-digit mobile number"
                required
                maxLength={10}
                value={formData.phone}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">No +91 prefix needed</p>
            </div>
          </div>

          {/* Row 3: City & State */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="city"
                placeholder="Your city"
                required
                value={formData.city}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                State <span className="text-red-500">*</span>
              </label>
              <select
                name="state"
                required
                value={formData.state}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 bg-white transition-colors"
              >
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Role & Team Size */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                Role / Designation <span className="text-red-500">*</span>
              </label>
              <select
                name="role"
                required
                value={formData.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 bg-white transition-colors"
              >
                <option value="">Select</option>
                <option value="founder">Founder</option>
                <option value="co-founder">Co-Founder</option>
                <option value="ceo">CEO</option>
                <option value="director">Director</option>
                <option value="manager">Manager</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-navy mb-0.5">
                Team Size <span className="text-red-500">*</span>
              </label>
              <select
                name="teamSize"
                required
                value={formData.teamSize}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 bg-white transition-colors"
              >
                <option value="">Select</option>
                <option value="1-5">1–5</option>
                <option value="6-20">6–20</option>
                <option value="21-50">21–50</option>
                <option value="51-100">51–100</option>
                <option value="100+">100+</option>
              </select>
            </div>
          </div>

          {/* Row 5: GST Number */}
          <div>
            <label className="block text-xs font-semibold text-navy mb-0.5">
              GST Number <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              name="gstNumber"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={formData.gstNumber}
              onChange={handleChange}
              maxLength={15}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-colors uppercase"
            />
          </div>

          {/* Consent checkboxes */}
          <div className="space-y-1.5 pt-1 border-t border-gray-100">
            <label className="flex items-start gap-2 cursor-pointer pt-1.5">
              <input
                type="checkbox"
                name="consentMessages"
                checked={formData.consentMessages}
                onChange={handleChange}
                className="mt-0.5 flex-shrink-0 w-4 h-4 accent-primary"
              />
              <span className="text-[10px] text-gray-500 leading-snug">
                By checking this box, I consent to receive non-marketing text
                messages from{" "}
                <a href="https://bizcivitas.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">BizCivitas</a>.
                Message frequency varies, message & data rates may apply. Text HELP for assistance, reply STOP to opt out.
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="consentMarketing"
                checked={formData.consentMarketing}
                onChange={handleChange}
                className="mt-0.5 flex-shrink-0 w-4 h-4 accent-primary"
              />
              <span className="text-[10px] text-gray-500 leading-snug">
                By checking this box, I consent to receive marketing and
                promotional messages including special offers, discounts, and updates from{" "}
                <a href="https://bizcivitas.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium">BizCivitas</a>{" "}
                at the phone number provided. Frequency may vary. Message & data rates may apply.
                Text HELP for assistance, reply STOP to opt out.
              </span>
            </label>
          </div>

          {/* Already a member */}
          {alreadyMember && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center space-y-2">
              <CheckCircle className="w-8 h-8 text-blue-500 mx-auto" />
              <p className="text-sm font-semibold text-blue-800">You&apos;re already a BizCivitas member!</p>
              <p className="text-xs text-blue-600">Please log in to your account using the BizCivitas mobile app.</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-1 text-xs text-blue-700 underline cursor-pointer"
              >
                Close
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-red-500 text-xs text-center bg-red-50 py-2 px-3 rounded-md">{error}</p>
          )}

          {/* Submit */}
          {!alreadyMember && (
            <button
              type="submit"
              disabled={submitting || submitted}
              className="w-full bg-green hover:bg-green/90 text-white font-bold py-2.5 rounded-full text-base transition-all cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : submitted ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Done! Redirecting to checkout...
                </>
              ) : (
                "Start My Membership →"
              )}
            </button>
          )}

          {/* Links */}
          <div className="text-center text-[10px] text-gray-400 pb-1">
            <a href="https://bizcivitas.com/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy">
              Privacy Policy
            </a>
            {" | "}
            <a href="https://bizcivitas.com/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-navy">
              Terms of Service
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
