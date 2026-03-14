"use client";

import { useState } from "react";
import InquiryModal from "./InquiryModal";

export default function Hero() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="bg-white py-12 md:py-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-10">
          {/* Left Content */}
          <div className="flex-1 space-y-6">
            <img
              src="/images/logo.png"
              alt="BizCivitas"
              className="h-10 md:h-12 w-auto"
            />

            <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold text-navy leading-tight">
              BizCivitas Digital
              <br />
              Membership
            </h1>

            <p className="text-gray-500 text-base md:text-lg max-w-lg leading-relaxed">
              You don&apos;t need more events or workshops—you need one serious
              platform where ambitious founders and real deals come to you.
            </p>

            <p className="text-gray-500 text-base md:text-lg max-w-lg">
              That&apos;s exactly what BizCivitas Digital Membership is built
              for.
            </p>

            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-8 rounded-md text-base transition-colors cursor-pointer"
            >
              Join BizCivitas
            </button>
          </div>

          {/* Right - Phone Mockups */}
          <div className="flex-1 flex justify-center">
            <img
              src="/images/hero-phones.png"
              alt="BizCivitas App Preview"
              className="w-full max-w-[500px] h-auto"
            />
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
