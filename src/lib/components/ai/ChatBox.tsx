import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  ChevronDown,
  MessageCircle,
  Minus,
  RotateCcw,
  Send,
  X,
} from "lucide-react";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { useAuth } from "../../contexts/authContext";

type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
};
type AIModel = {
  id: string;
  provider: string;
  capabilities: {
    toolCalling: boolean;
    webSearch: boolean;
    generalChat: boolean;
    storeData: boolean;
  };
  priority: number;
};
const SCROLL_THRESHOLD = 64;

export default function ChatBox() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isPinnedToBottomRef = useRef(true);

  const isAtBottom = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return true;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });

    isPinnedToBottomRef.current = true;
    setShowScrollDown(false);
  }, []);

  const handleScroll = useCallback(() => {
    const atBottom = isAtBottom();
    isPinnedToBottomRef.current = atBottom;
    setShowScrollDown(!atBottom);
  }, [isAtBottom]);

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => {
      scrollToBottom("auto");
    });
  }, [open, scrollToBottom]);

  useEffect(() => {
    if (!open || !isPinnedToBottomRef.current) return;

    requestAnimationFrame(() => {
      scrollToBottom(messages.length <= 1 ? "auto" : "smooth");
    });
  }, [messages, loading, open, scrollToBottom]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const availableModels = await window.api.ai.getAvailableModels();
        setModels(availableModels);
      } catch (error) {
        console.error("Failed to load AI models:", error);
      }
    };
  
    loadModels();
  }, []);

  const handleClearChat = async () => {
    if (loading) return;

    try {
      await window.api.ai.clearChat();
      setMessages([]);
      setMessage("");
      isPinnedToBottomRef.current = true;
      setShowScrollDown(false);
    } catch (error) {
      console.error("AI clear chat error:", error);
    }
  };

  const handleSend = async () => {
    const text = message.trim();

    if (!text || loading) return;

    isPinnedToBottomRef.current = true;
    setShowScrollDown(false);

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setMessage("");
    setLoading(true);

    try {
      const response = await window.api.ai.chat(text, user?.username);

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: response,
        },
      ]);
    } catch (error) {
      console.error("AI chat error:", error);

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: "Sorry, I couldn't process your request.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-[100]">
        <Button
          onClick={() => setOpen(true)}
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Open REDA AI"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex h-[600px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>

          <div>
            <h3 className="text-sm font-semibold">REDA AI</h3>
            <p className="text-xs text-muted-foreground">
              Your store assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleClearChat}
              disabled={loading}
              aria-label="New chat"
              title="New chat"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
            aria-label="Minimize"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Model Selector */}
      <div className="shrink-0 border-b px-4 py-2">
        <select
          value={selectedModel ?? ""}
          onChange={async (event) => {
            const modelId = event.target.value || null;
      
            try {
              await window.api.ai.setModel(modelId);
              setSelectedModel(modelId);
            } catch (error) {
              console.error("Failed to select AI model:", error);
            }
          }}
          disabled={loading}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
        >
          <option value="">Automatic</option>
      
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.provider === "google"
                ? `Google — ${model.id}`
                : `OpenRouter — ${model.id}`}
            </option>
          ))}
        </select>
      </div>
      {/* Messages */}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="h-full overflow-y-auto overscroll-contain scroll-smooth"
        >
          <div className="flex flex-col gap-4 p-4">
            {messages.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <MessageCircle className="h-7 w-7 text-primary" />
                </div>

                <h4 className="text-sm font-semibold">How can I help you?</h4>

                <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                  Ask REDA AI about your store, products, sales, inventory, or
                  anything else.
                </p>
              </div>
            ) : (
              messages.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${
                    item.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      item.role === "user"
                        ? "rounded-br-sm bg-primary text-primary-foreground"
                        : "rounded-bl-sm bg-muted"
                    }`}
                  >
                    {item.content}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </div>

        {showScrollDown && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <Button
              size="icon"
              variant="secondary"
              className="pointer-events-auto h-8 w-8 rounded-full shadow-md"
              onClick={() => scrollToBottom()}
              aria-label="Scroll to bottom"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t p-3">
        <div className="flex items-end gap-2">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={loading ? "REDA AI is thinking..." : "Ask REDA AI..."}
            className="min-h-[42px] max-h-32 resize-none"
            rows={1}
          />

          <Button
            size="icon"
            className="shrink-0"
            disabled={!message.trim() || loading}
            onClick={handleSend}
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
