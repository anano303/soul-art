"use client";

import dynamic from "next/dynamic";

// Dynamically import the MessengerChat with no SSR and CSS loading disabled
const MessengerChat = dynamic(() => import("./MessengerChat"), {
  ssr: false,
  loading: () => null, // No loading component to avoid any CSS preloading
});

export default function MessengerChatWrapper() {
  return <MessengerChat />;
}
