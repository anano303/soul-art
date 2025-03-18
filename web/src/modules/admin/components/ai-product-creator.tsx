"use client";

import { useEffect, useRef } from "react";
import { cn, formatPrice } from "@/lib/utils";
import { useAiProductCreation } from "../hooks/use-ai-product-creation";
import "./AiProductCreator.css";

interface ValidationError {
  message: string;
}

interface MessageData {
  validationErrors?: ValidationError[];
}

// interface Message {
//   id: string;
//   role: "assistant" | "user" | "system" | "data";
//   content: string;
//   data?: MessageData | null;
// }

export function AiProductCreator() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    stop,
  } = useAiProductCreation();

  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  function formatProductInfo(content: string) {
    console.log(content);

    if (content.includes("Brand:") && content.includes("Category:")) {
      const [productInfo, ...followUpParts] = content.split(
        /(?=Next,|Would you like|Let's)/i
      );
      const followUpMessage = followUpParts.join(" ").trim();

      const lines = productInfo
        .split(/[-\n]/)
        .map((line) => line.trim())
        .filter(Boolean);

      return (
        <div className="ai-product-creator__info">
          <div className="ai-product-creator__info-section">
            <div className="ai-product-creator__info-title">
              {lines[0].split(":")[0]}
            </div>

            <div className="ai-product-creator__info-grid">
              {lines.slice(1).map((line: string, i: number) => {
                const colonIndex = line.indexOf(":");
                if (colonIndex === -1) return null;

                const label = line.slice(0, colonIndex).trim();
                const value = line.slice(colonIndex + 1).trim();

                if (!label || !value) return null;

                if (label === "Price") {
                  const priceMatch = value.match(/\$?([\d,]+)/);
                  const price = priceMatch
                    ? parseFloat(priceMatch[1].replace(/,/g, ""))
                    : 0;

                  return (
                    <div key={i} className="ai-product-creator__price">
                      <span className="ai-product-creator__label">
                        {label}:
                      </span>{" "}
                      <span className="ai-product-creator__price-value">
                        {formatPrice(price)}
                      </span>
                    </div>
                  );
                }

                if (label === "Description") {
                  return (
                    <div key={i} className="ai-product-creator__description">
                      <span className="ai-product-creator__label">
                        {label}:
                      </span>
                      <p className="ai-product-creator__description-text">
                        {value}
                      </p>
                    </div>
                  );
                }

                if (label === "Stock Availability") {
                  return (
                    <div key={i} className="ai-product-creator__stock">
                      <span className="ai-product-creator__label">Stock:</span>{" "}
                      <span>{value}</span>
                    </div>
                  );
                }

                return (
                  <div key={i} className="ai-product-creator__field">
                    <span className="ai-product-creator__label">{label}:</span>{" "}
                    <span>{value}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {followUpMessage && (
            <div className="ai-product-creator__follow-up">
              {followUpMessage}
            </div>
          )}
        </div>
      );
    }

    return <div className="ai-product-creator__default">{content}</div>;
  }

  return (
    <div className="ai-product-creator">
      <div className="ai-product-creator__card">
        <div
          ref={chatContainerRef}
          className="ai-product-creator__chat-container"
        >
          {messages.map((message) => {
            const safeData = message.data as MessageData | null;

            return (
              <div
                key={message.id}
                className={cn(
                  "ai-product-creator__message",
                  message.role === "assistant"
                    ? "ai-product-creator__message--assistant"
                    : "ai-product-creator__message--user"
                )}
              >
                <div className="ai-product-creator__message-header">
                  {message.role === "assistant" ? "AI Assistant" : "You"}
                </div>
                {formatProductInfo(message.content)}

                {Array.isArray(safeData?.validationErrors) && (
                  <ul className="ai-product-creator__error-list">
                    {safeData.validationErrors.map((error, i) => (
                      <li key={i} className="ai-product-creator__error-item">
                        <span className="ai-product-creator__error-dot" />
                        {error.message}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="ai-product-creator__input-container">
          {error && (
            <div className="ai-product-creator__error-message">
              {error.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="ai-product-creator__form">
            <input
              value={input}
              onChange={handleInputChange}
              placeholder="Describe the product you want to create..."
              disabled={isLoading}
              className="ai-product-creator__input"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="ai-product-creator__button"
            >
              Send
            </button>
            <button
              type="button"
              onClick={() => stop()}
              disabled={!isLoading}
              className="ai-product-creator__button ai-product-creator__button--outline"
            >
              Stop
            </button>
            <button
              type="button"
              onClick={() => reload()}
              disabled={isLoading || messages.length === 0}
              className="ai-product-creator__button ai-product-creator__button--outline"
            >
              Retry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
