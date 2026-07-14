import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";
import { supabase } from "@/integrations/supabase/client";

export interface Redirect {
  id: string;
  from_path: string;
  to_path: string;
  status_code: number;
  is_active: boolean;
  note: string;
  hit_count: number;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

export const fetchRedirects = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const { data, error } = await db.from("redirects").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Redirect[];
  });

export const createRedirect = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { data: result, error } = await db
      .from("redirects")
      .insert({ from_path: data.from_path, to_path: data.to_path, status_code: data.status_code ?? 301, note: data.note ?? "" })
      .select()
      .single();
    if (error) throw error;
    return result as Redirect;
  });

export const updateRedirect = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { id, ...updates } = data;
    const { data: result, error } = await db.from("redirects").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return result as Redirect;
  });

export const deleteRedirect = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { error } = await db.from("redirects").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export async function lookupRedirect(path: string): Promise<{ to: string; statusCode: number } | null> {
  const { data } = await db
    .from("redirects")
    .select("to_path, status_code")
    .eq("from_path", path)
    .eq("is_active", true)
    .single();
  if (!data) return null;
  return { to: data.to_path, statusCode: data.status_code };
}
