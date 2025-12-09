"use client";

import dynamic from "next/dynamic";

// Dynamically import the AI ChatWidget with no SSR
const ChatWidget = dynamic(
  () => import("../chat/chat-widget").then((mod) => mod.ChatWidget),
  {
    ssr: false,
  }
);

export default function MessengerChatWrapper() {
  return <ChatWidget />;
}
