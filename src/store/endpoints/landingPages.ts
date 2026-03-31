import { api } from "../api";

export type LandingPageType = "page" | "popup";
export type LandingPageStatus = "draft" | "published";
export type PopupTrigger = "time" | "scroll" | "exit_intent";
export type BuildMethod = "visual" | "code" | "upload" | "github";

export interface LandingPageSettings {
  triggerType?: PopupTrigger;
  triggerValue?: number;
  successMessage?: string;
  redirectUrl?: string;
}

export interface LandingPage {
  _id: string;
  title: string;
  slug: string;
  type: LandingPageType;
  status: LandingPageStatus;
  description?: string;
  content?: string;
  settings?: LandingPageSettings;
  buildMethod?: BuildMethod;
  subdomain?: string;
  githubRepo?: string;
  githubBranch?: string;
  staticPath?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateLandingPageInput = Omit<LandingPage, "_id" | "createdAt" | "updatedAt">;
export type UpdateLandingPageInput = { id: string } & Partial<Omit<LandingPage, "_id" | "createdAt" | "updatedAt">>;

const landingPagesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getLandingPages: builder.query<LandingPage[], void>({
      query: () => "/landing-pages",
      transformResponse: (res: { data: LandingPage[] }) => res.data,
      providesTags: ["LandingPage"],
    }),
    createLandingPage: builder.mutation<LandingPage, CreateLandingPageInput>({
      query: (body) => ({ url: "/landing-pages", method: "POST", body }),
      transformResponse: (res: { data: LandingPage }) => res.data,
      invalidatesTags: ["LandingPage"],
    }),
    updateLandingPage: builder.mutation<LandingPage, UpdateLandingPageInput>({
      query: ({ id, ...body }) => ({ url: `/landing-pages/${id}`, method: "PATCH", body }),
      transformResponse: (res: { data: LandingPage }) => res.data,
      invalidatesTags: ["LandingPage"],
    }),
    deleteLandingPage: builder.mutation<void, string>({
      query: (id) => ({ url: `/landing-pages/${id}`, method: "DELETE" }),
      invalidatesTags: ["LandingPage"],
    }),
  }),
});

export const {
  useGetLandingPagesQuery,
  useCreateLandingPageMutation,
  useUpdateLandingPageMutation,
  useDeleteLandingPageMutation,
} = landingPagesApi;
