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
  | "api";

export type PermissionsMap = Record<SectionKey, PermissionLevel>;

export interface AdminUser {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
  permissions: PermissionsMap;
  createdAt: string;
  updatedAt: string;
}

interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  isActive?: boolean;
  permissions: PermissionsMap;
}

interface UpdateAdminUserInput {
  id: string;
  name?: string;
  password?: string;
  isActive?: boolean;
  permissions?: PermissionsMap;
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
