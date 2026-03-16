"use client";

import { useEffect, useRef, useCallback } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Scoring reference (mirrors backend)
const SCORE_MAP: Record<string, number> = {
  page_visit: 2,
  return_visit: 5,
  time_30sec: 3,
  time_2min: 8,
  scroll_50: 3,
  cta_click: 5,
  form_started: 8,
  form_submitted: 20,
  file_download: 10,
  pricing_visit: 15,
  multiple_pages: 10,
};

interface TrackedEvent {
  event: string;
  timestamp: string;
}

// Session ID — persists across page navigations within same session
const getSessionId = (): string => {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("pm_session_id");
  if (!sid) {
    sid = `ses_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem("pm_session_id", sid);
  }
  return sid;
};

// Store events in sessionStorage
const getStoredEvents = (): TrackedEvent[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(sessionStorage.getItem("pm_events") || "[]");
  } catch {
    return [];
  }
};

const storeEvent = (event: string) => {
  if (typeof window === "undefined") return;
  const events = getStoredEvents();
  events.push({ event, timestamp: new Date().toISOString() });
  sessionStorage.setItem("pm_events", JSON.stringify(events));
};

// Track unique pages visited
const getPageCount = (): number => {
  if (typeof window === "undefined") return 0;
  try {
    const pages: string[] = JSON.parse(sessionStorage.getItem("pm_pages") || "[]");
    return pages.length;
  } catch {
    return 0;
  }
};

const trackPageVisit = (path: string) => {
  if (typeof window === "undefined") return;
  try {
    const pages: string[] = JSON.parse(sessionStorage.getItem("pm_pages") || "[]");
    if (!pages.includes(path)) {
      pages.push(path);
      sessionStorage.setItem("pm_pages", JSON.stringify(pages));
    }
  } catch {
    sessionStorage.setItem("pm_pages", JSON.stringify([path]));
  }
};

// Calculate current score from stored events
export const getCurrentScore = (): number => {
  const events = getStoredEvents();
  return events.reduce((total, e) => total + (SCORE_MAP[e.event] || 0), 0);
};

// Get pipeline stage from score
export const getPipelineStage = (score: number): string => {
  if (score <= 10) return "New";
  if (score <= 25) return "Cold";
  if (score <= 50) return "Warm";
  return "Hot";
};

// Sync all stored events to backend after inquiry is created
export const syncEventsToInquiry = async (inquiryId: string): Promise<void> => {
  const events = getStoredEvents();
  if (events.length === 0) return;

  try {
    await fetch(`${API_BASE_URL}/api/v1/pm/engagement/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inquiryId, events }),
    });
    // Clear stored events after successful sync
    sessionStorage.removeItem("pm_events");
    sessionStorage.removeItem("pm_pages");
  } catch (err) {
    console.error("Failed to sync engagement events:", err);
  }
};

// Send single event to backend (when email is known)
const sendEvent = async (event: string, email?: string) => {
  const sessionId = getSessionId();
  try {
    await fetch(`${API_BASE_URL}/api/v1/pm/engagement/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, event, email }),
    });
  } catch {
    // Silent fail — don't block user experience
  }
};

// Main tracking hook
export function useEngagementTracker(pageName?: string) {
  const startTimeRef = useRef<number>(Date.now());
  const tracked30s = useRef(false);
  const tracked2min = useRef(false);
  const trackedScroll50 = useRef(false);
  const firedEvents = useRef<Set<string>>(new Set());

  // Track a custom event (deduplicated per session)
  const trackEvent = useCallback((event: string) => {
    // Some events can fire multiple times (page_visit on different pages)
    const deduplicateEvents = ["time_30sec", "time_2min", "scroll_50", "return_visit", "multiple_pages"];
    if (deduplicateEvents.includes(event) && firedEvents.current.has(event)) return;

    firedEvents.current.add(event);
    storeEvent(event);
    sendEvent(event);
  }, []);

  useEffect(() => {
    startTimeRef.current = Date.now();
    tracked30s.current = false;
    tracked2min.current = false;
    trackedScroll50.current = false;

    // Check if returning visitor
    const hasVisited = localStorage.getItem("pm_has_visited");
    if (hasVisited) {
      trackEvent("return_visit");
    } else {
      localStorage.setItem("pm_has_visited", "true");
    }

    // Track page visit
    const path = pageName || window.location.pathname;
    trackPageVisit(path);
    storeEvent("page_visit");
    sendEvent("page_visit");

    // Check for multiple page visits (>5)
    if (getPageCount() > 5) {
      trackEvent("multiple_pages");
    }

    // Track pricing page specifically
    if (path === "/checkout" || path.includes("pricing") || path.includes("plans")) {
      trackEvent("pricing_visit");
    }

    // Time tracking
    const timeInterval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      if (elapsed >= 30 && !tracked30s.current) {
        tracked30s.current = true;
        trackEvent("time_30sec");
      }

      if (elapsed >= 120 && !tracked2min.current) {
        tracked2min.current = true;
        trackEvent("time_2min");
      }
    }, 5000);

    // Scroll tracking
    const handleScroll = () => {
      if (trackedScroll50.current) return;
      const scrollPercent =
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercent >= 50) {
        trackedScroll50.current = true;
        trackEvent("scroll_50");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      clearInterval(timeInterval);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pageName, trackEvent]);

  return { trackEvent };
}
