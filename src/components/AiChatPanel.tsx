import { useState, useRef, useEffect, useCallback, type FormEvent } from "react";
import { useAuthSession } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useLang, pickLocalized } from "@/lib/i18n";
import { useSiteSettings } from "@/lib/siteSettings";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
} from "lucide-react";

/* ─── Types ────────────────────────────────────────────────────── */

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/* ─── Constants ────────────────────────────────────────────────── */

const SUGGESTED_PROMPTS_EN = [
  "What is mindfulness?",
  "How do I start meditating?",
  "Tell me about the Four Noble Truths",
  "Books on compassion and loving-kindness",
  "How to deal with anxiety?",
];

const SUGGESTED_PROMPTS_BN = [
  "মাইন্ডফুলনেস কী?",
  "আমি কীভাবে ধ্যান শুরু করব?",
  "চারটি আর্যসত্য সম্পর্কে বলুন",
  "সমবেদনা এবং মৈত্রীর বই",
  "উদ্বেগ মোকাবেলা কিভাবে করবেন?",
];

const STORAGE_KEY = "sabbe-satta-ai-chat";
const MSG_CACHE_SIZE = 50;

/* ─── Helpers ──────────────────────────────────────────────────── */

let _msgCounter = 0;
function generateId() {
  return `msg_${++_msgCounter}_${Date.now()}`;
}

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape
    return parsed.filter(
      (m: unknown): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as ChatMessage).id === "string" &&
        typeof (m as ChatMessage).role === "string" &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant"),
    );
  } catch {
    return [];
  }
}

function saveMessages(messages: ChatMessage[]) {
  try {
    // Keep only the last N messages to avoid huge storage
    const trimmed = messages.slice(-MSG_CACHE_SIZE);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

/* ─── Component ────────────────────────────────────────────────── */

export function AiChatPanel() {
  const { user } = useAuthSession();
  const cfg = useSiteSettings();
  const { lang } = useLang();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Restore persisted messages, or start with welcome message
    const persisted = loadMessages();
    if (persisted.length > 0) return persisted;

    return [
      {
        id: "welcome",
        role: "assistant",
        content: pickLocalized(
          cfg.ai_chat.welcome_message_en,
          cfg.ai_chat.welcome_message_bn,
          lang,
          "Namaste! I'm Bodhi, your guide to the wisdom library. Ask me about Buddhist psychology, meditation, any book in our collection, or topics like mindfulness, compassion, and the nature of mind.",
        ),
      },
    ];
  });
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  // Scroll-aware FAB: hidden while the user scrolls DOWN so it never sits on
  // top of content (reading-history details, book rows…) on small screens;
  // reappears on scroll-up or when near the top. Never hides while the chat
  // is open (the FAB is the close control).
  const [fabHidden, setFabHidden] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const inputRef = useRef<HTMLInputElement>(null);
  messagesRef.current = messages;

  // Abort fetch on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  // FAB auto-hide on scroll direction
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 96) {
        setFabHidden(false);
      } else if (y > lastY + 8) {
        setFabHidden(true);
      } else if (y < lastY - 8) {
        setFabHidden(false);
      }
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isStreaming]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 1) {
      saveMessages(messages);
    }
  }, [messages]);

  // Keyboard shortcut: `/` to open, `Escape` to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Open: Cmd+K or just `/` when not in an input
      if (
        (e.key === "k" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName))
      ) {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          // Focus the input if already open
          inputRef.current?.focus();
        }
      }
      // Close on Escape
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  /* ── Close handler with animation ──────────────────────────── */
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      abortRef.current?.abort();
    }, 200);
  }, []);

  /* ── Clear conversation ───────────────────────────────────── */
  const handleClear = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: pickLocalized(
          cfg.ai_chat.welcome_message_en,
          cfg.ai_chat.welcome_message_bn,
          lang,
          "Namaste! I'm Bodhi, your guide to the wisdom library.",
        ),
      },
    ]);
    localStorage.removeItem(STORAGE_KEY);
    setError(null);
  }, [cfg, lang]);

  /* ── Send message ────────────────────────────────────────────── */

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;
      setError(null);

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

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
          );
        }
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setError(err.message || "Failed to get response");
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming],
  );

  /* ── Submit handler ──────────────────────────────────────────── */

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage],
  );

  /* ── Suggested prompt click ────────────────────────────────── */
  const handleSuggestionClick = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage],
  );

  /* ── Retry last message ────────────────────────────────────────── */
  const handleRetry = useCallback(() => {
    const lastUserMsg = messagesRef.current.filter((m) => m.role === "user").pop();
    if (lastUserMsg) {
      sendMessage(lastUserMsg.content);
    }
  }, [sendMessage]);

  /* ── Copy message ────────────────────────────────────────────── */
  const handleCopy = useCallback((content: string, id: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  if (!user) return null;

  const showSuggestions =
    messages.length === 1 && messages[0].role === "assistant" && !isStreaming;

  const suggestedPrompts = lang === "bn" ? SUGGESTED_PROMPTS_BN : SUGGESTED_PROMPTS_EN;

  return (
    <>
      {/* Floating Action Button — smaller on mobile, tucked right of the
          scroll-to-top button without crowding it (scroll-top sits at
          right-6 / bottom-20). z-[46]: sits BELOW the mobile-menu sheet
          overlay (z-50) so it never shows on top of the open menu, but above
          the chat backdrop (z-[45]) so it stays clickable while the chat is
          open on desktop. */}
      <button
        onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
        className={`fixed bottom-6 right-24 z-[46] w-14 h-14 rounded-full shadow-lg shadow-[var(--color-saffron)]/20 hover:shadow-xl hover:shadow-[var(--color-saffron)]/30 hover:-translate-y-1 active:translate-y-0 transition-all duration-300 ease-out motion-reduce:transition-none motion-reduce:hover:translate-y-0 flex items-center justify-center group max-sm:w-12 max-sm:h-12 max-sm:right-20 ${
          fabHidden && !isOpen
            ? "opacity-0 translate-y-3 pointer-events-none"
            : "opacity-100 translate-y-0 pointer-events-auto"
        }`}
        style={{ backgroundColor: "var(--color-saffron)" }}
        aria-label={isOpen ? "Close chat" : "Ask Bodhi"}
        // Hidden state: pull from tab order too — pointer-events-none alone
        // leaves the invisible button keyboard-focusable (and aria-hidden on
        // a focusable element is invalid).
        tabIndex={fabHidden && !isOpen ? -1 : 0}
        aria-hidden={fabHidden && !isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white max-sm:h-5 max-sm:w-5" />
        ) : (
          <>
            <MessageCircle className="h-6 w-6 text-white max-sm:h-5 max-sm:w-5" />
            {/* Subtle pulse ring */}
            <span className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: "var(--color-saffron)" }}
            />
          </>
        )}
      </button>

      {/* Click-outside overlay — closes the chat when tapping the backdrop.
          All chat chrome sits BELOW the mobile-menu sheet + scroll-to-top
          (z-50) so the open menu always covers the chat. Within the chat
          stack the backdrop (z-[45]) stays above page content but below the
          FAB + panel (z-[46]) so they remain interactive. */}
      {(isOpen || isClosing) && (
        <div
          className="fixed inset-0 z-[45] cursor-default"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Chat Panel */}
      {(isOpen || isClosing) && (
        <div
          className={`fixed z-[46] bottom-24 right-24 w-[400px] max-w-[calc(100vw-1.5rem)] h-[580px] max-h-[calc(100vh-8rem)]
            rounded-2xl border border-border/50 shadow-2xl
            bg-popover/95 backdrop-blur-xl
            flex flex-col overflow-hidden
            transition-all duration-200 ease-out
            ${isClosing ? "opacity-0 translate-y-4 scale-[0.97]" : "opacity-100 translate-y-0 scale-100"}
            md:w-[400px]
            sm:bottom-24 sm:right-24
            max-sm:bottom-0 max-sm:right-0 max-sm:w-full max-sm:max-w-full max-sm:h-[72vh] max-sm:rounded-b-none max-sm:rounded-t-2xl`}
          role="dialog"
          aria-label="Ask Bodhi chat"
        >
          {/* Header */}
          <div
            className="px-5 py-4 flex items-center gap-3 shrink-0 relative overflow-hidden"
            style={{ backgroundColor: "var(--color-saffron)" }}
          >
            {/* Decorative background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white" />
            </div>

            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center relative z-10">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <h3 className="text-sm font-medium text-white">
                {pickLocalized(cfg.ai_chat.panel_title_en, cfg.ai_chat.panel_title_bn, lang, "Ask Bodhi")}
              </h3>
              <p className="text-xs text-white/70">
                {pickLocalized(cfg.ai_chat.panel_subtitle_en, cfg.ai_chat.panel_subtitle_bn, lang, "AI-powered wisdom guide")}
              </p>
            </div>

            {/* Clear conversation button */}
            {messages.length > 1 && (
              <button
                onClick={handleClear}
                className="relative z-10 p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all duration-200"
                title="Clear conversation"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}

            {/* Explicit close button — the FAB morphs to ✕ on desktop, but on
                mobile the FAB is tucked behind the bottom sheet, so the header
                always carries its own close affordance. */}
            <button
              onClick={handleClose}
              className="relative z-10 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200"
              title="Close chat"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth overscroll-contain">
            {showSuggestions && (
              <div className="space-y-3 mb-4">
                <p className="text-xs text-muted-foreground/80 flex items-center gap-1.5">
                  <Lightbulb className="h-3 w-3 text-amber-500" />
                  {lang === "bn" ? "পরামর্শ" : "Try asking"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => handleSuggestionClick(prompt)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-secondary/30 text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-secondary/60 hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              const isLastAssistant = i === messages.length - 1 && !isUser;
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} group/message`}>
                  <div
                    className={`relative max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "text-white shadow-sm"
                        : "bg-secondary/50 dark:bg-secondary/60 text-foreground border border-border/30"
                    }`}
                    style={isUser ? { backgroundColor: "var(--color-saffron)" } : undefined}
                  >
                    {/* Assistant header */}
                    {!isUser && (
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-3 w-3" style={{ color: "var(--color-saffron)" }} />
                          <span
                            className="text-xs font-medium uppercase tracking-wider"
                            style={{ color: "var(--color-saffron)" }}
                          >
                            {cfg.ai_chat.assistant_name || "Bodhi"}
                          </span>
                        </div>
                        {/* Copy button (only on non-streaming assistant messages) */}
                        {!isUser && msg.content && !(isStreaming && isLastAssistant) && (
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="opacity-100 sm:opacity-0 sm:group-hover/message:opacity-100 transition-opacity duration-200 p-1 rounded text-muted-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                            title="Copy message"
                            aria-label="Copy message"
                          >
                            {copiedId === msg.id ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {msg.content}
                      {isStreaming && isLastAssistant && (
                        <span className="inline-flex gap-1 ml-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                          <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Error + retry */}
            {error && (
              <div className="flex justify-center">
                <div className="max-w-[85%] text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 px-3.5 py-2.5 rounded-xl text-center space-y-1.5">
                  <p>{error}</p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => setError(null)}
                      className="underline hover:text-red-800 dark:hover:text-red-300"
                    >
                      Dismiss
                    </button>
                    <span className="text-red-300 dark:text-red-700">·</span>
                    <button
                      onClick={handleRetry}
                      className="inline-flex items-center gap-1 underline hover:text-red-800 dark:hover:text-red-300"
                    >
                      <RefreshCw className="h-3 w-3" /> Retry
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            className="shrink-0 p-4 border-t border-border/40 bg-background/50 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  aria-label={lang === "bn" ? "চ্যাট বার্তা" : "Chat message"}
                  placeholder={
                    lang === "bn"
                      ? "জ্ঞান, বই বা ধ্যান সম্পর্কে জিজ্ঞাসা করুন..."
                      : "Ask about wisdom, books, or meditation..."
                  }
                  disabled={isStreaming}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-secondary/40 dark:bg-secondary/60 border border-border/40 outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-all duration-300 placeholder:text-muted-foreground/50 dark:placeholder:text-muted-foreground/75 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!inputValue.trim() || isStreaming}
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:brightness-110 active:scale-95 shrink-0 shadow-sm"
                style={{ backgroundColor: "var(--color-saffron)" }}
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-2 text-xs text-center text-muted-foreground/50">
              {pickLocalized(
                cfg.ai_chat.disclaimer_en,
                cfg.ai_chat.disclaimer_bn,
                lang,
                "Responses are AI-generated and may not always be accurate",
              )}
            </p>
          </form>
        </div>
      )}
    </>
  );
}
