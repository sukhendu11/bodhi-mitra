-- Carts table (one cart per user)
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Users can read their own cart
DO $$ BEGIN
  CREATE POLICY "Users can read own cart"
    ON public.carts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert their own cart
DO $$ BEGIN
  CREATE POLICY "Users can insert own cart"
    ON public.carts FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can update their own cart
DO $$ BEGIN
  CREATE POLICY "Users can update own cart"
    ON public.carts FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete their own cart
DO $$ BEGIN
  CREATE POLICY "Users can delete own cart"
    ON public.carts FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Cart items table (books in the cart)
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cart_id, book_id)
);

ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Users can read their own cart items (via their cart)
DO $$ BEGIN
  CREATE POLICY "Users can read own cart items"
    ON public.cart_items FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can insert items into their own cart
DO $$ BEGIN
  CREATE POLICY "Users can insert own cart items"
    ON public.cart_items FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Users can delete items from their own cart
DO $$ BEGIN
  CREATE POLICY "Users can delete own cart items"
    ON public.cart_items FOR DELETE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.carts WHERE id = cart_id AND user_id = auth.uid()
    ));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
