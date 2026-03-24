import { api } from "../api";

interface WhatsappAutomation {
  _id: string;
  type: string;
  pipelineStage: string;
  templateId: string | null;
  isActive: boolean;
  delay: number;
  groupName?: string;
}

interface WhatsappAutomationGroup {
  _id: string;
  type: string;
  name: string;
  isCustom?: boolean;
}

const whatsappAutomationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getWhatsappAutomations: build.query<WhatsappAutomation[], void>({
      query: () => "/whatsapp-automations",
      transformResponse: (response: { data: WhatsappAutomation[] }) => response.data,
      providesTags: ["WhatsappAutomation"],
    }),

    getWhatsappAutomationGroups: build.query<WhatsappAutomationGroup[], void>({
      query: () => "/whatsapp-automations/groups",
      transformResponse: (response: { data: WhatsappAutomationGroup[] }) => response.data,
      providesTags: ["WhatsappAutomationGroup"],
    }),

    saveWhatsappAutomation: build.mutation<
      WhatsappAutomation,
      {
        type: string;
        pipelineStage: string;
        templateId: string | null;
        isActive: boolean;
        delay: number;
        groupName?: string;
      }
    >({
      query: (body) => ({
        url: "/whatsapp-automations",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: WhatsappAutomation }) => response.data,
      invalidatesTags: ["WhatsappAutomation"],
    }),

    createWhatsappAutomationGroup: build.mutation<WhatsappAutomationGroup, { groupName: string }>({
      query: (body) => ({
        url: "/whatsapp-automations/groups",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: WhatsappAutomationGroup }) => response.data,
      invalidatesTags: ["WhatsappAutomationGroup"],
    }),

    deleteWhatsappAutomationGroup: build.mutation<void, string>({
      query: (type) => ({
        url: `/whatsapp-automations/groups/${type}`,
        method: "DELETE",
      }),
      invalidatesTags: ["WhatsappAutomationGroup", "WhatsappAutomation"],
    }),
  }),
});

export const {
  useGetWhatsappAutomationsQuery,
  useGetWhatsappAutomationGroupsQuery,
  useSaveWhatsappAutomationMutation,
  useCreateWhatsappAutomationGroupMutation,
  useDeleteWhatsappAutomationGroupMutation,
} = whatsappAutomationsApi;

export type { WhatsappAutomation, WhatsappAutomationGroup };
