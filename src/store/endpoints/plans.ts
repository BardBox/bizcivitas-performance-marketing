import { api } from "../api";

interface Plan {
  _id: string;
  name: string;
  description: string;
  amount: number;
  discountPrice?: number | null;
  duration: string;
  features: string[];
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const plansApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPlans: build.query<Plan[], void>({
      query: () => "/plans",
      transformResponse: (response: { statusCode: number; data: Plan[] }) =>
        response.statusCode === 404 ? [] : response.data,
      providesTags: ["Plan"],
    }),

    createPlan: build.mutation<Plan, Partial<Plan>>({
      query: (body) => ({
        url: "/plans",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: Plan }) => response.data,
      invalidatesTags: ["Plan"],
    }),

    updatePlan: build.mutation<Plan, { id: string; [key: string]: unknown }>({
      query: ({ id, ...body }) => ({
        url: `/plans/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: Plan }) => response.data,
      invalidatesTags: ["Plan"],
    }),

    deletePlan: build.mutation<void, string>({
      query: (id) => ({
        url: `/plans/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Plan"],
    }),
  }),
});

export const {
  useGetPlansQuery,
  useCreatePlanMutation,
  useUpdatePlanMutation,
  useDeletePlanMutation,
} = plansApi;

export type { Plan };
