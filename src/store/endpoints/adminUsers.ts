import { api } from "../api";

export type PermissionLevel = "edit" | "view" | "none";

export type SectionKey =
  | "dashboard"
  | "inquiries"
  | "plans"
  | "members"
  | "stories"
  | "contacts"
  | "pipeline"
  | "email"
  | "whatsapp"
  | "templates"
  | "api"
  | "landing_pages"
  | "forms";

export type DashboardWidget =
  | "kpi_row1"
  | "kpi_row2"
  | "pipeline_chart"
  | "status_pie"
  | "daily_chart"
  | "monthly_chart"
  | "traffic_sources"
  | "recent_inquiries";

export const DASHBOARD_WIDGETS: { key: DashboardWidget; label: string }[] = [
  { key: "kpi_row1",          label: "KPI Cards (Total, New, Hot, Converted)" },
  { key: "kpi_row2",          label: "KPI Cards (Contacted, Warm, Cold, Conv. Rate)" },
  { key: "pipeline_chart",    label: "Pipeline Distribution Chart" },
  { key: "status_pie",        label: "Status Breakdown Pie Chart" },
  { key: "daily_chart",       label: "Last 7 Days Chart" },
  { key: "monthly_chart",     label: "6-Month Trend Chart" },
  { key: "traffic_sources",   label: "Traffic Sources" },
  { key: "recent_inquiries",  label: "Recent Inquiries" },
];

export type DashboardWidgetsMap = Record<DashboardWidget, boolean>;

export const DEFAULT_DASHBOARD_WIDGETS = (): DashboardWidgetsMap =>
  Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.key, true])) as DashboardWidgetsMap;

export type PermissionsMap = Record<SectionKey, PermissionLevel>;

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions: PermissionsMap;
  dashboardWidgets?: DashboardWidgetsMap;
  createdAt: string;
  updatedAt: string;
}

interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  isActive?: boolean;
  permissions: PermissionsMap;
  dashboardWidgets?: DashboardWidgetsMap;
}

interface UpdateAdminUserInput {
  id: string;
  name?: string;
  password?: string;
  isActive?: boolean;
  permissions?: PermissionsMap;
  dashboardWidgets?: DashboardWidgetsMap;
}

const adminUsersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsers: builder.query<AdminUser[], void>({
      query: () => "/admin-users",
      transformResponse: (res: { data: AdminUser[] }) => res.data,
      providesTags: ["AdminUser"],
    }),

    createAdminUser: builder.mutation<AdminUser, CreateAdminUserInput>({
      query: (body) => ({ url: "/admin-users", method: "POST", body }),
      transformResponse: (res: { data: AdminUser }) => res.data,
      invalidatesTags: ["AdminUser"],
    }),

    updateAdminUser: builder.mutation<AdminUser, UpdateAdminUserInput>({
      query: ({ id, ...body }) => ({ url: `/admin-users/${id}`, method: "PATCH", body }),
      transformResponse: (res: { data: AdminUser }) => res.data,
      invalidatesTags: ["AdminUser"],
    }),

    deleteAdminUser: builder.mutation<void, string>({
      query: (id) => ({ url: `/admin-users/${id}`, method: "DELETE" }),
      invalidatesTags: ["AdminUser"],
    }),
  }),
});

export const {
  useGetAdminUsersQuery,
  useCreateAdminUserMutation,
  useUpdateAdminUserMutation,
  useDeleteAdminUserMutation,
} = adminUsersApi;
