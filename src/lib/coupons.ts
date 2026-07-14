import { createServerFn } from "@tanstack/react-start";
import { requireMinRole } from "./permissions";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabase } from "@/integrations/supabase/client";

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  max_redemptions: number | null;
  current_redemptions: number;
  expires_at: string | null;
  is_active: boolean;
  min_purchase_amount: number;
  created_at: string;
  updated_at: string;
}

export interface CouponValidation {
  valid: boolean;
  coupon?: Coupon;
  error?: string;
  discountAmount?: number;
}

const db = supabase as any;

/** Fetch all coupons (admin) */
export const fetchCoupons = createServerFn({ method: "GET" })
  .middleware([requireMinRole("admin")])
  .handler(async () => {
    const { data, error } = await db.from("coupons").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data as Coupon[];
  });

/** Create a coupon (admin) */
export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { data: result, error } = await db
      .from("coupons")
      .insert({
        code: data.code.toUpperCase(),
        description: data.description || "",
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        max_redemptions: data.max_redemptions || null,
        expires_at: data.expires_at || null,
        min_purchase_amount: data.min_purchase_amount || 0,
      })
      .select()
      .single();
    if (error) throw error;
    return result as Coupon;
  });

/** Update a coupon (admin) */
export const updateCoupon = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { id, ...updates } = data;
    if (updates.code) updates.code = updates.code.toUpperCase();
    const { data: result, error } = await db.from("coupons").update(updates).eq("id", id).select().single();
    if (error) throw error;
    return result as Coupon;
  });

/** Delete a coupon (admin) */
export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireMinRole("admin")])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any) => {
    const { error } = await db.from("coupons").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

/** Validate and apply a coupon code (requires auth) */
export const validateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  .handler(async ({ data }: any): Promise<CouponValidation> => {
    const code = (data.code || "").toUpperCase().trim();
    if (!code) return { valid: false, error: "Please enter a coupon code" };

    const { data: coupon, error } = await db
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (error || !coupon) return { valid: false, error: "Invalid coupon code" };

    // Check expiration
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return { valid: false, error: "This coupon has expired" };
    }

    // Check max redemptions
    if (coupon.max_redemptions && coupon.current_redemptions >= coupon.max_redemptions) {
      return { valid: false, error: "This coupon has reached its usage limit" };
    }

    // Check minimum purchase
    const subtotal = data.subtotal || 0;
    if (coupon.min_purchase_amount > 0 && subtotal < coupon.min_purchase_amount) {
      return {
        valid: false,
        error: `Minimum purchase of $${coupon.min_purchase_amount.toFixed(2)} required`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discount_type === "percentage") {
      discountAmount = subtotal * (coupon.discount_value / 100);
    } else {
      discountAmount = Math.min(coupon.discount_value, subtotal);
    }

    return { valid: true, coupon, discountAmount };
  });

/** Increment redemption count (called after successful purchase) */
export async function incrementRedemption(couponId: string): Promise<void> {
  const { error } = await db
    .from("coupons")
    .update({ current_redemptions: db.rpc ? undefined : undefined })
    .eq("id", couponId);
  // Use direct increment approach
  const { data: coupon } = await db.from("coupons").select("current_redemptions").eq("id", couponId).single();
  if (coupon) {
    await db.from("coupons").update({ current_redemptions: (coupon.current_redemptions || 0) + 1 }).eq("id", couponId);
  }
}
