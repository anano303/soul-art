import { useChat } from "ai/react";
import { Product } from "@/types";
import { ProductCreationStep } from "@/types/agents";
import { useState } from "react";
import { Message } from "ai";

export function useAiProductCreation() {
  const [productDraft, setProductDraft] = useState<Partial<Product>>({});
  const [currentStep, setCurrentStep] =
    useState<ProductCreationStep>("basic-info");

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useChat({
    api: `${process.env.NEXT_PUBLIC_API_URL}/products/agent/stream`,
    initialMessages: [
      {
        id: "1",
        role: "assistant",
        content:
          "I am a product creation assistant. Let's create a product together.",
      },
    ],
    body: ({ messages }: { messages: Message[] }) => ({
      messages,
      data: {
        context: {
          currentStep,
          validationErrors: undefined,
          productDraft: productDraft || {},
          hasBasicInfo: !!(productDraft?.brand && productDraft?.category),
          hasDetails: !!(
            productDraft?.name &&
            productDraft?.price &&
            productDraft?.description
          ),
        },
      },
    }),
    keepLastMessageOnError: true,
    onResponse: (response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    },
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: (message) => {
      let data;
      try {
        data =
          typeof message.data === "string"
            ? JSON.parse(message.data)
            : message.data;
      } catch (error) {
        console.error("Error parsing message data:", error);
        return;
      }

      if (data?.productUpdate) {
        setProductDraft((prev) => ({ ...prev, ...data.productUpdate }));
      }
      if (data?.canProgress) {
        const stepOrder: ProductCreationStep[] = [
          "basic-info",
          "details",
          "images",
          "review",
        ];
        const currentIndex = stepOrder.indexOf(currentStep);
        if (currentIndex < stepOrder.length - 1) {
          setCurrentStep(stepOrder[currentIndex + 1]);
        }
      }
    },
  });

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
    currentStep,
    productDraft,
  };
}
