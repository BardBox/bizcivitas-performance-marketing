import { api } from "../api";

interface EmailStats {
  sent: number;
  opens: number;
  clicks: number;
  unsubscribes: number;
  bounces: number;
  openRate: string;
  clickRate: string;
}

interface TopLead {
  _id: string;
  opens: number;
  clicks: number;
  totalEngagements: number;
  lastEngagement: string;
}

interface RecentEvent {
  _id: string;
  email: string;
  eventType: string;
  campaignName: string | null;
  eventTimestamp: string;
  inquiryId?: {
    fullName: string;
    companyName: string;
    status: string;
    pipelineStage: string;
  };
}

interface EmailReportsData {
  stats: EmailStats;
  topLeads: TopLead[];
  recentEvents: RecentEvent[];
}

const emailReportsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEmailReports: build.query<EmailReportsData, number>({
      query: (days) => `/mailerlite/reports?days=${days}`,
      transformResponse: (response: { data: EmailReportsData }) => response.data,
      providesTags: ["EmailReport"],
    }),

    syncMailerlite: build.mutation<void, void>({
      query: () => ({
        url: "/mailerlite/sync",
        method: "POST",
      }),
      invalidatesTags: ["EmailReport"],
    }),

    getInquiryEmailEvents: build.query<RecentEvent[], string>({
      query: (inquiryId) => `/mailerlite/inquiry/${inquiryId}/events`,
      transformResponse: (response: { data: RecentEvent[] }) => response.data,
    }),
  }),
});

export const {
  useGetEmailReportsQuery,
  useSyncMailerliteMutation,
  useGetInquiryEmailEventsQuery,
} = emailReportsApi;

export type { EmailStats, TopLead, RecentEvent, EmailReportsData };
