import { api } from "../api";

interface WhatsappStats {
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate?: string;
  readRate?: string;
}

interface WhatsappTopLead {
  mobile: string;
  totalEvents: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  lastEvent: string;
  inquiryName?: string;
  inquiryEmail?: string;
}

interface WhatsappEvent {
  _id: string;
  mobile: string;
  eventType: string;
  templateName: string;
  templateId?: {
    name: string;
    tftTemplateName: string;
  };
  inquiryId?: {
    fullName: string;
    phone: string;
    pipelineStage: string;
  };
  eventTimestamp: string;
}

interface WhatsappEventsResponse {
  events: WhatsappEvent[];
  total: number;
  page: number;
  totalPages: number;
}

interface TftMessage {
  date: string;
  msg: string;
  campname: string;
  mobile: string;
  status: string;
}

interface TftReportSummary {
  total: number;
  SENT: number;
  DELIVERED: number;
  READ: number;
  FAILED: number;
  PENDING: number;
  OTHER: number;
  deliveryRate?: string;
  readRate?: string;
}

interface TftReportResponse {
  messages: TftMessage[];
  summary: TftReportSummary;
}

interface SyncResult {
  total: number;
  synced: number;
  skipped: number;
  errors: number;
}

interface TemplateStats {
  templateName: string;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: string;
  readRate: string;
  lastEvent: string;
}

const whatsappReportsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWhatsappStats: build.query<WhatsappStats, number>({
      query: (days) => `/whatsapp-tracking/stats?days=${days}`,
      transformResponse: (response: { data: WhatsappStats }) => response.data,
      providesTags: ["WhatsappReport"],
    }),

    getWhatsappEvents: build.query<WhatsappEventsResponse, { eventType?: string; page?: number; limit?: number; sort?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.eventType && params.eventType !== "all") searchParams.set("eventType", params.eventType);
        if (params.page) searchParams.set("page", params.page.toString());
        if (params.limit) searchParams.set("limit", params.limit.toString());
        if (params.sort) searchParams.set("sort", params.sort);
        return `/whatsapp-tracking/events?${searchParams.toString()}`;
      },
      transformResponse: (response: { data: WhatsappEventsResponse }) => response.data,
      providesTags: ["WhatsappReport"],
    }),

    getWhatsappTopLeads: build.query<WhatsappTopLead[], number>({
      query: (limit) => `/whatsapp-tracking/top-leads?limit=${limit}`,
      transformResponse: (response: { data: WhatsappTopLead[] }) => response.data,
      providesTags: ["WhatsappReport"],
    }),

    getTemplateStats: build.query<TemplateStats[], void>({
      query: () => `/whatsapp-tracking/template-stats`,
      transformResponse: (response: { data: TemplateStats[] }) => response.data,
      providesTags: ["WhatsappReport"],
    }),

    getTftReport: build.query<TftReportResponse, { templateName?: string; startDate?: string; endDate?: string; mobile?: string }>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.templateName) searchParams.set("templateName", params.templateName);
        if (params.startDate) searchParams.set("startDate", params.startDate);
        if (params.endDate) searchParams.set("endDate", params.endDate);
        if (params.mobile) searchParams.set("mobile", params.mobile);
        return `/whatsapp-tracking/tft-report?${searchParams.toString()}`;
      },
      transformResponse: (response: { data: TftReportResponse }) => response.data,
    }),

    getTftSummary: build.query<unknown[], void>({
      query: () => `/whatsapp-tracking/tft-summary`,
      transformResponse: (response: { data: unknown[] }) => response.data,
    }),

    syncWhatsappStatuses: build.mutation<SyncResult, { days?: number; templateName?: string }>({
      query: (body) => ({
        url: `/whatsapp-tracking/sync`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: SyncResult }) => response.data,
      invalidatesTags: ["WhatsappReport"],
    }),
  }),
});

export const {
  useGetWhatsappStatsQuery,
  useGetWhatsappEventsQuery,
  useGetWhatsappTopLeadsQuery,
  useGetTemplateStatsQuery,
  useGetTftReportQuery,
  useGetTftSummaryQuery,
  useSyncWhatsappStatusesMutation,
} = whatsappReportsApi;

export type { WhatsappStats, WhatsappTopLead, WhatsappEvent, WhatsappEventsResponse, TftMessage, TftReportResponse, TftReportSummary, SyncResult, TemplateStats };
