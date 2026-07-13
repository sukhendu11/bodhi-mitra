import { useState, useRef, useEffect, useCallback } from "react";
import { useAuthSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, X, Send, Loader2, Sparkles } from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/* ─── Theme ────────────────────────────────────────────────────── */

const saffronBg: React.CSSProperties = { backgroundColor: "var(--color-saffron)" };
const saffronAccent: React.CSSProperties = { color: "var(--color-saffron)" };
const saffronRing = { "--tw-ring-color": "var(--color-saffron)" } as React.CSSProperties;

/* ─── Helpers ──────────────────────────────────────────────────── */

/* ─── Helper ──────────────────────────────────────────────────── */

let _msgCounter = 0;
function generateId() {
  return `msg_${++_msgCounter}_${Date.now()}`;
}

export function AiChatPanel() {
  const { user } = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Namaste! I'm Bodhi, your guide to the wisdom library. Ask me about Buddhist psychology, meditation, any book in our collection, or topics like mindfulness, compassion, and the nature of mind.",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Abort fetch on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // Module-scoped ID counter
  const idCounterRef = useRef(0);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  /* ── Send message ────────────────────────────────────────────── */

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      setError(null);

      // Use ref to avoid stale closure
      const currentMessages = messagesRef.current;

      // Add user message
      const userMsg: ChatMessage = { id: generateId(), role: "user", content: content.trim() };
      const updatedMessages = [...currentMessages, userMsg];
      setMessages(updatedMessages);
      setInputValue("");

      // Add placeholder assistant message
      const assistantId = generateId();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
      setIsStreaming(true);

      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      // Prepare API request
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(errData?.error || `Request failed (${response.status})`);
        }

        // Read stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          // Update assistant message incrementally
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
          );
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to get response");
        // Remove the empty assistant message on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, isStreaming],
  );

  /* ── Submit handler ──────────────────────────────────────────── */

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage],
  );

  if (!user) return null;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={saffronBg}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0 transition-all duration-200 flex items-center justify-center group"
        aria-label={isOpen ? "Close chat" : "Ask Bodhi"}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-saffron-hover)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-saffron)";
        }}
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-10rem)] rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div style={saffronBg} className="px-5 py-4 flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white">Ask Bodhi</h3>
              <p className="text-[0.55rem] text-white/70">AI-powered wisdom guide</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "text-white mr-8"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 ml-8"
                    }`}
                    style={isUser ? saffronBg : undefined}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <Sparkles className="h-3 w-3" style={saffronAccent} />
                        <span
                          className="text-[0.5rem] font-medium uppercase tracking-wider"
                          style={saffronAccent}
                        >
                          Bodhi
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">
                      {msg.content}
                      {isStreaming && i === messages.length - 1 && !isUser && (
                        <span className="inline-flex gap-1 ml-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {error && (
              <div className="flex justify-center">
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg text-center">
                  <p>{error}</p>
                  <button onClick={() => setError(null)} className="underline mt-1 hover:text-red-700">
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="shrink-0 p-4 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about wisdom, books, or meditation..."
                disabled={isStreaming}
                className="flex-1 px-4 py-2.5 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-800 border-0 outline-none ring-1 ring-zinc-200 dark:ring-zinc-700 focus:ring-2 transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-500 disabled:opacity-50"
                style={saffronRing}
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isStreaming}
                style={saffronBg}
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-saffron-hover)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--color-saffron)";
                }}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-[0.45rem] text-center text-zinc-400">
              Responses are AI-generated and may not always be accurate
            </p>
          </form>
        </div>
      )}
    </>
  );
}
