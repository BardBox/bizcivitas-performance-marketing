"use client";

import { useState } from "react";
import {
  Target,
  ArrowRightLeft,
  Search,
  RefreshCw,
  Users,
} from "lucide-react";
import InquiryModal from "./InquiryModal";

const benefits = [
  {
    icon: Target,
    text: "Targeted referrals from a trusted network.",
  },
  {
    icon: ArrowRightLeft,
    text: "Cross-city and cross-industry connections on demand.",
  },
  {
    icon: Search,
    text: "Being easily found by the right people who need what you offer.",
  },
  {
    icon: RefreshCw,
    text: "Creating consistent opportunities through an active network.",
  },
  {
    icon: Users,
    text: "Practical insights from people actually building businesses.",
  },
];

export default function WhyBizcivitas() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="py-16 px-6 md:px-12 lg:px-24 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-12">
          {/* Left - Phone mockup image */}
          <div className="flex-1 flex justify-center">
            <img
              src="/images/why-bizcivitas.png"
              alt="Why Bizcivitas"
              className="w-full max-w-[500px] h-auto"
            />
          </div>

          {/* Right - Content */}
          <div className="flex-1 space-y-6">
            <h2 className="text-2xl md:text-3xl font-bold text-navy">
              Why Bizcivitas?
            </h2>

            <div className="space-y-5">
              {benefits.map((b) => (
                <div key={b.text} className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-gray-700 text-base">{b.text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-md text-base transition-colors cursor-pointer"
            >
              Access Now
            </button>
          </div>
        </div>
      </section>

      <InquiryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
