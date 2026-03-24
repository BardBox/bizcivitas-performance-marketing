import { api } from "../api";

interface WhatsappTemplate {
  _id: string;
  name: string;
  tftTemplateName: string;
  description: string;
  category: string;
  isActive: boolean;
  sentCount: number;
  lastSentAt?: string;
  createdAt: string;
  updatedAt: string;
  // TFT synced fields
  tftCategory?: string;
  tftStatus?: string;
  tftMessage?: string;
  tftFooter?: string;
  tftSystemId?: string;
  tftTemplateId?: string;
  tftLanguage?: string;
  tftTemplateType?: string;
  tftDynamicVars?: string;
  tftQuickReply?: string;
  tftLinkCaption?: string;
  tftLink?: string;
  tftCallCaption?: string;
  tftCallNumber?: string;
  tftCreatedOn?: string;
  tftComponents?: unknown;
  lastSyncedAt?: string;
  source?: string;
}

interface WhatsappSendResult {
  templateName: string;
  totalRecipients?: number;
  sent?: number;
  failed?: number;
  success?: boolean;
  errors?: { mobile: string; error: string }[];
}

interface SyncResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
}

interface CreateOnTftPayload {
  templatename: string;
  temptype?: string;
  msg: string;
  lang?: string;
  category?: string;
  footer?: string;
  dvariables?: string;
  lcap?: string;
  lnk?: string;
  cbtncap?: string;
  callno?: string;
  qreply?: string[];
  displayName?: string;
  description?: string;
}

const whatsappTemplatesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWhatsappTemplates: build.query<WhatsappTemplate[], void>({
      query: () => "/whatsapp-templates",
      transformResponse: (response: { data: WhatsappTemplate[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              "WhatsappTemplateList",
              ...result.map((t) => ({ type: "WhatsappTemplate" as const, id: t._id })),
            ]
          : ["WhatsappTemplateList"],
    }),

    getWhatsappTemplate: build.query<WhatsappTemplate, string>({
      query: (id) => `/whatsapp-templates/${id}`,
      transformResponse: (response: { data: WhatsappTemplate }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "WhatsappTemplate", id }],
    }),

    createWhatsappTemplate: build.mutation<WhatsappTemplate, Partial<WhatsappTemplate>>({
      query: (body) => ({
        url: "/whatsapp-templates",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: WhatsappTemplate }) => response.data,
      invalidatesTags: ["WhatsappTemplateList"],
    }),

    createWhatsappTemplateOnTft: build.mutation<{ template: WhatsappTemplate; tftResult: unknown }, CreateOnTftPayload>({
      query: (body) => ({
        url: "/whatsapp-templates/create-on-tft",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: { template: WhatsappTemplate; tftResult: unknown } }) => response.data,
      invalidatesTags: ["WhatsappTemplateList"],
    }),

    syncWhatsappTemplates: build.mutation<SyncResult, void>({
      query: () => ({
        url: "/whatsapp-templates/sync",
        method: "POST",
      }),
      transformResponse: (response: { data: SyncResult }) => response.data,
      invalidatesTags: ["WhatsappTemplateList"],
    }),

    getWhatsappTemplatePreview: build.query<unknown, string>({
      query: (id) => `/whatsapp-templates/${id}/preview`,
      transformResponse: (response: { data: unknown }) => response.data,
    }),

    updateWhatsappTemplate: build.mutation<WhatsappTemplate, { id: string; [key: string]: unknown }>({
      query: ({ id, ...body }) => ({
        url: `/whatsapp-templates/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: WhatsappTemplate }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "WhatsappTemplate", id },
        "WhatsappTemplateList",
      ],
    }),

    deleteWhatsappTemplate: build.mutation<void, string>({
      query: (id) => ({
        url: `/whatsapp-templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["WhatsappTemplateList"],
    }),

    sendWhatsappMessage: build.mutation<WhatsappSendResult, { id: string; mobile?: string; inquiryId?: string; mobiles?: { mobile: string; inquiryId?: string }[] }>({
      query: ({ id, ...body }) => ({
        url: `/whatsapp-templates/${id}/send`,
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: WhatsappSendResult }) => response.data,
      invalidatesTags: ["WhatsappReport"],
    }),
  }),
});

export const {
  useGetWhatsappTemplatesQuery,
  useGetWhatsappTemplateQuery,
  useCreateWhatsappTemplateMutation,
  useCreateWhatsappTemplateOnTftMutation,
  useSyncWhatsappTemplatesMutation,
  useGetWhatsappTemplatePreviewQuery,
  useUpdateWhatsappTemplateMutation,
  useDeleteWhatsappTemplateMutation,
  useSendWhatsappMessageMutation,
} = whatsappTemplatesApi;

export type { WhatsappTemplate, WhatsappSendResult, SyncResult, CreateOnTftPayload };
