// AI ფუნქციონალი დროებით გამორთულია
// import { useChat } from "ai/react";
// import { Product } from "@/types";
// import { ProductCreationStep } from "@/types/agents";
// import { useState } from "react";
// import { Message } from "ai";

export function useAiProductCreation() {
  // AI ფუნქციონალი დროებით გამორთულია
  return {
    messages: [],
    input: "",
    handleInputChange: () => {},
    handleSubmit: () => {},
    isLoading: false,
    error: null,
    reload: () => {},
    stop: () => {},
    currentStep: "basic-info" as const,
    productDraft: {},
  };
}
