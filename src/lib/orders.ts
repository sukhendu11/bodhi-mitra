import { supabase } from "@/integrations/supabase/client";

/* ─── Types ──────────────────────────────────────────────────────── */

export interface OrderData {
  id: string;
  user_id: string;
  book_id: string;
  amount_paid: number;
  purchase_date: string;
  created_at: string;
  updated_at: string;
  /** Joined from books table */
  book_title_en?: string;
  book_title_bn?: string;
  book_slug?: string;
  /** Joined from profiles table */
  user_email?: string;
  user_display_name?: string;
}

export interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  freeOrders: number;
  paidOrders: number;
}

/* ─── Fetch orders with joins ────────────────────────────────────── */

export async function fetchOrders(
  page = 1,
  pageSize = 20,
  options?: { search?: string },
): Promise<{ data: OrderData[]; total: number }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const db = supabase as any;

  // Fetch purchases with book and profile joins
  let query = db
    .from("purchases")
    .select(
      `
      *,
      books!inner(title_en, title_bn, slug),
      profiles!inner(email, display_name)
    `,
      { count: "exact" },
    )
    .order("purchase_date", { ascending: false })
    .range(from, to);

  if (options?.search?.trim()) {
    const q = options.search.trim().replace(/[%_]/g, "");
    if (q) {
      query = query.or(
        `books.title_en.ilike.*${q}*,books.title_bn.ilike.*${q}*,profiles.email.ilike.*${q}*,profiles.display_name.ilike.*${q}*`,
      );
    }
  }

  const { data, error, count } = await query;
  if (error) throw error;

  const orders: OrderData[] = (data ?? []).map((row: any) => ({
    id: row.id,
    user_id: row.user_id,
    book_id: row.book_id,
    amount_paid: row.amount_paid,
    purchase_date: row.purchase_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    book_title_en: row.books?.title_en,
    book_title_bn: row.books?.title_bn,
    book_slug: row.books?.slug,
    user_email: row.profiles?.email,
    user_display_name: row.profiles?.display_name,
  }));

  return { data: orders, total: count ?? 0 };
}

/* ─── Order stats for admin dashboard ────────────────────────────── */

export async function getOrderStats(): Promise<OrderStats> {
  const db = supabase as any;

  const [
    { count: totalOrders },
    { count: freeOrders },
    { count: paidOrders },
    { data: revenueData },
  ] = await Promise.all([
    db.from("purchases").select("*", { count: "exact", head: true }),
    db.from("purchases").select("*", { count: "exact", head: true }).eq("amount_paid", 0),
    db.from("purchases").select("*", { count: "exact", head: true }).gt("amount_paid", 0),
    db.from("purchases").select("amount_paid"),
  ]);

  const totalRevenue = (revenueData ?? []).reduce(
    (sum: number, p: { amount_paid: number }) => sum + Number(p.amount_paid ?? 0),
    0,
  );

  return {
    totalOrders: totalOrders ?? 0,
    totalRevenue,
    freeOrders: freeOrders ?? 0,
    paidOrders: paidOrders ?? 0,
  };
}
