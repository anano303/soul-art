"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { MessageCircle, X, Send, Facebook, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useUser } from "@/modules/auth/hooks/use-user";
import {
  trackChatOpen,
  trackChatModeSelect,
  trackChatMessage,
  trackChatResponse,
  trackChatError,
  trackChatProductClick,
} from "@/lib/ga4-analytics";
import "./chat-widget.css";

// Markdown ლინკების გარდაქმნა HTML-ში
const formatMessageWithLinks = (content: string): ReactNode => {
  // Markdown ლინკების პატერნი: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = linkRegex.exec(content)) !== null) {
    // დაამატე ტექსტი ლინკამდე
    if (match.index > lastIndex) {
      parts.push(content.slice(lastIndex, match.index));
    }

    // დაამატე ლინკი
    const [, text, url] = match;
    parts.push(
      <a
        key={keyIndex++}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="chat-link"
      >
        {text}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }

  // დაამატე დარჩენილი ტექსტი
  if (lastIndex < content.length) {
    parts.push(content.slice(lastIndex));
  }

  return <>{parts}</>;
};

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: ProductResult[];
}

interface ProductResult {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  category: string;
  images: string[];
  slug?: string;
}

interface ChatResponse {
  response: string;
  products?: ProductResult[];
  suggestFacebook?: boolean;
}

export function ChatWidget() {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [showFacebookOption, setShowFacebookOption] = useState(false);
  const [chatMode, setChatMode] = useState<"select" | "ai" | null>(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const FACEBOOK_URL = "https://m.me/SoulArtge"; // SoulArt Facebook Messenger

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Shrink the floating button while the page is being scrolled so it stops
  // covering content/buttons; it restores shortly after scrolling stops.
  // Purely visual — does not affect the chat behaviour.
  useEffect(() => {
    if (isOpen) return;
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setIsScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setIsScrolling(false), 700);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [isOpen]);

  const loadQuickReplies = useCallback(async () => {
    try {
      const { data } = await apiClient.get<{ replies: string[] }>(
        "/chat/quick-replies"
      );
      setQuickReplies(data.replies);
    } catch {
      setQuickReplies([
        "🎨 მინდა ნახატები ვნახო",
        "💍 სამკაულები მაინტერესებს",
        "❓ როგორ გავხდე გამყიდველი?",
      ]);
    }
  }, []);

  useEffect(() => {
    if (isOpen && chatMode === "ai" && quickReplies.length === 0) {
      loadQuickReplies();
    }
  }, [isOpen, chatMode, loadQuickReplies, quickReplies.length]);

  const handleOpen = () => {
    setIsOpen(true);
    trackChatOpen(true); // GA4 ტრეკინგი
    if (!chatMode) {
      setChatMode("select");
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    trackChatOpen(false); // GA4 ტრეკინგი
  };

  const selectChatMode = (mode: "ai" | "facebook") => {
    trackChatModeSelect(mode); // GA4 ტრეკინგი
    if (mode === "facebook") {
      window.open(FACEBOOK_URL, "_blank");
    } else {
      setChatMode("ai");
      setMessages([
        {
          role: "assistant",
          content:
            "გამარჯობა! 👋 მე ვარ Soul Art-ის AI ასისტენტი. როგორ შემიძლია დაგეხმარო? შემიძლია პროდუქტების მოძებნა, კითხვებზე პასუხი და კონსულტაცია.",
        },
      ]);
    }
  };

  const sendMessage = async (messageText?: string, isQuickReply = false) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    // GA4 ტრეკინგი - მომხმარებლის მესიჯი
    trackChatMessage(text.length, isQuickReply ? "quick_reply" : "user");

    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setShowFacebookOption(false);

    try {
      const { data } = await apiClient.post<ChatResponse>("/chat", {
        messages: [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        })),
        searchProducts: true,
        userName: user?.name || undefined,
      });

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        products: data.products,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // GA4 ტრეკინგი - AI პასუხი
      trackChatResponse(
        data.response.length,
        !!(data.products && data.products.length > 0),
        data.products?.length || 0
      );

      if (data.suggestFacebook) {
        setShowFacebookOption(true);
      }
    } catch {
      // GA4 ტრეკინგი - შეცდომა
      trackChatError("api_error");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "ბოდიში, დაფიქსირდა შეცდომა. გთხოვთ სცადოთ მოგვიანებით ან დაგვიკავშირდეთ Facebook-ზე.",
        },
      ]);
      setShowFacebookOption(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    setMessages([]);
    setChatMode("select");
    setShowFacebookOption(false);
  };

  return (
    <>
      {/* Chat Button */}
      <button
        className={`chat-widget-button ${isOpen ? "hidden" : ""} ${
          isScrolling ? "scrolling" : ""
        }`}
        onClick={handleOpen}
        aria-label="გახსენი ჩატი"
      >
        <MessageCircle size={24} />
        <span className="chat-widget-button-pulse" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="chat-widget-container">
          {/* Header */}
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <div className="chat-widget-avatar">🎨</div>
              <div>
                <h3>Soul Art ჩატი</h3>
                <span className="chat-widget-status">ონლაინ</span>
              </div>
            </div>
            <div className="chat-widget-header-actions">
              {chatMode === "ai" && (
                <button onClick={resetChat} className="chat-widget-reset">
                  თავიდან
                </button>
              )}
              <button onClick={handleClose} className="chat-widget-close">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="chat-widget-content">
            {chatMode === "select" ? (
              /* Mode Selection */
              <div className="chat-widget-mode-select">
                <h4>როგორ გნებავთ დაკავშირება?</h4>
                <button
                  className="chat-mode-button ai-mode"
                  onClick={() => selectChatMode("ai")}
                >
                  <MessageCircle size={24} />
                  <div>
                    <span className="mode-title">AI ასისტენტი</span>
                    <span className="mode-desc">
                      სწრაფი პასუხები, პროდუქტების ძებნა
                    </span>
                  </div>
                </button>
                <button
                  className="chat-mode-button fb-mode"
                  onClick={() => selectChatMode("facebook")}
                >
                  <Facebook size={24} />
                  <div>
                    <span className="mode-title">Facebook Messenger</span>
                    <span className="mode-desc">დაგვიკავშირდით პირდაპირ</span>
                  </div>
                </button>
              </div>
            ) : (
              /* Chat Messages */
              <div className="chat-widget-messages">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`chat-message ${
                      msg.role === "user" ? "user" : "assistant"
                    }`}
                  >
                    <div className="message-content">
                      {msg.role === "assistant"
                        ? formatMessageWithLinks(msg.content)
                        : msg.content}
                    </div>

                    {/* Product Results */}
                    {msg.products && msg.products.length > 0 && (
                      <div className="chat-products">
                        {msg.products.map((product) => (
                          <a
                            key={product._id}
                            href={`/products/${product.slug || product._id}`}
                            className="chat-product-card"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() =>
                              trackChatProductClick(product._id, product.name)
                            }
                          >
                            {product.images?.[0] && (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="chat-product-image"
                              />
                            )}
                            <div className="chat-product-info">
                              <span className="chat-product-name">
                                {product.name}
                              </span>
                              <span className="chat-product-price">
                                {product.discountPrice || product.price}₾
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="chat-message assistant">
                    <div className="message-content loading">
                      <Loader2 className="spinner" size={16} />
                      <span>ვფიქრობ...</span>
                    </div>
                  </div>
                )}

                {showFacebookOption && (
                  <div className="facebook-suggestion">
                    <p>გსურთ ადამიანთან საუბარი?</p>
                    <a
                      href={FACEBOOK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="facebook-link"
                    >
                      <Facebook size={18} />
                      Facebook-ზე დაკავშირება
                    </a>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Quick Replies & Input */}
          {chatMode === "ai" && (
            <div className="chat-widget-footer">
              {/* Quick Replies */}
              {messages.length <= 1 && quickReplies.length > 0 && (
                <div className="quick-replies">
                  {quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      className="quick-reply-btn"
                      onClick={() => sendMessage(reply, true)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="chat-input-container">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="დაწერე შეტყობინება..."
                  disabled={isLoading}
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || isLoading}
                  className="send-button"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
