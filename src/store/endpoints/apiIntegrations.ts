import { api } from "../api";

interface Integration {
  _id: string;
  name: string;
  slug: string;
  description: string;
  baseUrl: string;
  isActive: boolean;
  icon?: string;
  color?: string;
}

interface Plugin {
  _id: string;
  name: string;
  slug: string;
  description: string;
  baseUrl: string;
  authType: string;
  authValue?: string;
  authHeaderName?: string;
  isActive: boolean;
  icon?: string;
  color?: string;
  endpoints?: PluginEndpoint[];
}

interface PluginEndpoint {
  _id: string;
  name: string;
  method: string;
  path: string;
  description?: string;
  sampleBody?: string;
}

interface PluginNav {
  name: string;
  slug: string;
  icon: string;
  color: string;
}

const apiIntegrationsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getIntegrations: build.query<Integration[], void>({
      query: () => "/api-integrations",
      transformResponse: (response: { data: Integration[] }) => response.data,
      providesTags: ["ApiIntegration"],
    }),

    testIntegration: build.mutation<{ connected: boolean; error?: string }, string>({
      query: (id) => ({
        url: `/api-integrations/${id}/test`,
        method: "POST",
      }),
    }),

    testAllIntegrations: build.mutation<Record<string, { connected: boolean; error?: string }>, void>({
      query: () => ({
        url: "/api-integrations/test-all",
        method: "POST",
      }),
    }),

    getPlugins: build.query<Plugin[], void>({
      query: () => "/api-plugins",
      transformResponse: (response: { data: Plugin[] }) => response.data,
      providesTags: ["ApiPlugin"],
    }),

    getPluginNav: build.query<PluginNav[], void>({
      query: () => "/api-plugins/nav",
      transformResponse: (response: { data: PluginNav[] }) => response.data,
      providesTags: ["PluginNav"],
    }),

    getPlugin: build.query<Plugin, string>({
      query: (slug) => `/api-plugins/${slug}`,
      transformResponse: (response: { data: Plugin }) => response.data,
      providesTags: (_result, _error, slug) => [{ type: "ApiPlugin", id: slug }],
    }),

    createPlugin: build.mutation<Plugin, Partial<Plugin>>({
      query: (body) => ({
        url: "/api-plugins",
        method: "POST",
        body,
      }),
      transformResponse: (response: { data: Plugin }) => response.data,
      invalidatesTags: ["ApiPlugin", "PluginNav"],
    }),

    updatePlugin: build.mutation<Plugin, { slug: string; [key: string]: unknown }>({
      query: ({ slug, ...body }) => ({
        url: `/api-plugins/${slug}`,
        method: "PUT",
        body,
      }),
      transformResponse: (response: { data: Plugin }) => response.data,
      invalidatesTags: (_result, _error, { slug }) => [
        { type: "ApiPlugin", id: slug },
        "ApiPlugin",
        "PluginNav",
      ],
    }),

    deletePlugin: build.mutation<void, string>({
      query: (slug) => ({
        url: `/api-plugins/${slug}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ApiPlugin", "PluginNav"],
    }),

    testPlugin: build.mutation<{ connected: boolean; status?: number; error?: string }, string>({
      query: (slug) => ({
        url: `/api-plugins/${slug}/test`,
        method: "POST",
      }),
    }),

    addPluginEndpoint: build.mutation<
      Plugin,
      { slug: string; endpoint: Partial<PluginEndpoint> }
    >({
      query: ({ slug, endpoint }) => ({
        url: `/api-plugins/${slug}/endpoints`,
        method: "POST",
        body: endpoint,
      }),
      transformResponse: (response: { data: Plugin }) => response.data,
      invalidatesTags: (_result, _error, { slug }) => [{ type: "ApiPlugin", id: slug }],
    }),

    deletePluginEndpoint: build.mutation<void, { slug: string; endpointId: string }>({
      query: ({ slug, endpointId }) => ({
        url: `/api-plugins/${slug}/endpoints/${endpointId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { slug }) => [{ type: "ApiPlugin", id: slug }],
    }),

    proxyPluginRequest: build.mutation<
      { status: number; headers: Record<string, string>; data: unknown },
      { slug: string; method: string; path: string; body?: string }
    >({
      query: ({ slug, ...body }) => ({
        url: `/api-plugins/${slug}/request`,
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetIntegrationsQuery,
  useTestIntegrationMutation,
  useTestAllIntegrationsMutation,
  useGetPluginsQuery,
  useGetPluginNavQuery,
  useGetPluginQuery,
  useCreatePluginMutation,
  useUpdatePluginMutation,
  useDeletePluginMutation,
  useTestPluginMutation,
  useAddPluginEndpointMutation,
  useDeletePluginEndpointMutation,
  useProxyPluginRequestMutation,
} = apiIntegrationsApi;

export type { Integration, Plugin, PluginEndpoint, PluginNav };
