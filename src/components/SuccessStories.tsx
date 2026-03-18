"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Story {
  _id: string;
  name: string;
  image: string;
  logo: string;
  quote: string;
}

const fallbackStories: Story[] = [
  {
    _id: "1",
    name: "Jaimi Panchal",
    image: "/images/jaimi.jpg",
    logo: "/images/jaimi-logo.jpg",
    quote: '"Has Received Rs.8,00,000/- Worth of Business."',
  },
  {
    _id: "2",
    name: "Deven Oza",
    image: "/images/deven.jpg",
    logo: "/images/jaimi-logo.jpg",
    quote: '"Has Received Rs. 4,00,000/- Worth of Business."',
  },
  {
    _id: "3",
    name: "Suraj Tanna",
    image: "/images/suraj.jpg",
    logo: "/images/suraj-logo.jpg",
    quote: '"Has Given Rs.10,00,000/- Worth of Business."',
  },
];

export default function SuccessStories() {
  const [stories, setStories] = useState<Story[]>(fallbackStories);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/pm/stories`);
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          setStories(data.data);
        }
      } catch {
        // Keep fallback stories
      }
    };
    fetchStories();
  }, []);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        el.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [stories]);

  const [isPaused, setIsPaused] = useState(false);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 300;
    const gap = 32;
    const scrollAmount = cardWidth + gap;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Auto scroll
  useEffect(() => {
    if (isPaused || stories.length <= 3) return;
    const interval = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft >= el.scrollWidth - el.clientWidth - 2;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scroll("right");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isPaused, stories]);

  return (
    <section className="py-16 px-6 md:px-12 lg:px-24 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-navy">
            Our Members Success Stories
          </h2>
          {stories.length > 3 && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <button
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>

        <div
          ref={scrollRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={`flex gap-8 overflow-x-auto scrollbar-hide pb-4 ${stories.length <= 3 ? "justify-center" : ""}`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none", scrollBehavior: "smooth" }}
        >
          {stories.map((t) => (
            <div
              key={t._id}
              className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow flex-shrink-0 w-[280px] md:w-[300px]"
            >
              {/* Avatar */}
              <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden bg-gray-100">
                {t.image ? (
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl font-bold">
                    {t.name[0]}
                  </div>
                )}
              </div>

              {/* Business Logo */}
              {t.logo && (
                <div className="h-10 flex items-center justify-center mb-3">
                  <img
                    src={t.logo}
                    alt={`${t.name} business logo`}
                    className="h-10 w-auto object-contain"
                  />
                </div>
              )}

              <h3 className="font-semibold text-navy text-lg mb-1">
                {t.name}
              </h3>

              <p className="text-gray-500 text-sm leading-relaxed">
                {t.quote}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
