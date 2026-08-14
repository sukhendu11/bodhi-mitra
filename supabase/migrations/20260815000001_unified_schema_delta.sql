-- ============================================================================
-- Sabbe Satta — P1 Unified Schema Delta (AD-029)
-- ============================================================================
-- Adds the tables/columns/buckets required by the approved unified architecture
-- that were missing from the existing 60 migrations:
--
--   1. `orders` + `order_items`  — server-side payment order state machine
--      (AD-026 provider-agnostic flow). The frontend order service
--      (src/lib/payments/orders.ts) is mock-first until these land (P3/P4).
--   2. Book amendments — `author_bio_en/bn`, `chapters`, `chapter_pages`
--      columns on `books` (present in the frontend `Book` interface + reader
--      TOC but never migrated).
--   3. `book_grid_settings`     — admin/site-settings layer (P6 grid density
--      per breakpoint for ALL content grids).
--   4. `covers` storage bucket  — the target bucket set (book-pdfs private,
--      covers, avatars, site-assets, documents); covers is the one bucket not
--      created by the existing migrations.
--
-- Idempotent (safe to run on any instance). Uses the project's existing
-- conventions: has_role()/update_updated_at_column(), RLS on every table,
-- policy names matching the existing style.
-- ============================================================================

-- ─── 1. Orders + order_items ────────────────────────────────────────────────

-- Server-side payment order. Created `pending` BEFORE the payer reaches a
-- gateway; the webhook (or simulated completion) transitions it to
-- paid/failed/cancelled. Idempotent transitions guard duplicate callbacks.
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  -- Provider that initiated this order ("simulated" | "piprapay").
  provider TEXT NOT NULL DEFAULT 'simulated'
    CHECK (provider IN ('simulated', 'piprapay')),
  -- Provider-side reference (e.g. PipraPay TrxID) once known.
  gateway_reference TEXT,
  -- Coupon applied (for redemption incrementing); NULL when none.
  coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Users can view their own orders.
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Orders are created server-side only (never by the client directly).
CREATE POLICY "Orders created server-side only"
  ON public.orders FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Orders updated server-side only"
  ON public.orders FOR UPDATE
  USING (false);

-- One purchasable line inside an order (mirrors PaymentOrderItem).
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  -- Snapshot fields so receipts survive book edits/deletes.
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  title_en TEXT,
  title_bn TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_book_id ON public.order_items (book_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_order_items_order_book
  ON public.order_items (order_id, book_id) WHERE book_id IS NOT NULL;

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Items are readable only through the owning user's order.
CREATE POLICY "Users can view own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Order items created server-side only"
  ON public.order_items FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Order items updated server-side only"
  ON public.order_items FOR UPDATE
  USING (false);

-- ─── 2. Book amendments (author bio + chapters) ─────────────────────────────

ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS author_bio_en TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS author_bio_bn TEXT NOT NULL DEFAULT '',
  -- Chapter titles for the TOC preview; parallel array of starting pages.
  ADD COLUMN IF NOT EXISTS chapters JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS chapter_pages JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ─── 3. Book grid settings (admin/site-settings layer, P6) ──────────────────

-- Per-breakpoint grid density for ALL content grids (books, reflections,
-- videos, homepage sections), driven via CSS custom properties
-- (--book-grid-cols-mobile/tablet/desktop pattern). Singleton row (key='default').
CREATE TABLE IF NOT EXISTS public.book_grid_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE DEFAULT 'default',
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_book_grid_settings_updated_at
  BEFORE UPDATE ON public.book_grid_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.book_grid_settings ENABLE ROW LEVEL SECURITY;

-- Publicly readable (drives the public site layout).
CREATE POLICY "Book grid settings publicly readable"
  ON public.book_grid_settings FOR SELECT
  USING (true);

-- Writes are server-side (Refine admin via server functions, P2).
CREATE POLICY "Book grid settings written server-side only"
  ON public.book_grid_settings FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Book grid settings updated server-side only"
  ON public.book_grid_settings FOR UPDATE
  USING (false);

-- ─── 4. covers storage bucket (target bucket set) ───────────────────────────

-- General-purpose cover images (book/post/video covers). Public for direct
-- rendering; writes restricted to editors+ (matches book-covers pattern).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  20971520, -- 20 MB (cover images; PDFs live in private book-pdfs)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']::text[]
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Covers publicly viewable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'covers');

CREATE POLICY "Editors+ can upload covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Editors+ can update covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );

CREATE POLICY "Editors+ can delete covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'covers' AND (
      public.has_role(auth.uid(), 'admin') OR
      public.has_role(auth.uid(), 'super_admin') OR
      public.has_role(auth.uid(), 'editor') OR
      public.has_role(auth.uid(), 'author')
    )
  );
