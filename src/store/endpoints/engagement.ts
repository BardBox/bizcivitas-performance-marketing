import { api } from "../api";

interface ActivityLogEntry {
  event: string;
  scoreAdded: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface EngagementData {
  activityLog: ActivityLogEntry[];
  totalScore?: number;
}

const engagementApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEngagement: build.query<EngagementData, string>({
      query: (inquiryId) => `/engagement/${inquiryId}`,
      transformResponse: (response: { data: EngagementData }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "Engagement", id }],
    }),
  }),
});

export const { useGetEngagementQuery, useLazyGetEngagementQuery } = engagementApi;

export type { ActivityLogEntry, EngagementData };
