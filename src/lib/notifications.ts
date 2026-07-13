import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getUserMessage } from "@/lib/errors";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

type ToastMessage = string | (() => string);

type NotifyOptions = {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

function resolveMessage(msg: ToastMessage): string {
  return typeof msg === "function" ? msg() : msg;
}

export const notify = {
  success(message: ToastMessage, options?: NotifyOptions) {
    return toast.success(resolveMessage(message), options);
  },

  error(error: unknown, options?: NotifyOptions) {
    const message = getUserMessage(error);
    return toast.error(message, options);
  },

  info(message: ToastMessage, options?: NotifyOptions) {
    return toast.info(resolveMessage(message), options);
  },

  warning(message: ToastMessage, options?: NotifyOptions) {
    return toast.warning(resolveMessage(message), options);
  },

  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    },
  ) {
    return toast.promise(promise, messages);
  },

  dismiss(toastId?: string) {
    toast.dismiss(toastId);
  },
};

export interface SubscriptionConfig<T extends Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  filter?: string;
  onPayload: (payload: RealtimePostgresChangesPayload<T>) => void;
  enabled?: boolean;
}

export function useSubscription<T extends Record<string, unknown>>(config: SubscriptionConfig<T>) {
  const { table, schema = "public", event = "*", filter, onPayload, enabled = true } = config;
  const handlerRef = useRef(onPayload);
  handlerRef.current = onPayload;

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`${schema}:${table}:${event}:${filter ?? "all"}`)
      .on(
        "postgres_changes",
        { event, schema, table, filter },
        (payload: RealtimePostgresChangesPayload<T>) => {
          handlerRef.current(payload);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, schema, event, filter, enabled]);
}

export interface AdminNotification {
  id: string;
  type: "new_comment" | "comment_reply" | "contact_message";
  message: string;
  link?: string;
  created_at: string;
  read: boolean;
}

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  useSubscription({
    table: "comments",
    event: "INSERT",
    onPayload: async (payload) => {
      const record = payload.new as {
        id: string;
        post_id?: string;
        name?: string;
        email?: string;
        content?: string;
        created_at?: string;
      };
      const postTitle = record.post_id ? await fetchPostTitle(record.post_id) : "a post";
      setNotifications((prev) => [
        {
          id: `comment-${record.id}`,
          type: "new_comment",
          message: record.name
            ? `${record.name} commented on ${postTitle}`
            : `New comment on ${postTitle}`,
          link: record.post_id ? `/admin/comments` : undefined,
          created_at: record.created_at ?? new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
    },
  });

  useSubscription({
    table: "comments",
    event: "INSERT",
    filter: "parent_id=not.is.null",
    onPayload: async (payload) => {
      const record = payload.new as { id: string; name?: string; created_at?: string };
      setNotifications((prev) => [
        {
          id: `reply-${record.id}`,
          type: "comment_reply",
          message: record.name ? `${record.name} replied to a comment` : `New reply to a comment`,
          link: "/admin/comments",
          created_at: record.created_at ?? new Date().toISOString(),
          read: false,
        },
        ...prev,
      ]);
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clear = () => setNotifications([]);

  return { notifications, unreadCount, markAllRead, clear };
}

async function fetchPostTitle(postId: string): Promise<string> {
  try {
    const { data } = await supabase.from("posts").select("title_en").eq("id", postId).maybeSingle();
    return data?.title_en ?? "a post";
  } catch {
    return "a post";
  }
}
