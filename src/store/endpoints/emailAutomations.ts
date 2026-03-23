import { api } from "../api";

interface Automation {
  _id: string;
  type: string;
  pipelineStage: string;
  templateId: string | null;
  isActive: boolean;
  delay: number;
  groupName?: string;
}

interface AutomationGroup {
  _id: string;
  type: string;
  name: string;
  isCustom?: boolean;
}

const emailAutomationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getEmailAutomations: build.query<Automation[], void>({
      query: () => "/email-automations",
      transformResponse: (response: { data: Automation[] }) => response.data,
      providesTags: ["EmailAutomation"],
    }),

    getAutomationGroups: build.query<AutomationGroup[], void>({
      query: () => "/email-automations/groups",
      transformResponse: (response: { data: AutomationGroup[] }) => response.data,
      providesTags: ["EmailAutomationGroup"],
    }),

    saveAutomation: build.mutation<
      Automation,
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
        url: "/email-automations",
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: Automation }) => response.data,
      invalidatesTags: ["EmailAutomation"],
    }),

    createAutomationGroup: build.mutation<AutomationGroup, { groupName: string }>({
      query: (body) => ({
        url: "/email-automations/groups",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: AutomationGroup }) => response.data,
      invalidatesTags: ["EmailAutomationGroup"],
    }),

    deleteAutomationGroup: build.mutation<void, string>({
      query: (type) => ({
        url: `/email-automations/groups/${type}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EmailAutomationGroup", "EmailAutomation"],
    }),
  }),
});

export const {
  useGetEmailAutomationsQuery,
  useGetAutomationGroupsQuery,
  useSaveAutomationMutation,
  useCreateAutomationGroupMutation,
  useDeleteAutomationGroupMutation,
} = emailAutomationsApi;

export type { Automation, AutomationGroup };
