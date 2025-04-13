export interface MessengerWebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    messaging?: Array<MessagingEvent>;
  }>;
}

export interface MessagingEvent {
  sender: {
    id: string;
  };
  recipient: {
    id: string;
  };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    quick_reply?: {
      payload: string;
    };
    attachments?: Array<{
      type: string;
      payload: {
        url?: string;
      };
    }>;
  };
  postback?: {
    title: string;
    payload: string;
  };
}

export interface SendMessageResponse {
  recipient_id: string;
  message_id: string;
}
