import { api } from "../api";

interface Inquiry {
  _id: string;
  fullName: string;
  companyName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  role?: string;
  teamSize?: string;
  gstNumber?: string;
  notes?: string;
  status?: string;
  pipelineStage?: string;
  engagementScore?: number;
  lastActivity?: string;
  consentMessages?: boolean;
  consentMarketing?: boolean;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  paymentAmount?: number;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
  updatedAt?: string;
}

interface InquiriesResponse {
  inquiries: Inquiry[];
  total: number;
  page: number;
  totalPages: number;
}

interface InquiryStats {
  total: number;
  new: number;
  contacted: number;
  converted: number;
  hot: number;
  warm: number;
  cold: number;
}

interface GetInquiriesParams {
  page?: number;
  limit?: number;
  status?: string;
  includeConverted?: string;
}

const inquiriesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getInquiries: build.query<InquiriesResponse, GetInquiriesParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.set("page", String(params.page));
        if (params.limit) searchParams.set("limit", String(params.limit));
        if (params.status) searchParams.set("status", params.status);
        if (params.includeConverted) searchParams.set("includeConverted", params.includeConverted);
        return `/inquiry?${searchParams.toString()}`;
      },
      transformResponse: (response: { data: InquiriesResponse }) => response.data,
      providesTags: (result) =>
        result
          ? [
              "InquiryList",
              ...result.inquiries.map((i) => ({ type: "Inquiry" as const, id: i._id })),
            ]
          : ["InquiryList"],
    }),

    getInquiryStats: build.query<InquiryStats, void>({
      query: () => "/inquiry/stats",
      transformResponse: (response: { data: InquiryStats }) => response.data,
      providesTags: ["InquiryStats"],
    }),

    updateInquiry: build.mutation<Inquiry, { id: string; [key: string]: unknown }>({
      query: ({ id, ...body }) => ({
        url: `/inquiry/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: Inquiry }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Inquiry", id },
        "InquiryList",
        "InquiryStats",
      ],
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        // Optimistic update for kanban (page:1, limit:500)
        const patchResult = dispatch(
          inquiriesApi.util.updateQueryData("getInquiries", { page: 1, limit: 500 }, (draft) => {
            const inquiry = draft.inquiries.find((i) => i._id === id);
            if (inquiry) Object.assign(inquiry, patch);
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteInquiry: build.mutation<void, string>({
      query: (id) => ({
        url: `/inquiry/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["InquiryList", "InquiryStats"],
    }),

    deleteMultipleInquiries: build.mutation<void, { ids: string[] }>({
      query: (body) => ({
        url: "/inquiry/delete-multiple",
        method: "POST",
        body,
      }),
      invalidatesTags: ["InquiryList", "InquiryStats"],
    }),

    resetInquiryScore: build.mutation<Inquiry, string>({
      query: (id) => ({
        url: `/inquiry/${id}/reset-score`,
        method: "PATCH",
      }),
      transformResponse: (response: { data: Inquiry }) => response.data,
      invalidatesTags: (_result, _error, id) => [
        { type: "Inquiry", id },
        "InquiryList",
      ],
    }),

    createInquiry: build.mutation<Inquiry, Partial<Inquiry>>({
      query: (body) => ({
        url: "/inquiry/add",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: Inquiry }) => response.data,
      invalidatesTags: ["InquiryList", "InquiryStats"],
    }),
  }),
});

export const {
  useGetInquiriesQuery,
  useLazyGetInquiriesQuery,
  useGetInquiryStatsQuery,
  useUpdateInquiryMutation,
  useDeleteInquiryMutation,
  useDeleteMultipleInquiriesMutation,
  useResetInquiryScoreMutation,
  useCreateInquiryMutation,
} = inquiriesApi;

export type { Inquiry, InquiriesResponse, InquiryStats };
