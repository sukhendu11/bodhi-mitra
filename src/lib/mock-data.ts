import type { Category } from "@/lib/taxonomy";
import type { Post, PaginatedResult, PostCategory } from "@/lib/posts";
import type { NavItem } from "@/lib/navigation";
import type { Book, BookSortOption } from "@/lib/books";
import type { Video } from "@/lib/videos";
import type { Page } from "@/lib/pages";
import {
  mockApplyBookOverrides,
  mockApplyPostOverrides,
  mockApplyVideoOverrides,
} from "@/lib/mock-cms";

// ─── Categories ─────────────────────────────────────────────

const MOCK_CATEGORIES_DATA: Category[] = [
  // ── Parent categories ──
  { id: "cat-1", slug: "meditation", name_en: "Meditation", name_bn: "ধ্যান", description_en: "Guided and silent meditation practices, techniques, and reflections on the art of sitting.", description_bn: "নির্দেশিত ও নীরব ধ্যান অনুশীলন, কৌশল এবং বসার শিল্পের প্রতিফলন।", icon: "", color: "#8B5CF6", sort_order: 0, visible: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-2", slug: "mindfulness", name_en: "Mindfulness", name_bn: "মাইন্ডফুলনেস", description_en: "Everyday mindfulness practices for cultivating awareness, presence, and peace.", description_bn: "সচেতনতা, উপস্থিতি এবং শান্তি চাষের জন্য দৈনন্দিন মাইন্ডফুলনেস অনুশীলন।", icon: "", color: "#10B981", sort_order: 1, visible: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-3", slug: "mental-health", name_en: "Mental Health", name_bn: "মানসিক স্বাস্থ্য", description_en: "Buddhist perspectives on mental health, emotional resilience, and well-being.", description_bn: "মানসিক স্বাস্থ্য, আবেগগত স্থিতিস্থাপকতা এবং সুস্থতার উপর বৌদ্ধ দৃষ্টিভঙ্গি।", icon: "", color: "#F59E0B", sort_order: 2, visible: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-4", slug: "philosophy", name_en: "Philosophy", name_bn: "দর্শন", description_en: "Exploring the philosophical foundations of Buddhist thought and their relevance today.", description_bn: "বৌদ্ধ চিন্তার দার্শনিক ভিত্তি এবং আজ তাদের প্রাসঙ্গিকতা অন্বেষণ।", icon: "", color: "#3B82F6", sort_order: 3, visible: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-5", slug: "buddhist-psychology", name_en: "Buddhist Psychology", name_bn: "বৌদ্ধ মনোবিজ্ঞান", description_en: "Where ancient Buddhist wisdom meets modern psychological understanding of mind and emotion.", description_bn: "যেখানে প্রাচীন বৌদ্ধ জ্ঞান মিলিত হয় মন ও আবেগের আধুনিক মনস্তাত্ত্বিক বোঝাপড়ার সাথে।", icon: "", color: "#EC4899", sort_order: 4, visible: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },

  // ── Meditation sub-categories (level 2) ──
  { id: "cat-1a", slug: "guided-meditation", name_en: "Guided Meditation", name_bn: "নির্দেশিত ধ্যান", description_en: "Step-by-step guided sessions for all levels.", description_bn: "সকল স্তরের জন্য ধাপে ধাপে নির্দেশিত অনুশীলন।", icon: "", color: "#8B5CF6", sort_order: 0, visible: true, parent_id: "cat-1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-1b", slug: "silent-sitting", name_en: "Silent Sitting", name_bn: "নীরব বসা", description_en: "The practice of sitting in stillness without guidance.", description_bn: "নির্দেশনা ছাড়াই স্থিরতায় বসার অনুশীলন।", icon: "", color: "#8B5CF6", sort_order: 1, visible: true, parent_id: "cat-1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-1c", slug: "walking-meditation", name_en: "Walking Meditation", name_bn: "হাঁটার ধ্যান", description_en: "Mindful movement as meditation practice.", description_bn: "ধ্যান অনুশীলন হিসাবে সচেতন চলাচল।", icon: "", color: "#8B5CF6", sort_order: 2, visible: true, parent_id: "cat-1", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },

  // ── Meditation sub-sub-categories (level 3) ──
  { id: "cat-1a1", slug: "breath-awareness", name_en: "Breath Awareness", name_bn: "শ্বাস সচেতনতা", description_en: "Focused attention on the breath as anchor.", description_bn: "নোঙর হিসাবে শ্বাসে কেন্দ্রীভূত মনোযোগ।", icon: "", color: "#8B5CF6", sort_order: 0, visible: true, parent_id: "cat-1a", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-1a2", slug: "loving-kindness", name_en: "Loving-Kindness", name_bn: "মৈত্রী", description_en: "Metta meditation for cultivating universal love.", description_bn: "সার্বজনীন ভালোবাসা গড়ে তোলার জন্য মৈত্রী ধ্যান।", icon: "", color: "#8B5CF6", sort_order: 1, visible: true, parent_id: "cat-1a", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },

  // ── Mindfulness sub-categories (level 2) ──
  { id: "cat-2a", slug: "morning-practice", name_en: "Morning Practice", name_bn: "সকালের অনুশীলন", description_en: "Start your day with mindful intention.", description_bn: "সচেতন উদ্দেশ্য দিয়ে আপনার দিন শুরু করুন।", icon: "", color: "#10B981", sort_order: 0, visible: true, parent_id: "cat-2", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-2b", slug: "mindful-eating", name_en: "Mindful Eating", name_bn: "সচেতন খাদ্য গ্রহণ", description_en: "Transform your relationship with food.", description_bn: "খাদ্যের সাথে আপনার সম্পর্ক রূপান্তরিত করুন।", icon: "", color: "#10B981", sort_order: 1, visible: true, parent_id: "cat-2", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-2c", slug: "mindful-communication", name_en: "Mindful Communication", name_bn: "সচেতন যোগাযোগ", description_en: "Speaking and listening with presence.", description_bn: "উপস্থিতি সহ কথা বলা এবং শোনা।", icon: "", color: "#10B981", sort_order: 2, visible: true, parent_id: "cat-2", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },

  // ── Mental Health sub-categories (level 2) ──
  { id: "cat-3a", slug: "anxiety-stress", name_en: "Anxiety & Stress", name_bn: "উদ্বেগ ও চাপ", description_en: "Working with anxiety through Buddhist wisdom.", description_bn: "বৌদ্ধ জ্ঞানের মাধ্যমে উদ্বেগের সাথে কাজ করা।", icon: "", color: "#F59E0B", sort_order: 0, visible: true, parent_id: "cat-3", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-3b", slug: "emotional-resilience", name_en: "Emotional Resilience", name_bn: "আবেগগত স্থিতিস্থাপকতা", description_en: "Building inner strength and balance.", description_bn: "অভ্যন্তরীণ শক্তি এবং ভারসাম্য গড়ে তোলা।", icon: "", color: "#F59E0B", sort_order: 1, visible: true, parent_id: "cat-3", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },

  // ── Philosophy sub-categories (level 2) ──
  { id: "cat-4a", slug: "four-noble-truths", name_en: "The Four Noble Truths", name_bn: "চারটি আর্যসত্য", description_en: "The foundation of Buddhist teaching.", description_bn: "বৌদ্ধ শিক্ষার ভিত্তি।", icon: "", color: "#3B82F6", sort_order: 0, visible: true, parent_id: "cat-4", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  { id: "cat-4b", slug: "eightfold-path", name_en: "The Eightfold Path", name_bn: "অষ্টাঙ্গিক পথ", description_en: "The practical path to liberation.", description_bn: "মুক্তির ব্যবহারিক পথ।", icon: "", color: "#3B82F6", sort_order: 1, visible: true, parent_id: "cat-4", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
];

// ─── Posts ──────────────────────────────────────────────────

function mockPost(
  id: string,
  slug: string,
  titleEn: string,
  titleBn: string,
  excerptEn: string,
  excerptBn: string,
  category: PostCategory,
  author: string,
  daysAgo: number,
  contentEn?: string,
  contentBn?: string,
  coverImage?: string,
): Post {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return {
    id,
    title: titleEn,
    content: contentEn || null,
    excerpt: excerptEn,
    title_en: titleEn,
    title_bn: titleBn,
    content_en: contentEn || null,
    content_bn: contentBn || contentEn || null,
    excerpt_en: excerptEn,
    excerpt_bn: excerptBn,
    slug,
    cover_image: coverImage || `https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format`,
    category,
    author_name: author,
    author_image: null,
    status: "published",
    tags: [],
    created_at: d.toISOString(),
  };
}

const MOCK_POSTS_DATA: Post[] = [
  // ── Meditation (5) ──
  mockPost("post-1", "the-art-of-sitting-still", "The Art of Sitting Still", "স্থির হয়ে বসার শিল্প", "An exploration of what it means to be fully present in meditation, beyond technique.", "ধ্যানে পুরোপুরি উপস্থিত থাকার অর্থ কী — কৌশলের বাইরে, একটি অন্বেষণ।", "Meditation", "Ananda", 1,
    "There is a quiet revolution that happens when you simply sit. No guided voice, no music, no technique to follow — just you, the cushion, and the breath.\n\nIn our culture of constant motion, sitting still feels almost radical. We are trained to do, to achieve, to optimize. Meditation asks us to do the opposite: to stop. Not to stop breathing or thinking, but to stop chasing the next moment.\n\nThe Buddha sat under the Bodhi tree not because he had a technique, but because he was willing to be with what was. That willingness — to sit with boredom, restlessness, doubt, and even peace — is the real practice.\n\nWhen we sit without agenda, something shifts. The mind quiets not because we forced it, but because we stopped feeding it. Thoughts still arise, but we no longer chase them.\n\nStart with ten minutes. Sit on a cushion or a chair. Close your eyes or soften your gaze. And simply be. That is enough. That is everything.",
    undefined,
    "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-2", "breath-as-anchoring", "Breath as Anchoring", "নোঙর হিসাবে নিঃশ্বাস", "How the simple act of breathing can ground us in the midst of chaos.", "বিশৃঙ্খলার মধ্যে নিঃশ্বাসের সরল ক্রিয়া কীভাবে আমাদের ভিত্তি দিতে পারে।", "Meditation", "Ananda", 3,
    "When the world spins too fast, when thoughts cascade like waterfalls, when anxiety grips your chest — there is always the breath.\n\nThe breath is the most reliable anchor we have. It is always here, always now. You cannot breathe in the past. You cannot breathe in the future. You can only breathe in this moment.\n\nAnapanasati — mindfulness of breathing — is perhaps the oldest meditation technique in the world. The Buddha himself practiced it under the Bodhi tree. Not because it is powerful, but because it is simple.\n\nTo practice breath awareness, sit comfortably and close your eyes. Feel the air entering your nostrils. Feel the slight coolness as it passes through. Feel the gentle rise and fall of your chest or belly.\n\nWhen your mind wanders — and it will — gently return to the breath. No judgment. No frustration. Just a soft return, like a child coming home.\n\nThe breath is always available. In traffic. In meetings. In the middle of the night. It asks nothing of you except attention.",
    undefined,
    "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-10", "walking-meditation-guide", "Walking Meditation: A Complete Guide", "হাঁটার ধ্যান: একটি সম্পূর্ণ নির্দেশিকা", "Rediscover the ancient practice of kinhin — mindful walking as a path to presence.", "কিনহিনের প্রাচীন অনুশীলন পুনরায় আবিষ্কার — উপস্থিতির পথে সচেতন হাঁটা।", "Meditation", "Maya", 8,
    "In Zen monasteries, walking meditation — kinhin — is practiced between sitting periods. It is not a break from meditation; it is meditation in motion.\n\nThe practice is deceptively simple. Stand still. Feel your feet on the ground. Lift one foot slowly. Move it forward. Place it down. Feel the contact. Repeat with the other foot.\n\nThe key is slowness. Much slower than normal walking. So slow that each micro-movement becomes a world of sensation.\n\nAs you walk, coordinate breath with movement. Inhale as you lift. Exhale as you place. This synchrony creates a rhythm that naturally calms the mind.\n\nYou don't need a monastery or a special path. A hallway, a garden, even your living room can become a walking meditation space.",
    undefined,
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-11", "loving-kindness-metta", "The Practice of Loving-Kindness (Metta)", "মৈত্রী অনুশীলন", "Cultivating unconditional love for yourself and others through guided metta meditation.", "নির্দেশিত মৈত্রী ধ্যানের মাধ্যমে নিজের এবং অন্যদের জন্য নিঃশর্ত ভালোবাসা গড়ে তোলা।", "Meditation", "Siddhartha", 15,
    "Metta, or loving-kindness, is the practice of extending unconditional love — first to yourself, then to others.\n\nThe practice begins with yourself. Sit quietly and repeat: \"May I be happy. May I be healthy. May I be safe. May I live with ease.\" Say these words slowly, feeling their meaning.\n\nThen expand to someone you love. Picture them clearly. Repeat the same phrases. Then to a neutral person. Then to a difficult person. Finally, to all beings everywhere.\n\nThis practice rewires the brain. Studies show it increases positive emotions, reduces negative ones, and changes neural pathways associated with empathy.\n\nThe deepest benefit is not what metta does for others, but what it does for you. It dissolves the barriers between self and other.",
    undefined,
    "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-12", "body-scan-technique", "Body Scan Meditation for Deep Relaxation", "গভীর বিশ্রামের জন্য বডি স্ক্যান ধ্যান", "A step-by-step guide to the body scan technique — release tension stored in every cell.", "বডি স্ক্যান কৌশলের ধাপে ধাপে নির্দেশিকা — প্রতিটি কোষে সঞ্চিত উত্তেজনা মুক্ত করুন।", "Meditation", "Ananda", 22,
    "Most of us carry tension we don't even know about. Tight shoulders. Clenched jaw. Stomach knots. The body scan is a systematic way to notice and release this stored stress.\n\nLie down in a comfortable position. Close your eyes. Begin at the top of your head and slowly move your attention down through each part of your body.\n\nNotice your forehead. Is there tension? If so, breathe into it and let it soften. Move to your eyes, your jaw, your neck. Each area gets a moment of full attention.\n\nAs you scan, you may discover areas of tightness you never knew existed. That's the point. The body holds what the mind refuses to feel.\n\nThis practice is especially powerful before sleep. Many people find they fall asleep during the scan — and that's perfectly fine.",
    undefined,
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&auto=format"
  ),

  // ── Mindfulness (5) ──
  mockPost("post-3", "mindfulness-in-the-morning", "Mindfulness in the Morning", "সকালে মাইন্ডফুলনেস", "Start your day with intention: a gentle morning mindfulness practice.", "আপনার দিনটি উদ্দেশ্য দিয়ে শুরু করুন: একটি সুন্দর সকালের মাইন্ডফুলনেস অনুশীলন।", "Mindfulness", "Maya", 2,
    "The first minutes of the day set the tone for everything that follows. Most of us reach for our phones before our feet touch the floor.\n\nA mindful morning doesn't require an hour. It can be as simple as three conscious breaths before getting out of bed. Feel the sheets. Notice the light.\n\nAs you move through your morning routine — brushing teeth, making tea — do each thing with full attention. This is not about adding something to your morning. It's about doing what you already do, but with presence.",
    undefined,
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-4", "the-art-of-deep-listening", "The Art of Deep Listening", "গভীর শ্রবণের শিল্প", "Listening is a practice of presence. Learn to listen beyond words.", "শ্রবণ হলো উপস্থিতির একটি অনুশীলন। শব্দের বাইরে শুনতে শিখুন।", "Mindfulness", "Maya", 4,
    "Most of us don't listen. We wait to talk. We formulate our response while the other person is still speaking.\n\nDeep listening is the practice of giving someone your complete attention. Not just your ears, but your heart.\n\nTo practice, start by quieting your own mind. Let go of your agenda. Simply be present with the speaker. Notice their tone, their pace, their pauses.\n\nWhen you truly listen, something remarkable happens. The other person feels heard. Walls come down. Connection deepens.",
    undefined,
    "https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-5", "eating-with-awareness", "Eating with Awareness", "সচেতনভাবে খাওয়া", "Transform your relationship with food through mindful eating practices.", "সচেতন খাদ্য গ্রহণ অনুশীলনের মাধ্যমে খাদ্যের সাথে আপনার সম্পর্ক রূপান্তরিত করুন।", "Mindfulness", "Maya", 6,
    "We eat three or more times a day, yet most meals pass without awareness. Mindful eating is not a diet — it's about bringing full attention to nourishing yourself.\n\nStart with one meal. Before eating, pause. Look at your food. Notice the colors, the textures, the smells. Take a small bite. Chew slowly.\n\nYou'll be surprised at how much more satisfying a meal becomes when you actually taste it. Thich Nhat Hanh suggested eating a tangerine as if it were the first you've ever seen.",
    undefined,
    "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-13", "mindful-communication", "Mindful Communication: Speaking with Intention", "সচেতন যোগাযোগ: উদ্দেশ্য সহ কথা বলা", "How to bring mindfulness into every conversation.", "প্রতিটি কথোপকথনে মাইন্ডফুলনেস আনার উপায়।", "Mindfulness", "Maya", 12,
    "The Buddha taught four principles of right speech: is it true, is it kind, is it helpful, and is it the right time?\n\nBefore speaking, pause. A moment to check: Is what I'm about to say true? Is it kind? Is it necessary?\n\nMindful communication starts with listening. When someone is speaking, give them your full attention. Don't plan your response. Just listen.",
    undefined,
    "https://images.unsplash.com/photo-1524650359799-842906ca1c06?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-14", "digital-detox-mindfulness", "Digital Detox: A Mindful Approach to Technology", "ডিজিটাল ডিটক্স: প্রযুক্তির প্রতি সচেতন দৃষ্টিভঙ্গি", "Reclaim your attention from screens.", "স্ক্রিন থেকে আপনার মনোযোগ ফিরিয়ে নিন।", "Mindfulness", "Ananda", 18,
    "Our phones check us more than we check them. On average, we touch our phones 96 times a day.\n\nA digital detox doesn't mean throwing away your phone. It means creating intentional boundaries.\n\nStart with one hour before bed. No screens. Read a book. Sit in silence. The goal is not to reject technology, but to use it consciously. Your attention is your most precious resource.",
    undefined,
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop&auto=format"
  ),

  // ── Mental Health (5) ──
  mockPost("post-6", "the-power-of-rest", "The Power of Rest", "বিশ্রামের শক্তি", "Why true rest is essential for mental health.", "প্রকৃত বিশ্রাম মানসিক স্বাস্থ্যের জন্য কেন অপরিহার্য।", "Mental Health", "Siddhartha", 2,
    "We live in a culture that glorifies busyness. But the Buddha taught that rest is not laziness — it is wisdom.\n\nTrue rest is not scrolling your phone in bed. It is the complete absence of doing.\n\nThe body heals during rest. The mind consolidates memories. Without adequate rest, we operate from a deficit.",
    undefined,
    "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-7", "building-emotional-resilience", "Building Emotional Resilience", "আবেগগত স্থিতিস্থাপকতা গঠন", "Practical Buddhist approaches to developing inner strength.", "অভ্যন্তরীণ শক্তি গড়ে তোলার বৌদ্ধ পদ্ধতি।", "Mental Health", "Siddhartha", 5,
    "Resilience is not about being tough. It's about feeling fully and still finding your footing.\n\nThree practices build resilience: mindfulness — observing emotions without being consumed. Loving-kindness — extending compassion to yourself first. Community — sharing struggles with trusted others.",
    undefined,
    "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-15", "working-with-anxiety", "Working with Anxiety", "উদ্বেগের সাথে কাজ", "Understanding anxiety through impermanence.", "অনিত্যতা থেকে উদ্বেগ বোঝা।", "Mental Health", "Siddhartha", 10,
    "Anxiety arises from attachment — to outcomes, safety, certainty. The antidote is not to eliminate it, but to change our relationship with it.\n\nWhen anxiety arises, simply notice it. This creates space. Impermanence is the key — anxiety, like all mental states, is temporary.",
    undefined,
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-16", "grief-and-letting-go", "Grief and Letting Go", "শোক ও ছেড়ে দেওয়া", "Buddhist wisdom on navigating loss.", "ক্ষতির উপর বৌদ্ধ জ্ঞান।", "Mental Health", "Maya", 25,
    "Loss is inevitable. Grief is not a problem to be solved — it is a process to be honored.\n\nLetting go does not mean forgetting. It means releasing the grip of clinging — the desperate wish that things were different.",
    undefined,
    "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-17", "compassion-fatigue", "Compassion Fatigue", "সমবেদনা ক্লান্তি", "How to sustain compassion without burning out.", "বার্নআউট ছাড়াই সমবেদনা ধারণ করার উপায়।", "Mental Health", "Siddhartha", 30,
    "Compassion fatigue is not weakness — it is the natural consequence of caring deeply without self-care.\n\nThree practices help: Boundaries — know when to say no. Metta for yourself. Rest — not as a reward, but as a practice.",
    undefined,
    "https://images.unsplash.com/photo-1519834785169-98be25f4f84a?w=800&h=600&fit=crop&auto=format"
  ),

  // ── Philosophy (5) ──
  mockPost("post-8", "impermanence-and-peace", "Impermanence and Peace", "অনিত্যতা ও শান্তি", "Finding freedom in the recognition that all things pass.", "সকল কিছু চলে যায় — এতে স্বাধীনতা।", "Philosophy", "Ananda", 7,
    "Everything changes. Anicca — impermanence — is one of the three marks of existence.\n\nIf everything passes, then no suffering is permanent. No problem is final. This is liberating, not depressing.\n\nWhen we accept impermanence, we stop clinging to pleasant experiences and pushing away unpleasant ones.",
    undefined,
    "https://images.unsplash.com/photo-1517093602195-b40af9682e2e?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-9", "the-middle-way", "The Middle Way", "মধ্যম পথ", "Avoiding extremes in modern life.", "আধুনিক জীবনে চরমের মধ্যে বুদ্ধের শিক্ষা।", "Philosophy", "Siddhartha", 10,
    "The Middle Way is not compromise. It is the realization that both extremes miss the point.\n\nIn modern life: workaholism vs. laziness. Overthinking vs. ignorance. The key is balanced response.",
    undefined,
    "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-18", "dependent-origination", "Dependent Origination", "প্রতীত্যসমুত্পাদ", "Everything connects — understanding causation.", "সবকিছু সংযুক্ত।", "Philosophy", "Ananda", 20,
    "Nothing exists in isolation. Everything arises in dependence on conditions — pratityasamutpada.\n\nUnderstanding these conditions is the first step toward freedom. The chain can be broken by understanding each link.",
    undefined,
    "https://images.unsplash.com/photo-1470240731273-782d90a0d3f9?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-19", "emptiness-in-plain-english", "Emptiness in Plain English", "সরল ইংরেজিতে শূন্যতা", "Sunyata means interdependence, not nothingness.", "শূন্যতা পারস্পরিক নির্ভরশীলতা।", "Philosophy", "Ananda", 35,
    "Emptiness means nothing has an independent, fixed essence. Everything exists in relationship.\n\nThis is liberating. If nothing has a fixed self, then everything is possible. Change is always possible.",
    undefined,
    "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-20", "the-eightfold-path", "The Noble Eightfold Path", "আর্য অষ্টাঙ্গিক পথ", "A practical guide to the Buddha's path.", "বুদ্ধের পথের ব্যবহারিক নির্দেশিকা।", "Philosophy", "Siddhartha", 40,
    "The Noble Eightfold Path: Right View, Right Intention, Right Speech, Right Action, Right Livelihood, Right Effort, Right Mindfulness, Right Concentration.\n\nThese eight factors support each other. Together, they form a complete path to freedom.",
    undefined,
    "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800&h=600&fit=crop&auto=format"
  ),

  // ── Buddhist Psychology (5) ──
  mockPost("post-21", "mind-and-emotion-in-buddhist-psychology", "Mind and Emotion in Buddhist Psychology", "বৌদ্ধ মনোবিজ্ঞানে মন ও আবেগ", "How the Abhidharma's map of the mind anticipates modern psychology.", "আধুনিক মনোবিজ্ঞানের পূর্বাভাস হিসেবে অভিধর্মের মনের মানচিত্র।", "Buddhist Psychology", "Dr. Sarah Weiss", 9,
    "Long before modern psychology mapped the mind, the Abhidharma — the Buddha's psychological teachings — offered a remarkably sophisticated account of mental states.\n\nThe Abhidharma enumerates dozens of mental factors (cetasikas): wholesome ones like mindfulness, faith, and equanimity, and unwholesome ones like greed, aversion, and delusion.\n\nWhat is striking is how contemporary this framework feels. Modern cognitive psychology's distinction between automatic and controlled processes echoes the Abhidharma's division of mental activity into immediate perception and conceptual elaboration.\n\nThe key insight is that mental states are not fixed traits — they are processes that arise in dependence on conditions. This means they can be transformed through training.\n\nBuddhist psychology offers a practical, testable claim: attention and compassion are trainable skills, not inborn endowments. Modern neuroplasticity research increasingly supports this view.",
    undefined,
    "https://images.unsplash.com/photo-1524863479829-916d8e77f114?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-22", "the-five-hindrances", "The Five Hindrances: Obstacles to the Mind", "পাঁচটি নীবরণ: মনের বাধা", "Understanding the five hindrances — desire, aversion, dullness, restlessness, and doubt.", "পাঁচটি নীবরণ বোঝা — কামনা, ঘৃণা, আলস্য, উদ্ধচিত্ততা এবং সংশয়।", "Buddhist Psychology", "Dr. Sarah Weiss", 5,
    "The Buddha identified five hindrances that obscure the mind's natural clarity: sensual desire, ill will, sloth and torpor, restlessness and remorse, and skeptical doubt.\n\nThese are not moral failings — they are universal mental patterns that every practitioner meets. The hindrances are not obstacles to be destroyed but signals to be understood.\n\nDesire arises from the mind's habit of grasping at pleasant experience. Aversion pushes away the unpleasant. Dullness blunts attention. Restlessness scatters it. Doubt corrodes confidence.\n\nBuddhist psychology treats each hindrance with a specific antidote: mindfulness for desire, loving-kindness for aversion, energy for dullness, tranquility for restlessness, and investigation for doubt.\n\nModern cognitive therapy recognizes the same patterns under different names — craving, avoidance, fatigue, anxiety, and uncertainty. The ancient framework still offers a practical map for working with them.",
    undefined,
    "https://images.unsplash.com/photo-1487452066049-a710f7296400?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-23", "anatta-no-self", "Anatta: The Psychology of No-Self", "অনাত্তা: অনাত্মার মনোবিজ্ঞান", "What the Buddha's teaching on not-self means for identity and mental health.", "পরিচয় এবং মানসিক স্বাস্থ্যের জন্য বুদ্ধের অনাত্মা শিক্ষার অর্থ।", "Buddhist Psychology", "Ananda", 12,
    "Anatta — not-self — is perhaps the most misunderstood of the Buddha's teachings. It does not mean we do not exist. It means there is no fixed, unchanging self to be found.\n\nModern psychology arrives at a similar conclusion from a different direction. Our sense of self is constructed moment to moment from memory, emotion, and narrative — not a stable essence but an ongoing process.\n\nWhen we cling to a fixed identity — 'I am anxious', 'I am unworthy' — we freeze a dynamic process into a permanent label. The teaching of anatta loosens that grip.\n\nResearch on self-compassion shows that people who can observe their thoughts and emotions without over-identifying with them report lower depression and anxiety. This is anatta in clinical clothing.\n\nThe liberating implication: if the self is a process rather than a thing, it can change. No fixed verdict about who you are is final.",
    undefined,
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-24", "craving-and-desire", "Craving and the Science of Desire", "তৃষ্ণা ও কামনার বিজ্ঞান", "How Buddhist and psychological accounts of craving both point toward freedom.", "কীভাবে বৌদ্ধ ও মনস্তাত্ত্বিক তৃষ্ণার ব্যাখ্যা উভয়ই স্বাধীনতার দিকে নির্দেশ করে।", "Buddhist Psychology", "Maya", 19,
    "The second noble truth is deceptively simple: suffering arises from craving. Tanha — thirst — is the restless energy that reaches for the next pleasure and recoils from the next pain.\n\nModern neuroscience tells a parallel story. The dopamine system does not reward satisfaction — it drives anticipation. Craving is the engine of wanting, and wanting is never fully satisfied.\n\nThis is why hedonic adaptation happens: each pleasure, once attained, quickly loses its glow. The mind immediately projects a new object of desire.\n\nThe Buddha's insight is that we do not need to eliminate desire to be free — we need to understand it. When craving is observed with mindfulness rather than acted on, its compulsive grip weakens.\n\nPsychological approaches like urge surfing and craving awareness training apply exactly this principle, with measurable results in addiction treatment.",
    undefined,
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&h=600&fit=crop&auto=format"
  ),
  mockPost("post-25", "equanimity-balance", "Equanimity: The Art of Balance", "উপেক্ষা: ভারসাম্যের শিল্প", "Upekkha — the mind that meets gain and loss, praise and blame, with steadiness.", "উপেক্ষা — যে মন লাভ ও ক্ষতি, প্রশংসা ও নিন্দার সাথে স্থিরভাবে মিলিত হয়।", "Buddhist Psychology", "Siddhartha", 27,
    "Equanimity — upekkha — is the seventh factor of awakening and the fourth divine abode. It is not indifference or detachment in the cold sense, but an even-minded presence that does not sway with the winds of fortune.\n\nThe Buddha described the sage as unmoved by praise and blame, gain and loss, pleasure and pain, fame and disrepute — the eight worldly winds.\n\nEquanimity is often misunderstood as passivity. In fact, it is the most active of qualities: the capacity to stay present and responsive without being thrown off balance.\n\nPsychological research connects this to emotional regulation. People with greater equanimity show more stable cardiovascular responses to stress and better recovery after setbacks.\n\nEquanimity is not something we force. It grows naturally as we practice mindfulness and see clearly that all states — pleasant and unpleasant — are impermanent. When nothing can hold us hostage, the mind rests in balance.",
    undefined,
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop&auto=format"
  ),
];

// ─── Navigation ──────────────────────────────────────────────

function mockNavItem(
  id: string,
  parentId: string | null,
  type: "internal" | "external" | "dropdown",
  labelEn: string,
  labelBn: string,
  url: string,
  sortOrder: number,
): NavItem {
  return {
    id,
    parent_id: parentId,
    type,
    label_en: labelEn,
    label_bn: labelBn,
    url,
    slug: url,
    icon: "",
    sort_order: sortOrder,
    visible: true,
    location: "header",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

const MOCK_NAV_ITEMS_DATA: NavItem[] = [
  mockNavItem("nav-1", null, "internal", "Home", "হোম", "/", 0),
  mockNavItem("nav-2", null, "dropdown", "Reflections", "প্রতিফলন", "/reflections", 1),
  mockNavItem("nav-21", "nav-2", "internal", "Meditation", "ধ্যান", "/reflections/meditation", 0),
  mockNavItem("nav-22", "nav-2", "internal", "Mindfulness", "মাইন্ডফুলনেস", "/reflections/mindfulness", 1),
  mockNavItem("nav-23", "nav-2", "internal", "Mental Health", "মানসিক স্বাস্থ্য", "/reflections/mental-health", 2),
  mockNavItem("nav-24", "nav-2", "internal", "Philosophy", "দর্শন", "/reflections/philosophy", 3),
  mockNavItem("nav-25", "nav-2", "internal", "Buddhist Psychology", "বৌদ্ধ মনোবিজ্ঞান", "/reflections/buddhist-psychology", 4),
  mockNavItem("nav-7", null, "internal", "Books", "বই", "/books", 2),
  mockNavItem("nav-8", null, "internal", "Videos", "ভিডিও", "/videos", 3),
  mockNavItem("nav-9", null, "internal", "About", "সম্পর্কে", "/about", 4),
];

// ─── Pages ─────────────────────────────────────────────────

const MOCK_PAGES_DATA: Page[] = [
  {
    id: "page-1",
    slug: "about",
    title_en: "About Sabbe Satta",
    title_bn: "সব্বে সত্তা সম্পর্কে",
    header_en: "Where ancient wisdom meets modern psychology.",
    header_bn: "যেখানে প্রাচীন জ্ঞান মিলিত হয় আধুনিক মনোবিজ্ঞানের সাথে।",
    body_en: "Sabbe Satta is a sanctuary for contemplative practice — reflections, books, and videos bridging Buddhist wisdom with modern mental health.",
    body_bn: "সব্বে সত্তা ধ্যানমূলক অনুশীলনের একটি আশ্রয়স্থল — বৌদ্ধ জ্ঞানকে আধুনিক মানসিক স্বাস্থ্যের সাথে যুক্ত করে এমন প্রতিফলন, বই এবং ভিডিও।",
    // Local hero — meditation, zen, nature, lotus lake (Pixabay vector 8314420,
    // Pixabay Content License). 1280×853 landscape — sits well in the full-bleed
    // object-cover hero band.
    banner_url: "/about-hero.png",
    meta_description_en: "About Sabbe Satta — where ancient wisdom meets modern psychology.",
    meta_description_bn: "সব্বে সত্তা সম্পর্কে — যেখানে প্রাচীন জ্ঞান মিলিত হয় আধুনিক মনোবিজ্ঞানের সাথে।",
    visible: true,
    sort_order: 0,
    sections: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "page-2",
    slug: "faq",
    title_en: "Frequently Asked Questions",
    title_bn: "সচরাচর জিজ্ঞাসা",
    header_en: "Answers to common questions about the library.",
    header_bn: "লাইব্রেরি সম্পর্কে সাধারণ প্রশ্নের উত্তর।",
    body_en: "Find answers about reading, purchasing books, the PDF reader, and more.",
    body_bn: "পড়া, বই কেনা, পিডিএফ রিডার এবং আরও অনেক কিছু সম্পর্কে উত্তর খুঁজুন।",
    banner_url: "",
    meta_description_en: "Frequently asked questions about Sabbe Satta.",
    meta_description_bn: "সব্বে সত্তা সম্পর্কে সচরাচর জিজ্ঞাসা।",
    visible: true,
    sort_order: 1,
    sections: [],
    created_at: "2026-01-02T00:00:00Z",
    updated_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "page-3",
    slug: "contact",
    title_en: "Contact",
    title_bn: "যোগাযোগ",
    header_en: "We'd love to hear from you.",
    header_bn: "আমরা আপনার কাছ থেকে শুনতে চাই।",
    body_en: "Send us a message — questions, feedback, or collaboration ideas.",
    body_bn: "আমাদের একটি বার্তা পাঠান — প্রশ্ন, মতামত, বা সহযোগিতার ধারণা।",
    banner_url: "",
    meta_description_en: "Get in touch with the Sabbe Satta team.",
    meta_description_bn: "সব্বে সত্তা দলের সাথে যোগাযোগ করুন।",
    visible: true,
    sort_order: 2,
    sections: [],
    created_at: "2026-01-03T00:00:00Z",
    updated_at: "2026-01-03T00:00:00Z",
  },
  {
    id: "page-4",
    slug: "books",
    title_en: "Books",
    title_bn: "বই",
    header_en: "Books",
    header_bn: "বই",
    body_en: "A small shelf of companions — books we return to, and the ones we recommend without hesitation.",
    body_bn: "সঙ্গীদের একটি ছোট তাক — যে বইগুলোতে আমরা ফিরে আসি, আর যেগুলো নিঃসন্দেহে সুপারিশ করি।",
    banner_url: "",
    meta_description_en: "Books — a small shelf of companions we return to.",
    meta_description_bn: "সঙ্গীদের একটি ছোট তাক — যে বইগুলোতে আমরা ফিরে আসি।",
    visible: true,
    sort_order: 3,
    sections: [],
    created_at: "2026-01-04T00:00:00Z",
    updated_at: "2026-01-04T00:00:00Z",
  },
];

export function mockFetchPages(): Page[] {
  return MOCK_PAGES_DATA.map((p) => ({ ...p }));
}

export function mockFetchPageBySlug(slug: string): Page | null {
  return MOCK_PAGES_DATA.find((p) => p.slug === slug) ?? null;
}

// ─── Public Functions ────────────────────────────────────────

export function mockFetchCategories(): Category[] {
  return MOCK_CATEGORIES_DATA.map((c) => ({ ...c }));
}

export function mockFetchPosts(category?: PostCategory, page = 1, pageSize = 9, searchQuery?: string, categories?: string[]): PaginatedResult<Post> {
  let filtered = mockApplyPostOverrides(MOCK_POSTS_DATA);
  if (categories && categories.length > 0) {
    filtered = filtered.filter((p) => categories.includes(p.category));
  } else if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((p) => p.title_en?.toLowerCase().includes(q) || p.title_bn?.toLowerCase().includes(q) || p.excerpt_en?.toLowerCase().includes(q));
  }
  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const data = filtered.slice(from, from + pageSize);
  return { data, total };
}

export function mockFetchPostBySlug(slug: string): Post | null {
  return mockApplyPostOverrides(MOCK_POSTS_DATA).find((p) => p.slug === slug) ?? null;
}

export function mockFetchPublicNavItems(): NavItem[] {
  return MOCK_NAV_ITEMS_DATA.map((n) => ({ ...n }));
}

// ─── Books ───────────────────────────────────────────────────

/* Low-size sample PDFs served from the public folder — generated by
   scripts/generate-sample-pdfs.mjs (run `node scripts/generate-sample-pdfs.mjs`). */
const pdfPath = (slug: string) => `/pdfs/${slug}.pdf`;

const MOCK_BOOKS_DATA: Book[] = [
  {
    id: "book-1",
    slug: "the-heart-of-meditation",
    title_en: "The Heart of Meditation",
    title_bn: "ধ্যানের হৃদয়",
    author_name: "Siddhartha Gautama",
    description_en: "A comprehensive guide to meditation practice, from foundational techniques to advanced insights. Covers breath awareness, body scanning, loving-kindness, and open awareness meditation.",
    description_bn: "মৌলিক কৌশল থেকে উন্নত অন্তর্দৃষ্টি পর্যন্ত ধ্যান অনুশীলনের একটি বিস্তৃত নির্দেশিকা। শ্বাস সচেতনতা, বডি স্ক্যানিং, মৈত্রী এবং উন্মুক্ত সচেতনতা ধ্যান অন্তর্ভুক্ত।",
    cover_image: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("the-heart-of-meditation"),
    pdf_file_size: 862,
    price: 0,
    is_free: true,
    pages: 240,
    isbn: "978-0-123-45678-9",
    status: "published",
    featured: true,
    tags: ["meditation", "buddhism", "mindfulness"],
    category: "Meditation",
    meta_description_en: "A comprehensive guide to meditation practice.",
    meta_description_bn: "ধ্যান অনুশীলনের একটি বিস্তৃত নির্দেশিকা।",
    sort_order: 0,
    avg_rating: 4.5,
    total_ratings: 128,
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
  },
  {
    id: "book-2",
    slug: "walking-the-middle-way",
    title_en: "Walking the Middle Way",
    title_bn: "মধ্যম পথে হাঁটা",
    author_name: "Ananda Bhikkhu",
    description_en: "Practical wisdom for navigating life's challenges with balance and compassion. Drawing from the Buddha's core teachings on the Middle Path between extremes.",
    description_bn: "ভারসাম্য এবং সমবেদনার সাথে জীবনের চ্যালেঞ্জ মোকাবেলার জন্য ব্যবহারিক জ্ঞান। চরমের মধ্যে মধ্যম পথ সম্পর্কে বুদ্ধের মূল শিক্ষা থেকে অঙ্কিত।",
    cover_image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("walking-the-middle-way"),
    pdf_file_size: 857,
    price: 1799,
    is_free: false,
    pages: 320,
    isbn: "978-0-987-65432-1",
    status: "published",
    featured: true,
    tags: ["philosophy", "buddhism", "wisdom"],
    category: "Philosophy",
    meta_description_en: "Practical wisdom for navigating life's challenges.",
    meta_description_bn: "জীবনের চ্যালেঞ্জ মোকাবেলার জন্য ব্যবহারিক জ্ঞান।",
    sort_order: 1,
    avg_rating: 4.8,
    total_ratings: 95,
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-02-01T00:00:00Z",
  },
  {
    id: "book-3",
    slug: "mindful-living-daily",
    title_en: "Mindful Living: A Daily Practice",
    title_bn: "মাইন্ডফুল লিভিং: একটি দৈনন্দিন অনুশীলন",
    author_name: "Maya Karuna",
    description_en: "365 days of mindfulness practices, reflections, and journaling prompts to cultivate awareness in everyday life.",
    description_bn: "প্রতিদিনের জীবনে সচেতনতা গড়ে তোলার জন্য ৩৬৫ দিনের মাইন্ডফুলনেস অনুশীলন, প্রতিফলন এবং জার্নালিং প্রম্পট।",
    cover_image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("mindful-living-daily"),
    pdf_file_size: 864,
    price: 0,
    is_free: true,
    pages: 420,
    isbn: "978-0-111-22233-4",
    status: "published",
    featured: true,
    tags: ["mindfulness", "daily-practice", "wellbeing"],
    category: "Mindfulness",
    meta_description_en: "365 days of mindfulness practices and reflections.",
    meta_description_bn: "৩৬৫ দিনের মাইন্ডফুলনেস অনুশীলন এবং প্রতিফলন।",
    sort_order: 2,
    avg_rating: 4.7,
    total_ratings: 203,
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-03-01T00:00:00Z",
  },
  {
    id: "book-4",
    slug: "emotional-resilience",
    title_en: "Emotional Resilience: A Buddhist Approach",
    title_bn: "আবেগগত স্থিতিস্থাপকতা: একটি বৌদ্ধ দৃষ্টিভঙ্গি",
    author_name: "Dr. Sarah Weiss",
    description_en: "Bridging Buddhist psychology and modern neuroscience to build emotional strength, reduce anxiety, and find peace.",
    description_bn: "আবেগগত শক্তি তৈরি, উদ্বেগ কমাতে এবং শান্তি খুঁজে পেতে বৌদ্ধ মনোবিজ্ঞান এবং আধুনিক স্নায়ুবিজ্ঞানের সেতুবন্ধন।",
    cover_image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("emotional-resilience"),
    pdf_file_size: 877,
    price: 2399,
    is_free: false,
    pages: 280,
    isbn: "978-0-555-66677-8",
    status: "published",
    featured: false,
    tags: ["mental-health", "psychology", "resilience"],
    category: "Mental Health",
    meta_description_en: "Buddhist psychology meets modern neuroscience.",
    meta_description_bn: "বৌদ্ধ মনোবিজ্ঞান ও আধুনিক স্নায়ুবিজ্ঞানের সম্মিলন।",
    sort_order: 3,
    avg_rating: 4.6,
    total_ratings: 76,
    created_at: "2026-03-15T00:00:00Z",
    updated_at: "2026-03-15T00:00:00Z",
  },
  {
    id: "book-5",
    slug: "art-of-sitting-still",
    title_en: "The Art of Sitting Still",
    title_bn: "স্থির হয়ে বসার শিল্প",
    author_name: "Siddhartha Gautama",
    description_en: "A short, accessible introduction to meditation for complete beginners. Learn to sit with yourself in just 10 minutes a day.",
    description_bn: "সম্পূর্ণ নতুনদের জন্য ধ্যানের একটি সংক্ষিপ্ত, সহজবোধ্য ভূমিকা। প্রতিদিন মাত্র ১০ মিনিটে নিজের সাথে বসতে শিখুন।",
    cover_image: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("art-of-sitting-still"),
    pdf_file_size: 863,
    price: 0,
    is_free: true,
    pages: 96,
    isbn: "978-0-999-88877-6",
    status: "published",
    featured: true,
    tags: ["meditation", "beginners", "guide"],
    category: "Meditation",
    meta_description_en: "A short introduction to meditation for beginners.",
    meta_description_bn: "নতুনদের জন্য ধ্যানের একটি সংক্ষিপ্ত ভূমিকা।",
    sort_order: 4,
    avg_rating: 4.9,
    total_ratings: 312,
    created_at: "2026-04-01T00:00:00Z",
    updated_at: "2026-04-01T00:00:00Z",
  },
  {
    id: "book-6",
    slug: "four-noble-truths-modern-life",
    title_en: "The Four Noble Truths for Modern Life",
    title_bn: "আধুনিক জীবনের জন্য চারটি আর্যসত্য",
    author_name: "Ananda Bhikkhu",
    description_en: "Revisiting the Buddha's first teaching through the lens of contemporary challenges — stress, burnout, relationships, and the search for meaning.",
    description_bn: "সমসাময়িক চ্যালেঞ্জ — চাপ, বার্নআউট, সম্পর্ক এবং অর্থের সন্ধানের দৃষ্টিকোণ থেকে বুদ্ধের প্রথম উপদেশ পুনর্বিবেচনা।",
    cover_image: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("four-noble-truths-modern-life"),
    pdf_file_size: 872,
    price: 1499,
    is_free: false,
    pages: 200,
    isbn: "978-0-444-55566-7",
    status: "published",
    featured: true,
    tags: ["philosophy", "buddhism", "four-noble-truths"],
    category: "Philosophy",
    meta_description_en: "Ancient wisdom for modern challenges.",
    meta_description_bn: "আধুনিক চ্যালেঞ্জের জন্য প্রাচীন জ্ঞান।",
    sort_order: 5,
    avg_rating: 4.4,
    total_ratings: 54,
    created_at: "2026-05-01T00:00:00Z",
    updated_at: "2026-05-01T00:00:00Z",
  },
  {
    id: "book-7",
    slug: "loving-kindness-meditation",
    title_en: "Loving-Kindness Meditation: A Practical Guide",
    title_bn: "মৈত্রী ধ্যান: একটি ব্যবহারিক নির্দেশিকা",
    author_name: "Maya Karuna",
    description_en: "Step-by-step instructions for metta meditation, from self-compassion to radiating love to all beings. Includes guided audio practices.",
    description_bn: "নিজের সমবেদনা থেকে সকল প্রাণীর প্রতি ভালোবাসা বিকিরণ পর্যন্ত মৈত্রী ধ্যানের ধাপে ধাপে নির্দেশনা। নির্দেশিত অডিও অনুশীলন অন্তর্ভুক্ত।",
    cover_image: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("loving-kindness-meditation"),
    pdf_file_size: 877,
    price: 0,
    is_free: true,
    pages: 160,
    isbn: "978-0-222-33344-5",
    status: "published",
    featured: true,
    tags: ["meditation", "loving-kindness", "metta", "compassion"],
    category: "Meditation",
    meta_description_en: "A practical guide to loving-kindness meditation.",
    meta_description_bn: "মৈত্রী ধ্যানের একটি ব্যবহারিক নির্দেশিকা।",
    sort_order: 6,
    avg_rating: 4.8,
    total_ratings: 167,
    created_at: "2026-05-15T00:00:00Z",
    updated_at: "2026-05-15T00:00:00Z",
  },
  {
    id: "book-8",
    slug: "buddhist-psychology-emotions",
    title_en: "Buddhist Psychology and the Management of Emotions",
    title_bn: "বৌদ্ধ মনোবিজ্ঞান ও আবেগ পরিচালনা",
    author_name: "Dr. Sarah Weiss",
    description_en: "How Buddhist psychology offers a sophisticated framework for understanding and working with difficult emotions — anger, jealousy, fear, and desire.",
    description_bn: "বৌদ্ধ মনোবিজ্ঞান কীভাবে কঠিন আবেগ — রাগ, হিংসা, ভয় এবং কামনা — বোঝা এবং তার সাথে কাজ করার জন্য একটি সুদক্ষ কাঠামো প্রদান করে।",
    cover_image: "https://images.unsplash.com/photo-1474418397713-7ede21d49118?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("buddhist-psychology-emotions"),
    pdf_file_size: 886,
    price: 2099,
    is_free: false,
    pages: 310,
    isbn: "978-0-666-77788-9",
    status: "published",
    featured: false,
    tags: ["mental-health", "psychology", "emotions", "buddhism"],
    category: "Mental Health",
    meta_description_en: "Understanding emotions through Buddhist psychology.",
    meta_description_bn: "বৌদ্ধ মনোবিজ্ঞানের মাধ্যমে আবেগ বোঝা।",
    sort_order: 7,
    avg_rating: 4.5,
    total_ratings: 89,
    created_at: "2026-06-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "book-9",
    slug: "mindfulness-stress-reduction",
    title_en: "Mindfulness-Based Stress Reduction (MBSR) Companion",
    title_bn: "মাইন্ডফুলনেস-ভিত্তিক স্ট্রেস রিডাকশন (MBSR) সঙ্গী",
    author_name: "Maya Karuna",
    description_en: "A week-by-week companion to the MBSR program. Practice instructions, journaling prompts, and reflections for the 8-week journey.",
    description_bn: "MBSR প্রোগ্রামের সাপ্তাহিক সঙ্গী। ৮ সপ্তাহের যাত্রার জন্য অনুশীলন নির্দেশনা, জার্নালিং প্রম্পট এবং প্রতিফলন।",
    cover_image: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("mindfulness-stress-reduction"),
    pdf_file_size: 876,
    price: 1199,
    is_free: false,
    pages: 192,
    isbn: "978-0-777-88899-0",
    status: "published",
    featured: false,
    tags: ["mindfulness", "stress", "mbsr", "wellbeing"],
    category: "Mindfulness",
    meta_description_en: "Your companion for the 8-week MBSR program.",
    meta_description_bn: "৮ সপ্তাহের MBSR প্রোগ্রামের জন্য আপনার সঙ্গী।",
    sort_order: 8,
    avg_rating: 4.6,
    total_ratings: 134,
    created_at: "2026-06-15T00:00:00Z",
    updated_at: "2026-06-15T00:00:00Z",
  },
  {
    id: "book-10",
    slug: "silence-and-stillness",
    title_en: "Silence and Stillness: Contemplative Essays",
    title_bn: "নীরবতা ও স্থিরতা: ধ্যানমূলক প্রবন্ধ",
    author_name: "Ananda Bhikkhu",
    description_en: "A collection of contemplative essays exploring silence, solitude, and the inner landscape. Perfect for bedside reading and morning reflection.",
    description_bn: "নীরবতা, একান্ততা এবং অভ্যন্তরীণ পরিদৃশ্য অন্বেষণকারী ধ্যানমূলক প্রবন্ধের সংকলন। শোবার টেবিলে পড়া এবং সকালের প্রতিফলনের জন্য আদর্শ।",
    cover_image: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=600&fit=crop&auto=format",
    pdf_url: pdfPath("silence-and-stillness"),
    pdf_file_size: 878,
    price: 0,
    is_free: true,
    pages: 128,
    isbn: "978-0-888-99900-1",
    status: "published",
    featured: false,
    tags: ["philosophy", "essays", "silence", "contemplation"],
    category: "Philosophy",
    meta_description_en: "Contemplative essays on silence and stillness.",
    meta_description_bn: "নীরবতা ও স্থিরতার উপর ধ্যানমূলক প্রবন্ধ।",
    sort_order: 9,
    avg_rating: 4.7,
    total_ratings: 72,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
  },
];

/* ─── Author bios & chapter lists ──────────────────────────────

   Kept separate from the flat book rows above so the books table
   stays readable — the enrichment loop below attaches them before
   anything reads MOCK_BOOKS_DATA. Both are optional on Book, so
   admin-created books without them simply render without the
   author card / contents preview on the detail page. */

const AUTHOR_BIOS: Record<string, { en: string; bn: string }> = {
  "Siddhartha Gautama": {
    en: "A meditation teacher and the founding voice of the Sabbe Satta library, Siddhartha Gautama writes on meditation, ethics, and the art of sitting still. His teaching is direct, warm, and rooted in daily practice — the cushion is the classroom.",
    bn: "ধ্যান শিক্ষক এবং সব্বে সত্তা গ্রন্থাগারের প্রতিষ্ঠাতা কণ্ঠস্বর, সিদ্ধার্থ গৌতম ধ্যান, নীতি এবং স্থির হয়ে বসার শিল্প নিয়ে লেখেন। তাঁর শিক্ষা সরাসরি, উষ্ণ এবং দৈনন্দিন অনুশীলনে প্রোথিত — কুশনই শ্রেণিকক্ষ।",
  },
  "Ananda Bhikkhu": {
    en: "Ananda Bhikkhu is a former engineer turned Buddhist scholar. His books bridge the classic teachings — the Four Noble Truths, the Middle Way, the Eightfold Path — with the questions of modern life: burnout, meaning, and the search for balance.",
    bn: "প্রকৌশলী থেকে বৌদ্ধ পণ্ডিত, আনন্দ ভিক্ষু তাঁর বইয়ে ধ্রুপদী শিক্ষা — চারটি আর্যসত্য, মধ্যম পথ, অষ্টাঙ্গিক পথ — আধুনিক জীবনের প্রশ্নের সাথে সেতুবন্ধন করেন: বার্নআউট, অর্থ এবং ভারসাম্যের সন্ধান।",
  },
  "Maya Karuna": {
    en: "Maya Karuna is a mindfulness teacher and writer with two decades of practice. Her work turns everyday moments — mornings, meals, conversations — into invitations to presence, in a style readers describe as gentle but profound.",
    bn: "মায়া করুণা বিশ বছরের অনুশীলন নিয়ে একজন মাইন্ডফুলনেস শিক্ষক এবং লেখক। তাঁর কাজ সকাল, খাবার, কথোপকথন — প্রতিদিনের মুহূর্তগুলোকে উপস্থিতির আমন্ত্রণে রূপান্তরিত করে।",
  },
  "Dr. Sarah Weiss": {
    en: "Dr. Sarah Weiss is a clinical psychologist and Buddhist practitioner. Her work sits at the intersection of Buddhist psychology and modern neuroscience, translating ancient maps of the mind into practical tools for emotional resilience.",
    bn: "ডা. সারা ওয়েইস একজন ক্লিনিকাল মনোবিজ্ঞানী এবং বৌদ্ধ অনুশীলনকারী। তাঁর কাজ বৌদ্ধ মনোবিজ্ঞান এবং আধুনিক স্নায়ুবিজ্ঞানের সংযোগস্থলে অবস্থিত — মনের প্রাচীন মানচিত্রকে আবেগগত স্থিতিস্থাপকতার ব্যবহারিক হাতিয়ারে রূপান্তরিত করে।",
  },
};

const BOOK_CHAPTERS: Record<string, string[]> = {
  "the-heart-of-meditation": [
    "Why Sit?",
    "The Breath as Anchor",
    "Posture and the Body",
    "Working with Distraction",
    "Loving-Kindness",
    "Body Scanning",
    "Open Awareness",
    "Integrating Practice into Daily Life",
  ],
  "walking-the-middle-way": [
    "The Two Extremes",
    "Right View",
    "Right Intention",
    "Right Speech",
    "Right Action",
    "Right Livelihood",
    "Right Effort",
    "Right Mindfulness",
    "Right Concentration",
    "Living the Path",
  ],
  "mindful-living-daily": [
    "January: Beginning with Intention",
    "February: The Body",
    "March: The Breath",
    "April: Emotions",
    "May: Relationships",
    "June: Work and Technology",
    "July: Rest and Renewal",
    "August: Speech and Listening",
    "September: Gratitude",
    "October: Letting Go",
    "November: Community",
    "December: Looking Back, Looking Forward",
  ],
  "emotional-resilience": [
    "What Resilience Is (and Isn't)",
    "The Physiology of Stress",
    "Mindfulness for Difficult Emotions",
    "Self-Compassion as a Foundation",
    "Working with Anxiety",
    "Grief and Loss",
    "Boundaries and Energy",
    "The Resilience Habit",
  ],
  "art-of-sitting-still": [
    "Why Ten Minutes",
    "Getting Comfortable",
    "Following the Breath",
    "When the Mind Wanders",
    "Sitting with Boredom",
    "A Ten-Minute Daily Practice",
  ],
  "four-noble-truths-modern-life": [
    "The First Noble Truth: Stress Is Universal",
    "The Second Noble Truth: The Cause of Stress",
    "The Third Noble Truth: The Possibility of Peace",
    "The Fourth Noble Truth: The Way Forward",
    "Living with the Truths",
  ],
  "loving-kindness-meditation": [
    "The Power of Metta",
    "Self-Compassion First",
    "A Loved One",
    "A Neutral Person",
    "A Difficult Person",
    "Radiating to All Beings",
    "Guided Practices",
  ],
  "buddhist-psychology-emotions": [
    "The Map of the Mind",
    "Mental Factors: A Closer Look",
    "Anger: The Burning Mind",
    "Jealousy: The Comparing Mind",
    "Fear: The Guarding Mind",
    "Desire: The Grasping Mind",
    "Transforming the Hindrances",
  ],
  "mindfulness-stress-reduction": [
    "The Science of Stress",
    "Body Scan: Weeks 1-2",
    "Mindful Movement: Week 3",
    "Sitting Meditation: Weeks 4-5",
    "Walking and Daily Life: Week 6",
    "Communication: Week 7",
    "Beyond the Program: Week 8",
  ],
  "silence-and-stillness": [
    "The Gift of Silence",
    "Solitude and the Inner Landscape",
    "Morning Stillness",
    "The Art of Not Doing",
    "Listening to the World",
    "Stillness as Homecoming",
  ],
};

// Attach bios + chapters to the static rows above.
for (const b of MOCK_BOOKS_DATA) {
  const bio = AUTHOR_BIOS[b.author_name];
  if (bio) {
    b.author_bio_en = bio.en;
    b.author_bio_bn = bio.bn;
  }
  b.chapters = BOOK_CHAPTERS[b.slug] ?? [];
}

export function mockFetchBookById(id: string): Book | null {
  return mockApplyBookOverrides(MOCK_BOOKS_DATA).find((b) => b.id === id) ?? null;
}

export function mockFetchBookBySlug(slug: string): Book | null {
  return mockApplyBookOverrides(MOCK_BOOKS_DATA).find((b) => b.slug === slug) ?? null;
}

export function mockFetchPublishedBooks(
  page = 1,
  pageSize = 12,
  options?: { category?: string; search?: string; featured?: boolean; sort?: BookSortOption },
): { data: Book[]; total: number } {
  let filtered = mockApplyBookOverrides(MOCK_BOOKS_DATA);

  if (options?.category) {
    const slug = options.category.toLowerCase().replace(/-/g, " ");
    filtered = filtered.filter(
      (b) => b.category.toLowerCase() === slug || b.category.toLowerCase() === options.category!.toLowerCase(),
    );
  }

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    filtered = filtered.filter(
      (b) =>
        b.title_en.toLowerCase().includes(q) ||
        b.title_bn.toLowerCase().includes(q) ||
        b.author_name.toLowerCase().includes(q) ||
        b.description_en.toLowerCase().includes(q),
    );
  }

  if (options?.featured) {
    filtered = filtered.filter((b) => b.featured);
  }

  // Apply sorting
  const sort = options?.sort || "newest";
  filtered.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "title-asc":
        return a.title_en.localeCompare(b.title_en);
      case "title-desc":
        return b.title_en.localeCompare(a.title_en);
      case "rating-desc":
        return (b.avg_rating || 0) - (a.avg_rating || 0);
      case "rating-asc":
        return (a.avg_rating || 0) - (b.avg_rating || 0);
      case "price-asc":
        return (a.price || 0) - (b.price || 0);
      case "price-desc":
        return (b.price || 0) - (a.price || 0);
      case "popular":
        return (b.total_ratings || 0) - (a.total_ratings || 0);
      case "newest":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const total = filtered.length;
  const from = (page - 1) * pageSize;
  const data = filtered.slice(from, from + pageSize);
  return { data, total };
}

// ─── Videos ──────────────────────────────────────────────────

const MOCK_VIDEOS_DATA: Video[] = [
  {
    id: "video-1",
    title: "The Four Noble Truths — An Introduction",
    title_en: "The Four Noble Truths — An Introduction",
    title_bn: "চারটি আর্যসত্য — একটি ভূমিকা",
    description: "A clear and accessible introduction to the Buddha's first teaching after his enlightenment. Covers dukkha, its origin, cessation, and the path.",
    description_en: "A clear and accessible introduction to the Buddha's first teaching after his enlightenment. Covers dukkha, its origin, cessation, and the path.",
    description_bn: "বুদ্ধের প্রথম উপদেশের একটি স্পষ্ট ও সহজলভ্য ভূমিকা। দুঃখ, এর উৎপত্তি, নিরোধ এবং পথ — সবকিছু আলোচিত।",
    thumbnail_url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=dy-RI3FrdGA",
    duration: 1110,
    category: "Teachings",
    sort_order: 0,
    status: "published",
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "video-2",
    title: "Morning Mindfulness Meditation (20 min)",
    title_en: "Morning Mindfulness Meditation (20 min)",
    title_bn: "সকালের মাইন্ডফুলনেস ধ্যান (২০ মিনিট)",
    description: "A guided 20-minute mindfulness meditation to start your day with clarity and presence. Suitable for all levels.",
    description_en: "A guided 20-minute mindfulness meditation to start your day with clarity and presence. Suitable for all levels.",
    description_bn: "স্পষ্টতা ও উপস্থিতির সাথে দিন শুরু করার জন্য একটি নির্দেশিত ২০ মিনিটের মাইন্ডফুলনেস ধ্যান। সকল স্তরের জন্য উপযোগী।",
    thumbnail_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=XHvtIcaD194",
    duration: 1224,
    category: "Meditation",
    sort_order: 1,
    status: "published",
    created_at: "2026-02-05T00:00:00Z",
    updated_at: "2026-02-05T00:00:00Z",
  },
  {
    id: "video-3",
    title: "Buddhist Psychology of Emotions",
    title_en: "Buddhist Psychology of Emotions",
    title_bn: "আবেগের বৌদ্ধ মনোবিজ্ঞান",
    description: "How Buddhist psychology understands emotions — from the five hindrances to working with difficult states of mind with wisdom and compassion.",
    description_en: "How Buddhist psychology understands emotions — from the five hindrances to working with difficult states of mind with wisdom and compassion.",
    description_bn: "বৌদ্ধ মনোবিজ্ঞান কীভাবে আবেগ বোঝে — পাঁচটি নীবরণ থেকে জ্ঞান ও সমবেদনার সাথে কঠিন মনের অবস্থার সাথে কাজ করা পর্যন্ত।",
    thumbnail_url: "https://images.unsplash.com/photo-1524650359799-842906ca1c06?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=9OvLOna5_1A",
    duration: 1071,
    category: "Psychology",
    sort_order: 2,
    status: "published",
    created_at: "2026-03-12T00:00:00Z",
    updated_at: "2026-03-12T00:00:00Z",
  },
  {
    id: "video-4",
    title: "Walking Meditation — Outdoor Practice",
    title_en: "Walking Meditation — Outdoor Practice",
    title_bn: "হাঁটার ধ্যান — উন্মুক্ত অনুশীলন",
    description: "Take your meditation practice outdoors. Learn the traditional art of walking meditation with clear guidance and tips for daily life.",
    description_en: "Take your meditation practice outdoors. Learn the traditional art of walking meditation with clear guidance and tips for daily life.",
    description_bn: "আপনার ধ্যান অনুশীলনকে বাইরে নিয়ে যান। দৈনন্দিন জীবনের জন্য স্পষ্ট নির্দেশনা ও পরামর্শসহ হাঁটার ধ্যানের ঐতিহ্যবাহী শিল্প শিখুন।",
    thumbnail_url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=QdO1vZJgUu0",
    duration: 344,
    category: "Meditation",
    sort_order: 3,
    status: "published",
    created_at: "2026-04-18T00:00:00Z",
    updated_at: "2026-04-18T00:00:00Z",
  },
  {
    id: "video-5",
    title: "Dealing with Anxiety — A Buddhist Perspective",
    title_en: "Dealing with Anxiety — A Buddhist Perspective",
    title_bn: "উদ্বেগ মোকাবেলা — একটি বৌদ্ধ দৃষ্টিভঙ্গি",
    description: "Practical tools from the Buddhist tradition for working with anxiety, worry, and fear. Includes guided reflection and breathing techniques.",
    description_en: "Practical tools from the Buddhist tradition for working with anxiety, worry, and fear. Includes guided reflection and breathing techniques.",
    description_bn: "উদ্বেগ, দুশ্চিন্তা ও ভয়ের সাথে কাজ করার জন্য বৌদ্ধ ঐতিহ্যের ব্যবহারিক উপায়। নির্দেশিত প্রতিফলন ও শ্বাস-কৌশল অন্তর্ভুক্ত।",
    thumbnail_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=k1dgq8MlyH0",
    duration: 6400,
    category: "Mental Health",
    sort_order: 4,
    status: "published",
    created_at: "2026-05-22T00:00:00Z",
    updated_at: "2026-05-22T00:00:00Z",
  },
  {
    id: "video-6",
    title: "The Middle Way in Everyday Life",
    title_en: "The Middle Way in Everyday Life",
    title_bn: "দৈনন্দিন জীবনে মধ্যম পথ",
    description: "How to apply the Buddha's teaching on the Middle Way to modern challenges — finding balance between indulgence and asceticism in daily choices.",
    description_en: "How to apply the Buddha's teaching on the Middle Way to modern challenges — finding balance between indulgence and asceticism in daily choices.",
    description_bn: "আধুনিক চ্যালেঞ্জে বুদ্ধের মধ্যম পথের শিক্ষা কীভাবে প্রয়োগ করবেন — দৈনন্দিন পছন্দে ভোগ ও কঠোরতার মধ্যে ভারসাম্য খুঁজে পাওয়া।",
    thumbnail_url: "https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=Tt4JDmyyQxU",
    duration: 1800,
    category: "Teachings",
    sort_order: 5,
    status: "published",
    created_at: "2026-06-08T00:00:00Z",
    updated_at: "2026-06-08T00:00:00Z",
  },
  {
    id: "video-7",
    title: "Loving-Kindness Guided Practice (15 min)",
    title_en: "Loving-Kindness Guided Practice (15 min)",
    title_bn: "মৈত্রী নির্দেশিত অনুশীলন (১৫ মিনিট)",
    description: "A gentle guided metta meditation sending love to yourself, loved ones, neutral people, difficult people, and all beings.",
    description_en: "A gentle guided metta meditation sending love to yourself, loved ones, neutral people, difficult people, and all beings.",
    description_bn: "নিজেকে, প্রিয়জনকে, নিরপেক্ষ মানুষকে, কঠিন মানুষকে এবং সকল সত্ত্বাকে ভালোবাসা পাঠানো একটি কোমল নির্দেশিত মৈত্রী ধ্যান।",
    thumbnail_url: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=5luvQp--B8U",
    duration: 1065,
    category: "Meditation",
    sort_order: 6,
    status: "published",
    created_at: "2026-06-20T00:00:00Z",
    updated_at: "2026-06-20T00:00:00Z",
  },
  {
    id: "video-8",
    title: "Understanding Impermanence (Anicca)",
    title_en: "Understanding Impermanence (Anicca)",
    title_bn: "অনিত্যতা বোঝা (আনিচ্চা)",
    description: "A talk on the Buddhist concept of impermanence — how recognizing change liberates us from suffering and deepens our appreciation of life.",
    description_en: "A talk on the Buddhist concept of impermanence — how recognizing change liberates us from suffering and deepens our appreciation of life.",
    description_bn: "অনিত্যতার বৌদ্ধ ধারণার উপর একটি আলোচনা — কীভাবে পরিবর্তনকে স্বীকার করা আমাদের দুঃখ থেকে মুক্ত করে এবং জীবনের প্রতি উপলব্ধি গভীর করে।",
    thumbnail_url: "https://images.unsplash.com/photo-1517093602195-b40af9682e2e?w=640&h=360&fit=crop&auto=format",
    youtube_url: "https://www.youtube.com/watch?v=AEQtqW1RAm0",
    duration: 2400,
    category: "Teachings",
    sort_order: 7,
    status: "published",
    created_at: "2026-07-05T00:00:00Z",
    updated_at: "2026-07-05T00:00:00Z",
  },
];

export function mockFetchPublishedVideos(page = 1, pageSize = 12): { data: Video[]; total: number } {
  const all = mockApplyVideoOverrides(MOCK_VIDEOS_DATA);
  const from = (page - 1) * pageSize;
  const data = all.slice(from, from + pageSize);
  return { data, total: all.length };
}

// ─── Admin lists (all rows incl. drafts + CMS overrides) ─────────

export function mockFetchAllBooks(): Book[] {
  return mockApplyBookOverrides(MOCK_BOOKS_DATA);
}

export function mockFetchAllPosts(): Post[] {
  return mockApplyPostOverrides(MOCK_POSTS_DATA);
}

export function mockFetchAllVideos(): Video[] {
  return mockApplyVideoOverrides(MOCK_VIDEOS_DATA);
}

// ─── Recently Added (for homepage) ─────────────────────────

export interface TrendingItem {
  type: "post" | "book";
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  url: string;
  thumbnail: string | null;
  viewCount: number;
  created_at: string;
}

export function mockFetchRecentlyAdded(limit = 6): TrendingItem[] {
  const results: TrendingItem[] = [];

  // Take the most recent posts
  const recentPosts = [...mockApplyPostOverrides(MOCK_POSTS_DATA)]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, Math.ceil(limit / 2));

  for (const p of recentPosts) {
    results.push({
      type: "post",
      id: p.id,
      slug: p.slug,
      title: p.title_en || p.title_bn || "",
      excerpt: p.excerpt_en || p.excerpt_bn || "",
      url: `/posts/${p.slug}`,
      thumbnail: p.cover_image,
      viewCount: 0,
      created_at: p.created_at,
    });
  }

  // Take the most recent books
  const recentBooks = [...mockApplyBookOverrides(MOCK_BOOKS_DATA)]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, Math.ceil(limit / 2));

  for (const b of recentBooks) {
    results.push({
      type: "book",
      id: b.id,
      slug: b.slug,
      title: b.title_en || b.title_bn || "",
      excerpt: b.description_en || b.description_bn || "",
      url: `/books/${b.slug}`,
      thumbnail: b.cover_image,
      viewCount: 0,
      created_at: b.created_at,
    });
  }

  // Sort all by created_at and take top N
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return results.slice(0, limit);
}
