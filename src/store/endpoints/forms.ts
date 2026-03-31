import { api } from "../api";

export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "number"
  | "date";

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

export interface Form {
  _id: string;
  title: string;
  description?: string;
  fields: FormField[];
  status: "active" | "inactive";
  submissions?: number;
  successMessage?: string;
  redirectUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export type CreateFormInput = Omit<Form, "_id" | "createdAt" | "updatedAt" | "submissions">;
export type UpdateFormInput = { id: string } & Partial<Omit<Form, "_id" | "createdAt" | "updatedAt" | "submissions">>;

const formsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getForms: builder.query<Form[], void>({
      query: () => "/forms",
      transformResponse: (res: { data: Form[] }) => res.data,
      providesTags: ["Form"],
    }),
    createForm: builder.mutation<Form, CreateFormInput>({
      query: (body) => ({ url: "/forms", method: "POST", body }),
      transformResponse: (res: { data: Form }) => res.data,
      invalidatesTags: ["Form"],
    }),
    updateForm: builder.mutation<Form, UpdateFormInput>({
      query: ({ id, ...body }) => ({ url: `/forms/${id}`, method: "PATCH", body }),
      transformResponse: (res: { data: Form }) => res.data,
      invalidatesTags: ["Form"],
    }),
    deleteForm: builder.mutation<void, string>({
      query: (id) => ({ url: `/forms/${id}`, method: "DELETE" }),
      invalidatesTags: ["Form"],
    }),
  }),
});

export const {
  useGetFormsQuery,
  useCreateFormMutation,
  useUpdateFormMutation,
  useDeleteFormMutation,
} = formsApi;
