import { api } from "../api";

interface ScoringEvent {
  _id?: string;
  key: string;
  label: string;
  description: string;
  score: number;
  isActive?: boolean;
}

interface PipelineStage {
  _id?: string;
  key: string;
  label: string;
  color: string;
  minScore?: number;
  order: number;
}

interface Thresholds {
  cold: number;
  warm: number;
  hot: number;
}

interface Decay {
  enabled: boolean;
  inactiveDays: number;
  decayAmount: number;
}

interface ScoringConfig {
  _id?: string;
  events: ScoringEvent[];
  pipelineStages: PipelineStage[];
  thresholds: Thresholds;
  decay: Decay;
}

const scoringConfigApi = api.injectEndpoints({
  endpoints: (build) => ({
    getScoringConfig: build.query<ScoringConfig, void>({
      query: () => "/scoring-config",
      transformResponse: (response: { data: ScoringConfig }) => response.data,
      providesTags: ["ScoringConfig"],
    }),

    updateScoringConfig: build.mutation<ScoringConfig, Partial<ScoringConfig>>({
      query: (body) => ({
        url: "/scoring-config",
        method: "PATCH",
        body,
      }),
      transformResponse: (response: { data: ScoringConfig }) => response.data,
      invalidatesTags: ["ScoringConfig"],
    }),

    resetScoringConfig: build.mutation<ScoringConfig, void>({
      query: () => ({
        url: "/scoring-config/reset",
        method: "POST",
      }),
      transformResponse: (response: { data: ScoringConfig }) => response.data,
      invalidatesTags: ["ScoringConfig"],
    }),
  }),
});

export const {
  useGetScoringConfigQuery,
  useUpdateScoringConfigMutation,
  useResetScoringConfigMutation,
} = scoringConfigApi;

export type { ScoringConfig, ScoringEvent, PipelineStage, Thresholds, Decay };
