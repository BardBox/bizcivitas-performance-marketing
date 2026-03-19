"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Shield, CheckCircle, XCircle, Lock, Copy, Check } from "lucide-react";
import { useEngagementTracker } from "@/hooks/useEngagementTracker";
import { API_BASE_URL } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  useEngagementTracker("checkout");
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiry_id");
  const planId = searchParams.get("plan_id");

  const [status, setStatus] = useState<"loading" | "ready" | "processing" | "success" | "error">("loading");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [orderData, setOrderData] = useState<{
    orderId: string;
    amount: number;
    originalAmount: number;
    subtotal: number;
    cgst: number;
    sgst: number;
    gstTotal: number;
    currency: string;
    key: string;
    email: string;
    fullName: string;
    phone: string;
    planName: string;
  } | null>(null);
  const [userData, setUserData] = useState<{
    email: string;
    username: string;
    tempPassword: string;
  } | null>(null);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Create order on mount
  const createOrder = useCallback(async () => {
    if (!inquiryId) {
      setError("Invalid checkout link. Please fill the form again.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId, ...(planId ? { planId } : {}) }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create order");
      }

      setOrderData(data.data);
      setStatus("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }, [inquiryId, planId]);

  useEffect(() => {
    createOrder();
  }, [createOrder]);

  const handlePayment = () => {
    if (!orderData || !window.Razorpay) return;

    setStatus("processing");

    const options: RazorpayOptions = {
      key: orderData.key,
      amount: orderData.amount,
      currency: orderData.currency,
      name: "BizCivitas",
      description: orderData.planName || "Digital Membership",
      order_id: orderData.orderId,
      prefill: {
        name: orderData.fullName,
        email: orderData.email,
        contact: orderData.phone,
      },
      theme: { color: "#1a1a2e" },
      handler: async (response: RazorpayResponse) => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/v1/pm/inquiry/verify-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              inquiryId,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data.message || "Payment verification failed");
          }

          setUserData(data.data);
          setStatus("success");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Payment verification failed");
          setStatus("error");
        }
      },
      modal: {
        ondismiss: () => {
          setStatus("ready");
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const copyCredentials = () => {
    if (!userData) return;
    const text = `Email: ${userData.email}\nUsername: ${userData.username}\nPassword: ${userData.tempPassword}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const discountPercent =
    orderData && orderData.originalAmount > orderData.subtotal
      ? Math.round(((orderData.originalAmount - orderData.subtotal) / orderData.originalAmount) * 100)
      : 0;

  return (
    <div className="min-h-screen bg-[#eef2f6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">

        {/* Loading */}
        {status === "loading" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
            </div>
            <p className="text-gray-500 text-sm">Preparing your order...</p>
          </div>
        )}

        {/* Ready to Pay */}
        {status === "ready" && orderData && (
          <div className="space-y-5">
            {/* Company header */}
            <div className="text-center mb-2">
              <img src="/images/logo.png" alt="BizCivitas" className="h-9 mx-auto mb-1" />
              <p className="text-gray-400 text-xs tracking-widest uppercase">Linkup Ventures Pvt. Ltd.</p>
            </div>

            {/* Order Summary Card */}
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Green header bar */}
              <div className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] px-6 py-3">
                <h2 className="text-white font-bold text-center text-sm tracking-wide">Order Summary</h2>
              </div>

              <div className="px-6 py-5">
                {/* Plan info */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#f97316]/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-[#f97316]" />
                  </div>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Plan</span>
                </div>

                {/* Plan name + quantity */}
                <div className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-[#1a1a2e] text-[15px]">{orderData.planName || "Digital Membership"}</h3>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Qty: 1</span>
                </div>

                {/* Buyer info */}
                <div className="text-xs text-gray-400 mb-5 space-y-0.5">
                  <p>{orderData.fullName}</p>
                  <p>{orderData.email}</p>
                </div>

                {/* Price breakdown */}
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  {/* Original Price */}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Price (1 * ₹{(orderData.originalAmount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })})</span>
                    <span className="text-sm font-semibold text-[#1a1a2e]">
                      ₹{(orderData.originalAmount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Discount + After Discount */}
                  {discountPercent > 0 && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">
                          Discount
                          <span className="inline-block ml-1.5 bg-green-100 text-green-700 text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {discountPercent}% OFF
                          </span>
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                          -₹{((orderData.originalAmount - orderData.subtotal) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <hr className="border-gray-200" />
                      <div className="flex justify-between">
                        <span className="text-sm font-medium text-gray-600">After Discount</span>
                        <span className="text-sm font-medium text-[#1a1a2e]">
                          ₹{(orderData.subtotal / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </>
                  )}

                  {/* CGST */}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">CGST9 (9%)</span>
                    <span className="text-sm text-[#1a1a2e]">
                      ₹{(orderData.cgst / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* SGST */}
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">SGST9 (9%)</span>
                    <span className="text-sm text-[#1a1a2e]">
                      ₹{(orderData.sgst / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="border-t border-gray-200 mt-4 pt-4 pb-1 flex justify-between items-center">
                  <span className="font-bold text-[#1a1a2e] text-base">Total</span>
                  <span className="font-bold text-[22px] text-[#1a1a2e]">
                    ₹{(orderData.amount / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Pay button */}
              <div className="px-6 pb-5">
                <button
                  onClick={handlePayment}
                  className="w-full bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#15803d] text-white font-bold py-3.5 rounded-xl text-[15px] transition-all cursor-pointer flex items-center justify-center gap-2.5 shadow-lg shadow-green-500/20 hover:shadow-green-500/30 active:scale-[0.98]"
                >
                  PROCEED
                  <span className="text-lg">&#x25B6;&#x25B6;</span>
                </button>
              </div>

              {/* Secured by */}
              <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-gray-400" />
                <span className="text-[11px] text-gray-400">
                  Secured by <span className="font-semibold text-gray-500">Razorpay</span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Processing */}
        {status === "processing" && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-5">
              <Loader2 className="w-8 h-8 text-[#f97316] animate-spin" />
            </div>
            <p className="text-gray-500 text-sm">Processing your payment...</p>
            <p className="text-gray-400 text-xs mt-2">Please do not close this window</p>
          </div>
        )}

        {/* Success */}
        {status === "success" && (
          <div className="space-y-5">
            <div className="text-center">
              <img src="/images/logo.png" alt="BizCivitas" className="h-9 mx-auto mb-1" />
            </div>

            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              {/* Success header */}
              <div className="bg-gradient-to-r from-[#22c55e] to-[#16a34a] px-6 py-6 text-center">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">Payment Successful!</h2>
                <p className="text-white/80 text-sm mt-1">
                  Your {orderData?.planName || "Digital Membership"} account is ready
                </p>
              </div>

              {userData && (
                <div className="px-6 py-5">
                  {/* Credentials card */}
                  <div className="bg-[#1a1a2e] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-white/50 uppercase tracking-wider font-semibold">Your Login Credentials</p>
                      <button
                        onClick={copyCredentials}
                        className="flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 cursor-pointer transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-0.5">Email</p>
                        <p className="text-sm text-white font-medium">{userData.email}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-0.5">Username</p>
                        <p className="text-sm text-white font-medium">{userData.username}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/40 uppercase mb-0.5">Temporary Password</p>
                        <p className="text-lg font-mono font-bold text-[#f97316] tracking-wider">{userData.tempPassword}</p>
                      </div>
                    </div>

                  </div>

                  {/* CTA */}
                  <a
                    href="/"
                    className="block mt-5 w-full bg-[#f97316] hover:bg-[#ea580c] text-white font-bold py-3 rounded-xl text-center text-sm transition-colors"
                  >
                    Back to Home
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Error - Email already exists */}
        {status === "error" && error?.toLowerCase().includes("already exists") && (
          <div className="space-y-5">
            <div className="text-center">
              <img src="/images/logo.png" alt="BizCivitas" className="h-9 mx-auto mb-1" />
            </div>

            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-9 h-9 text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Congratulations!</h2>
                <p className="text-gray-500 text-sm mb-1">You are already a BizCivitas member.</p>
                <p className="text-gray-400 text-xs mb-6">User with this email already exists</p>
                <div className="flex gap-3 justify-center">
                  <a
                    href="https://bizcivitas-userpanel.vercel.app/"
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Go to Member Panel
                  </a>
                  <a
                    href="/"
                    className="border border-gray-200 text-gray-500 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
Try again                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error - Generic */}
        {status === "error" && !error?.toLowerCase().includes("already exists") && (
          <div className="space-y-5">
            <div className="text-center">
              <img src="/images/logo.png" alt="BizCivitas" className="h-9 mx-auto mb-1" />
            </div>

            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="px-6 py-10 text-center">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                  <XCircle className="w-9 h-9 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-[#1a1a2e] mb-2">Something went wrong</h2>
                <p className="text-gray-500 text-sm mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setStatus("loading");
                      setError("");
                      createOrder();
                    }}
                    className="bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors cursor-pointer"
                  >
                    Try Again
                  </button>
                  <a
                    href="/"
                    className="border border-gray-200 text-gray-500 font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Go Home
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
