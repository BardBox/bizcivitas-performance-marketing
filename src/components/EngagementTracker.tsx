"use client";

import { useEngagementTracker } from "@/hooks/useEngagementTracker";

export default function EngagementTracker() {
  useEngagementTracker("homepage");
  return null;
}
