import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { API_BASE_URL } from "@/lib/api";

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({ baseUrl: `${API_BASE_URL}/pm` }),
  tagTypes: [
    "Inquiry",
    "InquiryList",
    "InquiryStats",
    "ScoringConfig",
    "EmailTemplate",
    "EmailTemplateList",
    "EmailAutomation",
    "EmailAutomationGroup",
    "EmailReport",
    "Plan",
    "Story",
    "ApiIntegration",
    "ApiPlugin",
    "PluginNav",
    "Engagement",
    "WhatsappTemplate",
    "WhatsappTemplateList",
    "WhatsappAutomation",
    "WhatsappAutomationGroup",
    "WhatsappReport",
  ],
  endpoints: () => ({}),
});
