-- ============================================================================
-- Bodhi Mitra — Seed Data
-- ============================================================================
-- Run this AFTER migrations have been applied.
--
-- BEFORE RUNNING:
--   1. Sign up / sign in at /login
--   2. Get your UUID from the browser console:
--      (await supabase.auth.getUser()).data.user.id
--   3. Paste that UUID into the seed_user CTE below (line ~22)
--   4. Run this in your Supabase SQL editor or via psql
-- ============================================================================

-- ════════════════════════════════════════════════════════════════════════════
-- CONFIGURATION — replace this UUID with your actual Supabase Auth user ID
-- ════════════════════════════════════════════════════════════════════════════

WITH
seed_user AS (
  SELECT
    '37357014-5df2-4877-a96b-8a8baef5cdb6'::uuid AS uid
    -- ↑ Your UUID, looked up via Auth Admin API on 2026-06-04
),

-- ════════════════════════════════════════════════════════════════════════════
-- POSTS — bilingual content across all three categories
-- ════════════════════════════════════════════════════════════════════════════

post1 AS (
  INSERT INTO public.posts (
    slug, category, status,
    title_en, title_bn,
    content_en, content_bn,
    excerpt_en, excerpt_bn,
    author_name, tags, created_at
  ) VALUES (
    'the-space-between-thoughts',
    'Buddhist Psychology',
    'published',
    'The Space Between Thoughts',
    'চিন্তার মাঝের শূন্যস্থান',
    '<p>There is a teaching in the early Buddhist discourses that speaks of the mind as a forest — dense, tangled, alive with movement. The Buddha does not ask us to clear the forest. He asks us to notice the space between the trees.</p><p>In my practice as a psychiatrist, I have found this image to be profoundly useful. When a patient sits across from me, caught in the thicket of rumination, I sometimes ask: "Between the thought that just passed and the one that is arriving, is there not a sliver of stillness?"</p><p>This is not a trick question. In the Abhidhamma, the Buddhist phenomenological psychology, mind-moments (cittas) arise and cease at an inconceivable speed. Yet between each moment, there is what the Commentaries call the "gap" — the momentary absence of mind, the pure potential of the next cognition.</p><p>Modern neuroscience describes something similar in the default mode network (DMN). When the DMN is overactive, we experience rumination, self-referential looping, and mental time-travel into past regrets or future anxieties. Mindfulness practice has been shown to quiet the DMN — not by silencing it, but by creating more spaciousness around its activity.</p><blockquote><p>In the silence between thoughts, we discover that we are not our thoughts. We are the space in which they appear.</p></blockquote><p>This is not an escape from thinking. It is a reorientation — from being lost in thought to being present with thought. And in that presence, something shifts. The tightness loosens. The forest breathes.</p><p>For the clinician, this has direct application. When working with anxiety disorders, the cognitive fusion that drives distress is not the presence of thoughts but our entanglement with them. Teaching a patient to rest in the gap — even for a breath — can be the first step toward disidentification from the narrative mind.</p><p>The forest does not need to be cleared. It only needs to be seen clearly. And in the seeing, the space appears.</p>',
    '<p>আদি বৌদ্ধ সূত্রগুলিতে একটি শিক্ষা আছে যা মনকে একটি বনের সাথে তুলনা করে — ঘন, জটিল, চলাচলে পূর্ণ। বুদ্ধ আমাদের বন পরিষ্কার করতে বলেন না। তিনি বলেন বৃক্ষগুলির মাঝের শূন্যস্থান লক্ষ্য করতে।</p><p>মনোরোগ বিশেষজ্ঞ হিসেবে আমার অনুশীলনে, আমি এই চিত্রটিকে গভীরভাবে কার্যকর পেয়েছি। যখন একজন রোগী আমার সামনে বসে থাকে, চিন্তার জটিলতায় আটকে, আমি মাঝে মাঝে জিজ্ঞাসা করি: "যে চিন্তাটি এইমাত্র গেল এবং যে চিন্তাটি আসছে, তাদের মাঝে কি স্থিরতার একটি ক্ষণিক নেই?"</p><p>এটি একটি কৌশলী প্রশ্ন নয়। অভিধম্মে, বৌদ্ধ ঘটনাগত মনোবিজ্ঞানে, চিত্ত-ক্ষণগুলি অকল্পনীয় গতিতে উৎপন্ন এবং বিলীন হয়। তবুও প্রতিটি ক্ষণের মাঝে রয়েছে যা টীকাগ্রন্থে "ব্যবধান" নামে পরিচিত — মনের সাময়িক অনুপস্থিতি, পরবর্তী জ্ঞানের বিশুদ্ধ সম্ভাবনা।</p><p>আধুনিক স্নায়ুবিজ্ঞান ডিফল্ট মোড নেটওয়ার্ক (DMN)-এ অনুরূপ কিছু বর্ণনা করে। যখন DMN অতিসক্রিয় হয়, আমরা র্যুমিনেশন, আত্ম-রেফারেন্সিয়াল লুপিং, এবং অতীতের অনুশোচনা বা ভবিষ্যতের উদ্বেগে মানসিক সময়-ভ্রমণ অনুভব করি। মাইন্ডফুলনেস অনুশীলন DMN-কে শান্ত করতে দেখা গেছে — এটিকে নীরব করে নয়, বরং এর কার্যকলাপের চারপাশে আরও প্রশস্ততা তৈরি করে।</p><blockquote><p>চিন্তার মাঝের নীরবতায় আমরা আবিষ্কার করি যে আমরা আমাদের চিন্তা নই। আমরা সেই স্থান যেখানে তারা আবির্ভূত হয়।</p></blockquote>',
    'A reflection on the space between thoughts — where Buddhist phenomenology meets the neuroscience of the default mode network.',
    'চিন্তার মাঝের শূন্যস্থান নিয়ে একটি চিন্তাভাবনা — যেখানে বৌদ্ধ ঘটনাবিদ্যা ডিফল্ট মোড নেটওয়ার্কের স্নায়ুবিজ্ঞানের সাথে মিলিত হয়।',
    'Dr. Aruni Sen',
    ARRAY['mindfulness', 'neuroscience', 'default-mode-network', 'anxiety'],
    now() - interval '14 days'
  ) RETURNING id
),

post2 AS (
  INSERT INTO public.posts (
    slug, category, status,
    title_en, title_bn,
    content_en, content_bn,
    excerpt_en, excerpt_bn,
    author_name, tags, created_at
  ) VALUES (
    'sitting-with-impermanence',
    'Buddhist Psychology',
    'published',
    'Sitting with Impermanence',
    'অনিত্যের সাথে বসা',
    '<p>Everything changes. This is the simplest truth of the Buddhist teachings, and the most difficult to truly inhabit.</p><p>Anicca — impermanence — is not a philosophical abstraction. It is the felt reality of a breath that cannot be held, a sound that fades the moment it is heard, a sensation that rises and passes like a wave returning to the sea.</p><p>In the Satipatthana Sutta, the Buddha instructs practitioners to observe the body, feelings, mind, and phenomena as they arise and pass away. Not as static entities, but as processes — dynamic, fluid, ungraspable.</p><p>In therapy, I have seen what happens when we resist this truth. Grief becomes complicated not because the loss is greater, but because the resistance to change is stronger. Anxiety is, at its root, a refusal to accept the uncertainty of the next moment. Depression often involves a frozen relationship with time — a feeling that the pain will never end.</p><p>The practice of sitting with impermanence is not about becoming cold or detached. It is about learning to be with experience without needing it to be otherwise. It is the art of letting the wave rise and fall without clinging to the crest or fearing the trough.</p><p>We can practice this in small ways. Notice the end of an exhale. Feel the last warmth of a cup of tea. Observe a thought as it dissolves. These are not exercises in melancholy — they are trainings in freedom.</p><p>As the Zen master Dogen wrote: "Firewood becomes ash; it does not become firewood again." There is no need to become something else. We are already, always, in the midst of the great unfolding.</p>',
    '<p>সবকিছু বদলায়। এটি বৌদ্ধ শিক্ষার সবচেয়ে সরল সত্য, এবং বসবাস করার জন্য সবচেয়ে কঠিন।</p><p>অনিত্য — অস্থিরতা — একটি দার্শনিক বিমূর্ততা নয়। এটি একটি নিঃশ্বাসের অনুভূত বাস্তবতা যা ধরে রাখা যায় না, একটি শব্দ যা শোনার মুহূর্তেই মিলিয়ে যায়, একটি অনুভূতি যা তরঙ্গের মতো উঠে এবং সাগরে ফিরে যায়।</p><p>সতিপট্ঠান সূত্রে, বুদ্ধ অনুশীলনকারীদেরকে নির্দেশ দেন শরীর, অনুভূতি, মন এবং ধর্মগুলি দেখতে যেমন তারা উৎপন্ন হয় এবং বিলীন হয়। স্থির সত্তা হিসাবে নয়, বরং প্রক্রিয়া হিসাবে — গতিশীল, তরল, অধরা।</p><p>থেরাপিতে, আমি দেখেছি যখন আমরা এই সত্যকে প্রতিরোধ করি তখন কী হয়। শোক জটিল হয় কারণ ক্ষতি বড় নয়, বরং পরিবর্তনের প্রতিরোধ বেশি শক্তিশালী। উদ্বেগ, তার মূলে, পরবর্তী মুহূর্তের অনিশ্চয়তা গ্রহণ করতে অস্বীকার করা। বিষণ্নতা প্রায়ই সময়ের সাথে একটি হিমায়িত সম্পর্ক জড়িত — একটি অনুভূতি যে ব্যথা কখনও শেষ হবে না।</p><p>অনিত্যের সাথে বসার অনুশীলন ঠাণ্ডা বা বিচ্ছিন্ন হওয়ার বিষয়ে নয়। এটি অভিজ্ঞতার সাথে থাকতে শেখার বিষয়ে, এটিকে অন্যথা হওয়ার প্রয়োজন না করে। তরঙ্গের উত্থান এবং পতনকে আঁকড়ে না ধরে, শীর্ষে না জড়িয়ে বা খাদকে না ভয় পেয়ে, তাকে যেতে দেওয়ার শিল্প।</p>',
    'Impermanence is not a philosophical abstraction but the felt reality of every breath. Reflections from the Satipatthana Sutta and the therapy room.',
    'অনিত্য একটি দার্শনিক বিমূর্ততা নয় বরং প্রতিটি নিঃশ্বাসের অনুভূত বাস্তবতা। সতিপট্ঠান সূত্র এবং থেরাপি কক্ষ থেকে প্রতিফলন।',
    'Dr. Aruni Sen',
    ARRAY['impermanence', 'grief', 'anxiety', 'satipatthana'],
    now() - interval '7 days'
  ) RETURNING id
),

post3 AS (
  INSERT INTO public.posts (
    slug, category, status,
    title_en, title_bn,
    content_en, content_bn,
    excerpt_en, excerpt_bn,
    author_name, tags, created_at
  ) VALUES (
    'the-arrow-and-the-second-arrow',
    'Wisdom',
    'published',
    'The Arrow and the Second Arrow',
    'তীর ও দ্বিতীয় তীর',
    '<p>The Buddha tells a story of two arrows.</p><p>The first arrow is the unavoidable pain of life — illness, aging, loss, disappointment. It touches everyone. No one escapes it.</p><p>The second arrow is the one we shoot ourselves. It is the story we add to the pain: "This should not be happening." "Why me?" "I cannot bear this." It is the rumination, the self-blame, the catastrophic projection into a future that has not yet arrived.</p><p>The teaching is not that we can stop the first arrow. We cannot. But we can choose, moment by moment, whether to reach for the second.</p><p>In modern psychological terms, this distinction maps beautifully onto the difference between pain and suffering. Pain is inevitable; suffering is optional. Pain is the raw sensory and emotional experience. Suffering is the narrative we construct around it — the resistance, the identification, the struggle.</p><p>Acceptance and Commitment Therapy (ACT) makes a similar move. It teaches psychological flexibility: the ability to stay in contact with the present moment fully, even when it contains difficult thoughts and feelings, and to act in ways that align with one''s values rather than one''s reactive patterns.</p><p>The practice, then, is not to eliminate pain — that would be a delusion. It is to notice the second arrow as it forms, to see the hand reaching for the bow, and to gently place it down. Not because the pain does not matter, but because we matter too much to add unnecessary suffering to an already difficult life.</p>',
    '<p>বুদ্ধ দুই তীরের একটি গল্প বলেন।</p><p>প্রথম তীরটি জীবনের অনিবার্য বেদনা — অসুস্থতা, বার্ধক্য, ক্ষতি, হতাশা। এটি প্রত্যেককে স্পর্শ করে। কেউ এটি এড়াতে পারে না।</p><p>দ্বিতীয় তীরটি আমরা নিজেরাই ছুঁড়ি। এটি সেই গল্প যা আমরা বেদনার সাথে যোগ করি: "এটি হওয়া উচিত নয়।" "কেন আমি?" "আমি এটি সহ্য করতে পারি না।" এটি র্যুমিনেশন, আত্ম-দোষ, ভবিষ্যতের একটি বিপর্যয়কর কল্পনা যা এখনও আসেনি।</p><p>শিক্ষাটি এই নয় যে আমরা প্রথম তীর থামাতে পারি। আমরা পারি না। কিন্তু আমরা মুহূর্তে মুহূর্তে বেছে নিতে পারি দ্বিতীয়টির জন্য হাত বাড়াবো কিনা।</p><p>আধুনিক মনস্তাত্ত্বিক পরিভাষায়, এই পার্থক্যটি ব্যথা এবং কষ্টের মধ্যে পার্থক্যের সাথে সুন্দরভাবে মিলে যায়। ব্যথা অনিবার্য; কষ্ট ঐচ্ছিক। ব্যথা হল কাঁচা সংবেদনশীল এবং আবেগজনিত অভিজ্ঞতা। কষ্ট হল সেই আখ্যান যা আমরা এর চারপাশে নির্মাণ করি — প্রতিরোধ, পরিচয়, সংগ্রাম।</p><p>অ্যাকসেপ্টেন্স অ্যান্ড কমিটমেন্ট থেরাপি (ACT) একই ধরনের পদ্ধতি গ্রহণ করে। এটি মনস্তাত্ত্বিক নমনীয়তা শেখায়: বর্তমান মুহূর্তের সাথে সম্পূর্ণ সংস্পর্শে থাকার ক্ষমতা, এমনকি যখন এটি কঠিন চিন্তা এবং অনুভূতি ধারণ করে, এবং প্রতিক্রিয়াশীল প্যাটার্নের পরিবর্তে মূল্যবোধের সাথে সামঞ্জস্যপূর্ণভাবে কাজ করার ক্ষমতা।</p>',
    'The Buddha''s teaching on the two arrows — a timeless framework for understanding the difference between pain and suffering, echoed in modern ACT therapy.',
    'বুদ্ধের দুই তীরের শিক্ষা — ব্যথা এবং কষ্টের মধ্যে পার্থক্য বোঝার জন্য একটি চিরকালীন কাঠামো, আধুনিক ACT থেরাপিতে প্রতিধ্বনিত।',
    'Dr. Aruni Sen',
    ARRAY['two-arrows', 'ACT', 'pain', 'suffering', 'acceptance'],
    now() - interval '12 days'
  ) RETURNING id
),

post4 AS (
  INSERT INTO public.posts (
    slug, category, status,
    title_en, title_bn,
    content_en, content_bn,
    excerpt_en, excerpt_bn,
    author_name, tags, created_at
  ) VALUES (
    'on-not-knowing',
    'Wisdom',
    'published',
    'On Not Knowing',
    'না-জানার উপর',
    '<p>The most liberating sentence in the Pali canon may be this one, spoken by the Buddha to a group of monks at Kosambi: "It is by not knowing, by not seeing things as they actually are, that we are bound."</p><p>The inverse is also true: it is by knowing, by seeing clearly, that we are free. But what does this knowing look like? It is not the accumulation of facts. It is not belief. It is a direct, embodied seeing — what the tradition calls vipassanā, insight.</p><p>And yet, there is a deeper teaching hiding here. The path of insight ultimately leads to a recognition that the mind cannot fully grasp the nature of reality. The intellect reaches its limit. And in that limit, there is a different kind of knowing — a knowing that is closer to unknowing.</p><p>This is where Buddhist wisdom meets the humility of good psychotherapy. The best therapists I know do not pretend to have all the answers. They sit with uncertainty. They trust the process more than their theories.</p><p>There is a famous story of a Zen student who asked his teacher, "What is the truth?" The teacher smiled and said, "I don''t know." The student was enlightened in that moment — not because he received an answer, but because he saw that truth is not captured in words.</p><p>In clinical practice, this translates into holding our diagnostic categories lightly. A diagnosis is a useful map, but it is not the territory. The person sitting in front of us is always more than the label we carry about them.</p><p>To not know is to remain open. And to remain open is to be teachable. And to be teachable is to be free.</p>',
    '<p>পালি ত্রিপিটকের সবচেয়ে মুক্তিদায়ক বাক্যটি হতে পারে এই, যা বুদ্ধ কোসাম্বীর একদল ভিক্ষুকে বলেছিলেন: "না জেনে, জিনিসগুলিকে সেগুলি যেমন সত্যিই আছে তা না দেখে, আমরা আবদ্ধ।"</p><p>বিপরীতটিও সত্য: জেনে, স্পষ্টভাবে দেখে, আমরা মুক্ত। কিন্তু এই জানা দেখতে কেমন? এটি তথ্যের সঞ্চয় নয়। এটি বিশ্বাস নয়। এটি একটি প্রত্যক্ষ, মূর্ত দেখা — যা ঐতিহ্যে বিপশ্যনা, অন্তর্দৃষ্টি নামে পরিচিত।</p><p>এবং তবুও, এখানে একটি গভীর শিক্ষা লুকিয়ে আছে। অন্তর্দৃষ্টির পথ শেষ পর্যন্ত একটি স্বীকৃতির দিকে নিয়ে যায় যে মন বাস্তবতার প্রকৃতি সম্পূর্ণরূপে উপলব্ধি করতে পারে না। বুদ্ধি তার সীমায় পৌঁছে যায়। এবং সেই সীমায়, এক ভিন্ন ধরনের জানা আছে — একটি জানা যা না-জানার কাছাকাছি।</p><p>এখানেই বৌদ্ধ জ্ঞান ভালো সাইকোথেরাপির নম্রতার সাথে মিলিত হয়। আমি যেসব থেরাপিস্টকে জানি তাদের মধ্যে সেরারা ভান করে না যে তাদের কাছে সব উত্তর আছে। তারা অনিশ্চয়তার সাথে বসে। তারা তাদের তত্ত্বের চেয়ে প্রক্রিয়াকে বেশি বিশ্বাস করে।</p><p>চিকিৎসা অনুশীলনে, এটি আমাদের ডায়াগনস্টিক বিভাগগুলিকে হালকাভাবে ধারণ করার অনুবাদ করে। একটি রোগ নির্ণয় একটি দরকারী মানচিত্র, কিন্তু এটি অঞ্চল নয়। আমাদের সামনে বসে থাকা ব্যক্তি সর্বদা আমাদের তার সম্পর্কে বহন করা লেবেলের চেয়ে বেশি।</p>',
    'The wisdom of not knowing — what the Buddhist path of insight and the humility of good psychotherapy both teach us about uncertainty.',
    'না-জানার জ্ঞান — বৌদ্ধ অন্তর্দৃষ্টির পথ এবং ভালো সাইকোথেরাপির নম্রতা উভয়ই আমাদের অনিশ্চয়তা সম্পর্কে কী শেখায়।',
    'Dr. Aruni Sen',
    ARRAY['insight', 'vipassana', 'uncertainty', 'psychotherapy'],
    now() - interval '5 days'
  ) RETURNING id
),

post5 AS (
  INSERT INTO public.posts (
    slug, category, status,
    title_en, title_bn,
    content_en, content_bn,
    excerpt_en, excerpt_bn,
    author_name, tags, created_at
  ) VALUES (
    'reading-the-mind-reading-the-self',
    'Books',
    'published',
    'Reading the Mind, Reading the Self',
    'মন পড়া, নিজেকে পড়া',
    '<p>There is a peculiar intimacy in reading a book that seems to be reading you back. The right book, at the right moment, does not simply inform — it illuminates. It reveals something that was always there but had not yet been named.</p><p>In the Buddhist tradition, the act of reading has always been intertwined with the act of self-inquiry. The sutras are not meant to be consumed passively. They are meant to be contemplated, turned over in the mind, lived into.</p><p>This is why I often recommend reading as a complement to therapy. Not self-help books in the conventional sense (though some are valuable), but the kind of books that stretch the imagination, unsettle habitual thinking, and offer new language for old experiences.</p><p>Here are a few that have accompanied my own practice — and that I sometimes share with patients who are drawn to the contemplative path:</p><p><strong>The Heart of the Buddha''s Teaching</strong> by Thich Nhat Hanh — A lucid, warm introduction to the core teachings, written with the kind of clarity that only deep practice can produce.</p><p><strong>Radical Acceptance</strong> by Tara Brach — A beautiful integration of Buddhist psychology and Western psychotherapy, with practical meditations for working with shame and unworthiness.</p><p><strong>The Man Who Mistook His Wife for a Hat</strong> by Oliver Sacks — Not a Buddhist book, but a profound meditation on identity, perception, and the fragility of the self — themes that resonate deeply with the Buddhist understanding of anattā (not-self).</p><p><strong>The Book of Disquiet</strong> by Fernando Pessoa — A strange, fragmentary work that captures the texture of inner experience with astonishing precision.</p><p>Reading, like sitting, is a way of paying attention. And what we pay attention to, we come to know.</p>',
    '<p>একটি বই পড়ার মধ্যে একটি অদ্ভুত ঘনিষ্ঠতা আছে যা মনে হয় আপনাকে ফিরে পড়ছে। সঠিক বই, সঠিক মুহূর্তে, কেবল তথ্য দেয় না — এটি আলোকিত করে। এটি এমন কিছু প্রকাশ করে যা সর্বদা ছিল কিন্তু এখনও নামকরণ করা হয়নি।</p><p>বৌদ্ধ ঐতিহ্যে, পড়ার কাজ সর্বদা আত্ম-অনুসন্ধানের কাজের সাথে জড়িত। সূত্রগুলি নিষ্ক্রিয়ভাবে গ্রহণ করার জন্য নয়। সেগুলি চিন্তা করার জন্য, মনে উল্টিয়ে দেখার জন্য, বেঁচে থাকার জন্য।</p><p>এই কারণেই আমি প্রায়ই থেরাপির পরিপূরক হিসাবে পড়ার সুপারিশ করি। প্রচলিত অর্থে স্ব-সহায়তা বই নয় (যদিও কিছু মূল্যবান), বরং সেই ধরনের বই যা কল্পনাকে প্রসারিত করে, অভ্যাসগত চিন্তাকে অস্থির করে, এবং পুরানো অভিজ্ঞতার জন্য নতুন ভাষা সরবরাহ করে।</p><p>এখানে কিছু বই রয়েছে যা আমার নিজের অনুশীলনের সাথে রয়েছে — এবং যা আমি মাঝে মাঝে সেই রোগীদের সাথে ভাগ করি যারা ধ্যানশীল পথের প্রতি আকৃষ্ট।</p><p><strong>থিচ নাট হানহের বুদ্ধের শিক্ষার হৃদয়</strong> — মুখ্য শিক্ষাগুলির একটি স্পষ্ট, উষ্ণ ভূমিকা, এমন স্বচ্ছতার সাথে যা কেবল গভীর অনুশীলনই তৈরি করতে পারে।</p>',
    'On the art of reading as contemplative practice — and a few book recommendations for the path.',
    'ধ্যানশীল অনুশীলন হিসাবে পড়ার শিল্পের উপর — এবং পথের জন্য কিছু বইয়ের সুপারিশ।',
    'Dr. Aruni Sen',
    ARRAY['reading', 'books', 'contemplative-practice', 'self-inquiry'],
    now() - interval '3 days'
  ) RETURNING id
),

-- ════════════════════════════════════════════════════════════════════════════
-- COMMENTS — uses RETURNING to capture IDs for parent-child relationships
-- ════════════════════════════════════════════════════════════════════════════
-- These will only insert if seed_user.uid is NOT the nil UUID.

comment1 AS (
  INSERT INTO public.comments (post_id, user_id, user_name, comment_text, created_at, parent_id)
  SELECT
    post1.id, seed_user.uid, 'Priya M.',
    'This resonates deeply. I have been practicing noting meditation for a few months and the image of the "gap" between thoughts is exactly what I have been experiencing — though I could not put words to it. Thank you.',
    now() - interval '10 days',
    NULL
  FROM post1, seed_user
  WHERE seed_user.uid != '00000000-0000-0000-0000-000000000000'
  RETURNING id
),

comment2 AS (
  INSERT INTO public.comments (post_id, user_id, user_name, comment_text, created_at, parent_id)
  SELECT
    post1.id, seed_user.uid, 'Dr. Aruni Sen',
    'Thank you, Priya. The fact that you are experiencing the gap directly through your practice is the whole point — words can only point toward it. Wishing you well on the path.',
    now() - interval '9 days',
    comment1.id
  FROM post1, seed_user, comment1
  WHERE seed_user.uid != '00000000-0000-0000-0000-000000000000'
  RETURNING id
),

comment3 AS (
  INSERT INTO public.comments (post_id, user_id, user_name, comment_text, created_at, parent_id)
  SELECT
    post3.id, seed_user.uid, 'Ravi K.',
    'I work as a therapist and I often share this teaching with clients. The two arrows is one of those frameworks that is simple enough to remember in a difficult moment and deep enough to keep revealing new layers. Beautifully written.',
    now() - interval '8 days',
    NULL
  FROM post3, seed_user
  WHERE seed_user.uid != '00000000-0000-0000-0000-000000000000'
  RETURNING id
),

comment4 AS (
  INSERT INTO public.comments (post_id, user_id, user_name, comment_text, created_at, parent_id)
  SELECT
    post2.id, seed_user.uid, 'Mei L.',
    'The line "Firewood becomes ash; it does not become firewood again" has stayed with me all week. There is something strangely comforting in that — not as resignation, but as an invitation to fully inhabit what is, without grasping for what was.',
    now() - interval '4 days',
    NULL
  FROM post2, seed_user
  WHERE seed_user.uid != '00000000-0000-0000-0000-000000000000'
  RETURNING id
),

comment5 AS (
  INSERT INTO public.comments (post_id, user_id, user_name, comment_text, created_at, parent_id)
  SELECT
    post4.id, seed_user.uid, 'Ananya D.',
    'This speaks to something I have been feeling in my own meditation practice — the more I sit, the less I feel I "know", and yet the more I feel I understand. It is a strange paradox. Thank you for articulating it so clearly.',
    now() - interval '2 days',
    NULL
  FROM post4, seed_user
  WHERE seed_user.uid != '00000000-0000-0000-0000-000000000000'
  RETURNING id
),

-- ════════════════════════════════════════════════════════════════════════════
-- SITE SETTINGS — ensure og_image_url field exists
-- ════════════════════════════════════════════════════════════════════════════

settings_update AS (
  UPDATE public.site_settings
  SET config = jsonb_set(
    config,
    '{seo,og_image_url}',
    to_jsonb(''::text)
  )
  WHERE id = TRUE
    AND (config->'seo'->>'og_image_url') IS NULL
  RETURNING id
)

-- ════════════════════════════════════════════════════════════════════════════
-- RESULT
-- ════════════════════════════════════════════════════════════════════════════

SELECT
  'Seed complete' AS result,
  (SELECT count(*) FROM public.posts WHERE status = 'published') AS posts_inserted,
  (SELECT count(*) FROM public.comments) AS comments_inserted;

-- ════════════════════════════════════════════════════════════════════════════
-- BONUS: Grant yourself admin role (run separately after replacing the UUID)
-- ════════════════════════════════════════════════════════════════════════════
-- After running the seed above, open a new query tab and run:
--
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('your-uuid-here', 'admin')
--   ON CONFLICT (user_id, role) DO NOTHING;
--
-- This grants you access to /admin.
