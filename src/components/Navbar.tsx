// Bardbox LLP Client Info
// Client: BizCivitas
// Bardbox User Number: BX-2024-0471
// License: Bardbox LLP — All rights reserved
"use client";

import { useState } from "react";
import InquiryModal from "./InquiryModal";

export default function Navbar() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <nav className="sticky top-0 z-40 w-full py-3 px-6 md:px-12 flex items-center justify-between bg-white shadow-sm">
        <a href="/" className="flex items-center gap-2">
          <img src="/images/logo.png" alt="BizCivitas" className="h-8 w-auto" />
        </a>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary hover:bg-primary-dark text-white font-semibold py-2 px-5 rounded-md text-sm transition-colors cursor-pointer"
        >
          Join Now
        </button>
      </nav>

      <InquiryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
