"use client";

import dynamic from "next/dynamic";

// Dynamically import the MessengerChat with no SSR
const MessengerChat = dynamic(() => import("./MessengerChat"), {
  ssr: false,
});

export default function MessengerChatWrapper() {
  return <MessengerChat />;
}
