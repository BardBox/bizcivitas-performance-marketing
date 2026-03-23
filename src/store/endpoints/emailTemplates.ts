import { api } from "../api";

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  category: string;
  autoSend: string;
  isActive: boolean;
  sentCount: number;
  lastSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface SendResult {
  templateName: string;
  totalRecipients: number;
  sent: number;
  failed: number;
  errors?: { email: string; error: string }[];
}

const emailTemplatesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEmailTemplates: build.query<EmailTemplate[], void>({
      query: () => "/email-templates",
      transformResponse: (response: { data: EmailTemplate[] }) => response.data,
      providesTags: (result) =>
        result
          ? [
              "EmailTemplateList",
              ...result.map((t) => ({ type: "EmailTemplate" as const, id: t._id })),
            ]
          : ["EmailTemplateList"],
    }),

    getEmailTemplate: build.query<EmailTemplate, string>({
      query: (id) => `/email-templates/${id}`,
      transformResponse: (response: { data: EmailTemplate }) => response.data,
      providesTags: (_result, _error, id) => [{ type: "EmailTemplate", id }],
    }),

    createEmailTemplate: build.mutation<EmailTemplate, Partial<EmailTemplate>>({
      query: (body) => ({
        url: "/email-templates",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: EmailTemplate }) => response.data,
      invalidatesTags: ["EmailTemplateList"],
    }),

    updateEmailTemplate: build.mutation<EmailTemplate, { id: string; [key: string]: unknown }>({
      query: ({ id, ...body }) => ({
        url: `/email-templates/${id}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: EmailTemplate }) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: "EmailTemplate", id },
        "EmailTemplateList",
      ],
    }),

    deleteEmailTemplate: build.mutation<void, string>({
      query: (id) => ({
        url: `/email-templates/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EmailTemplateList"],
    }),

    sendEmailCampaign: build.mutation<SendResult, { id: string; emails: string[] }>({
      query: ({ id, emails }) => ({
        url: `/email-templates/${id}/send`,
        method: "POST",
        body: { emails },
      }),
      transformResponse: (response: { data: SendResult }) => response.data,
      invalidatesTags: ["EmailReport"],
    }),
  }),
});

export const {
  useGetEmailTemplatesQuery,
  useGetEmailTemplateQuery,
  useCreateEmailTemplateMutation,
  useUpdateEmailTemplateMutation,
  useDeleteEmailTemplateMutation,
  useSendEmailCampaignMutation,
} = emailTemplatesApi;

export type { EmailTemplate, SendResult };
