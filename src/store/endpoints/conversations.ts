import { api } from "../api";

export type MessageType = "email" | "whatsapp" | "manual_email" | "manual_whatsapp";
export type MessageSender = "admin" | "system" | "user";
export type MessageChannel = "email" | "whatsapp";
export type MessageStatus = "sent" | "delivered" | "read" | "failed" | "pending";

export interface ConversationMessage {
  _id: string;
  inquiryId: string;
  type: MessageType;
  sender: MessageSender;
  channel: MessageChannel;
  content: string;
  subject?: string;
  recipient: string;
  status: MessageStatus;
  messageTimestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface InquirySummary {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
}

export interface ConversationData {
  inquiry: InquirySummary;
  messages: ConversationMessage[];
}

const conversationsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getConversation: builder.query<ConversationData, string>({
      query: (inquiryId) => `/conversations/${inquiryId}`,
      transformResponse: (res: { data: ConversationData }) => res.data,
    }),

    sendEmail: builder.mutation<ConversationMessage, { inquiryId: string; content: string; subject?: string }>({
      query: ({ inquiryId, content, subject }) => ({
        url: `/conversations/${inquiryId}/email`,
        method: "POST",
        body: { content, subject },
      }),
      transformResponse: (res: { data: ConversationMessage }) => res.data,
      async onQueryStarted({ inquiryId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            conversationsApi.util.updateQueryData("getConversation", inquiryId, (draft) => {
              draft.messages.push(data);
            })
          );
        } catch (err) {
          console.error("Send email error:", err);
        }
      },
    }),

    sendWhatsapp: builder.mutation<ConversationMessage, { inquiryId: string; content: string }>({
      query: ({ inquiryId, content }) => ({
        url: `/conversations/${inquiryId}/whatsapp`,
        method: "POST",
        body: { content },
      }),
      transformResponse: (res: { data: ConversationMessage }) => res.data,
      async onQueryStarted({ inquiryId }, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            conversationsApi.util.updateQueryData("getConversation", inquiryId, (draft) => {
              draft.messages.push(data);
            })
          );
        } catch (err) {
          console.error("Send whatsapp error:", err);
        }
      },
    }),
  }),
});

export const {
  useGetConversationQuery,
  useSendEmailMutation,
  useSendWhatsappMutation,
} = conversationsApi;

export default conversationsApi;
