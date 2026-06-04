
CREATE TYPE public.post_category AS ENUM ('Buddhist Psychology', 'Wisdom', 'Books');

CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  cover_image TEXT,
  category post_category NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Bodhi Mitra',
  excerpt TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_posts_category ON public.posts(category);
CREATE INDEX idx_posts_created_at ON public.posts(created_at DESC);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts are publicly viewable"
ON public.posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert posts"
ON public.posts FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts"
ON public.posts FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete posts"
ON public.posts FOR DELETE
TO authenticated
USING (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.posts (title, slug, category, excerpt, cover_image, content) VALUES
('The Four Noble Truths and Cognitive Behavioral Therapy', 'four-noble-truths-cbt', 'Buddhist Psychology', 'How the Buddha''s foundational teaching mirrors the framework of modern CBT in understanding suffering.', null,
'The Four Noble Truths form the cornerstone of Buddhist philosophy, articulated over 2,500 years ago. Remarkably, they share a profound structural resemblance to Cognitive Behavioral Therapy (CBT), one of the most evidence-based psychological treatments today.

The first truth acknowledges suffering (dukkha). In therapy, we begin by validating the patient''s pain. The second identifies craving and aversion as causes — much like CBT''s identification of maladaptive thought patterns. The third offers hope: cessation is possible. The fourth provides the path — a structured method, parallel to a treatment plan.

When we sit with a patient and gently map their distress, we are walking an ancient road in modern shoes.'),

('On Letting Go: Anatta and the Self in Therapy', 'anatta-self-therapy', 'Buddhist Psychology', 'Exploring the Buddhist teaching of non-self alongside contemporary theories of identity and ego.', null,
'The doctrine of anatta, or non-self, is often misunderstood. It does not deny that we exist; it questions the solidity of the self we cling to.

In clinical practice, much suffering arises from a rigid self-concept — "I am a failure," "I am unlovable." When we loosen identification with these stories, healing begins. The self becomes a process, not a prison.'),

('The Quiet Mind: A Daily Practice', 'quiet-mind-daily-practice', 'Wisdom', 'Simple reflections on cultivating stillness amidst the noise of modern life.', null,
'Stillness is not the absence of sound. It is the presence of attention. Each morning, before the day claims you, sit. Breathe. Notice. Begin again.'),

('Why We Suffer in Comparison', 'suffering-comparison', 'Wisdom', 'A meditation on envy, social media, and the art of returning to one''s own path.', null,
'Comparison is the thief of presence. When we measure our inner life against another''s outer display, we trade what is real for what only seems.'),

('Review: "When Things Fall Apart" by Pema Chödrön', 'review-when-things-fall-apart', 'Books', 'A timeless companion for navigating chaos with tenderness and courage.', null,
'Pema Chödrön writes as though she is sitting beside you in your darkest hour. This book does not promise to fix you — it teaches you to stay.'),

('Review: "Full Catastrophe Living" by Jon Kabat-Zinn', 'review-full-catastrophe-living', 'Books', 'The foundational text on mindfulness-based stress reduction, and why it still matters.', null,
'Kabat-Zinn bridges the contemplative and the clinical. This is not a book to read once, but a manual to return to across the seasons of a life.');
