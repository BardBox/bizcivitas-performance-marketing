"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, Loader2, XCircle } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const inquiryId = searchParams.get("inquiry_id");
    const email = searchParams.get("email");

    if (!inquiryId && !email) {
      setStatus("error");
      return;
    }

    // Mark inquiry as converted
    const markConverted = async () => {
      try {
        const endpoint = inquiryId
          ? `${API_BASE_URL}/api/v1/pm/inquiry/${inquiryId}`
          : `${API_BASE_URL}/api/v1/pm/inquiry/convert-by-email/${email}`;

        const res = await fetch(endpoint, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "converted" }),
        });

        if (res.ok) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    markConverted();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#1a1a2e] px-8 py-6 text-center">
          <img
            src="/images/logo-footer.png"
            alt="BizCivitas"
            className="h-10 mx-auto"
          />
        </div>

        <div className="px-8 py-10 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 text-[#f97316] animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#1a1a2e]">
                Verifying your payment...
              </h2>
              <p className="text-gray-500 mt-2 text-sm">
                Please wait while we confirm your payment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#1a1a2e]">
                Payment Successful!
              </h2>
              <p className="text-gray-500 mt-2 text-sm">
                Thank you for joining BizCivitas. Our team will reach out to you
                shortly with the next steps.
              </p>
              <a
                href="/"
                className="inline-block mt-6 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Back to Home
              </a>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#1a1a2e]">
                Something went wrong
              </h2>
              <p className="text-gray-500 mt-2 text-sm">
                We couldn&apos;t verify your payment. Don&apos;t worry — if your payment
                was successful, our team will update your status shortly.
              </p>
              <a
                href="/"
                className="inline-block mt-6 bg-[#f97316] hover:bg-[#ea580c] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Back to Home
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
