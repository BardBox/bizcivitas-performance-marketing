import { api } from "../api";

interface Story {
  _id: string;
  name: string;
  quote: string;
  image?: string;
  logo?: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

const storiesApi = api.injectEndpoints({
  endpoints: (build) => ({
    getStories: build.query<Story[], void>({
      query: () => ({
        url: "/stories/all",
        credentials: "include",
      }),
      transformResponse: (response: { data: Story[] }) => response.data,
      providesTags: ["Story"],
    }),

    createStory: build.mutation<Story, FormData>({
      query: (formData) => ({
        url: "/stories",
        method: "POST",
        body: formData,
        credentials: "include",
        formData: true,
      }),
      invalidatesTags: ["Story"],
    }),

    updateStory: build.mutation<Story, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/stories/${id}`,
        method: "PATCH",
        body: formData,
        credentials: "include",
        formData: true,
      }),
      invalidatesTags: ["Story"],
    }),

    deleteStory: build.mutation<void, string>({
      query: (id) => ({
        url: `/stories/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
      invalidatesTags: ["Story"],
    }),
  }),
});

export const {
  useGetStoriesQuery,
  useCreateStoryMutation,
  useUpdateStoryMutation,
  useDeleteStoryMutation,
} = storiesApi;

export type { Story };
