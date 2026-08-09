"""Seed demo content into Strapi's SQLite database."""
import json
import sqlite3
import string
import random
import datetime
from pathlib import Path

DB = Path(__file__).parent.parent / ".tmp" / "data.db"
now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]

# Strapi v5 uses 21-char lowercase alphanumeric cuid2-like document IDs
def docid() -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=21))

# -- Helper: a Strapi blocks body (paragraph with lorem ipsum)
def blocks_text(text: str):
    return [
        {
            "type": "paragraph",
            "children": [{"type": "text", "text": text}],
        }
    ]

def blocks_multiple(*paragraphs):
    return [
        {"type": "paragraph", "children": [{"type": "text", "text": p}]}
        for p in paragraphs
    ]

# --- Categories ---
categories = [
    {"name_en": "Buddhist Psychology", "name_bn": "বৌদ্ধ মনোবিজ্ঞান", "slug": "buddhist-psychology", "color": "#d35400", "visible": True, "sort_order": 0},
    {"name_en": "Meditation", "name_bn": "ধ্যান", "slug": "meditation", "color": "#2980b9", "visible": True, "sort_order": 1},
    {"name_en": "Mindfulness", "name_bn": "মননশীলতা", "slug": "mindfulness", "color": "#27ae60", "visible": True, "sort_order": 2},
    {"name_en": "Mental Health", "name_bn": "মানসিক স্বাস্থ্য", "slug": "mental-health", "color": "#8e44ad", "visible": True, "sort_order": 3},
    {"name_en": "Philosophy", "name_bn": "দর্শন", "slug": "philosophy", "color": "#2c3e50", "visible": True, "sort_order": 4},
]

# --- Tags ---
tags = [
    {"name_en": "Anxiety", "name_bn": "উদ্বেগ", "slug": "anxiety", "color": "#e74c3c"},
    {"name_en": "Compassion", "name_bn": "করুণা", "slug": "compassion", "color": "#e91e63"},
    {"name_en": "Wisdom", "name_bn": "প্রজ্ঞা", "slug": "wisdom", "color": "#ff9800"},
    {"name_en": "Beginner", "name_bn": "শিক্ষার্থী", "slug": "beginner", "color": "#4caf50"},
    {"name_en": "Advanced", "name_bn": "উন্নত", "slug": "advanced", "color": "#9c27b0"},
    {"name_en": "Daily Practice", "name_bn": "দৈনিক অনুশীলন", "slug": "daily-practice", "color": "#00bcd4"},
    {"name_en": "Sutta", "name_bn": "সূত্র", "slug": "sutta", "color": "#ff5722"},
    {"name_en": "Dharma Talk", "name_bn": "ধর্ম আলোচনা", "slug": "dharma-talk", "color": "#795548"},
    {"name_en": "Science", "name_bn": "বিজ্ঞান", "slug": "science", "color": "#607d8b"},
    {"name_en": "Wellbeing", "name_bn": "সুস্থতা", "slug": "wellbeing", "color": "#009688"},
]

# --- Books ---
books = [
    {
        "title_en": "The Heart of Buddhist Meditation",
        "title_bn": "বৌদ্ধ ধ্যানের হৃদয়",
        "slug": "heart-of-buddhist-meditation",
        "description_en": blocks_multiple(
            "A clear and practical guide to the core teachings of Buddhist meditation, from the Satipatthana Sutta to modern insight practices. This book explores the four foundations of mindfulness and how they can be applied in daily life.",
            "Written for both beginners and experienced practitioners, it offers step-by-step instructions for developing a sustainable meditation practice rooted in the wisdom of the Pali Canon.",
        ),
        "description_bn": blocks_multiple(
            "সতিপট্ঠান সুত্ত থেকে আধুনিক অন্তর্দৃষ্টি অনুশীলন পর্যন্ত বৌদ্ধ ধ্যানের মূল শিক্ষার একটি স্পষ্ট ও ব্যবহারিক নির্দেশিকা। এই বইটি মননশীলতার চারটি ভিত্তি এবং সেগুলি দৈনন্দিন জীবনে কীভাবে প্রয়োগ করা যায় তা অন্বেষণ করে।",
            "নতুন এবং অভিজ্ঞ উভয় অনুশীলনকারীদের জন্য লেখা, এটি পালি ক্যাননের প্রজ্ঞার উপর ভিত্তি করে একটি টেকসই ধ্যান অনুশীলন গড়ে তোলার জন্য ধাপে ধাপে নির্দেশনা প্রদান করে।",
        ),
        "author_name": "Nyanaponika Thera",
        "price": 0, "currency": "USD", "is_free": True,
        "book_status": "published", "rating": 4.8, "rating_count": 124,
        "featured": True, "sort_order": 0,
        "categories": [0, 2], "tags": [0, 2, 3],
    },
    {
        "title_en": "The Dhammapada: The Buddha's Path of Wisdom",
        "title_bn": "ধম্মপদ: বুদ্ধের প্রজ্ঞার পথ",
        "slug": "dhammapada",
        "description_en": blocks_multiple(
            "The Dhammapada is the most widely read Buddhist scripture in the world, a collection of verses that form the essence of the Buddha's teachings. This translation presents the verses in clear, accessible language.",
            "Each verse offers timeless wisdom on ethics, meditation, and the nature of mind — as relevant today as when they were first spoken 2,500 years ago.",
        ),
        "description_bn": blocks_multiple(
            "ধম্মপদ বিশ্বের সর্বাধিক পঠিত বৌদ্ধ ধর্মগ্রন্থ, বুদ্ধের শিক্ষার সারাংশ গঠনকারী শ্লোকগুলির একটি সংগ্রহ। এই অনুবাদটি স্পষ্ট, সহজ ভাষায় শ্লোকগুলি উপস্থাপন করে।",
            "প্রতিটি শ্লোক নীতি, ধ্যান এবং মনের প্রকৃতি সম্পর্কে নিরবধি প্রজ্ঞা প্রদান করে — ২,৫০০ বছর আগে প্রথম বলা হওয়ার সময়ে যেমন প্রাসঙ্গিক ছিল তেমনি আজও।",
        ),
        "author_name": "Translated by Acharya Buddharakkhita",
        "price": 0, "currency": "USD", "is_free": True,
        "book_status": "published", "rating": 4.9, "rating_count": 312,
        "featured": True, "sort_order": 1,
        "categories": [0, 4], "tags": [2, 6],
    },
    {
        "title_en": "Mindfulness in Plain English",
        "title_bn": "সরল ইংরেজিতে মননশীলতা",
        "slug": "mindfulness-in-plain-english",
        "description_en": blocks_multiple(
            "A classic introductory guide to Vipassana meditation, beloved by beginners and seasoned practitioners alike. Bhante Gunaratana explains the practice with warmth, clarity, and humor.",
            "This book covers posture, breathing techniques, dealing with distractions, and cultivating the deep insights that arise from sustained mindfulness practice.",
        ),
        "description_bn": blocks_multiple(
            "বিপশ্যনা ধ্যানের একটি ক্লাসিক প্রাথমিক নির্দেশিকা, নতুন এবং অভিজ্ঞ অনুশীলনকারীদের একইভাবে প্রিয়। ভান্তে গুণরতন উষ্ণতা, স্পষ্টতা এবং হাস্যরসের সাথে অনুশীলনটি ব্যাখ্যা করেছেন।",
            "এই বইটি ভঙ্গি, শ্বাস-প্রশ্বাসের কৌশল, বিভ্রান্তি মোকাবেলা এবং টেকসই মননশীলতা অনুশীলন থেকে উদ্ভূত গভীর অন্তর্দৃষ্টি চাষ করা সহ বিষয়গুলি কভার করে।",
        ),
        "author_name": "Bhante Henepola Gunaratana",
        "price": 9.99, "currency": "USD", "is_free": False,
        "book_status": "published", "rating": 4.7, "rating_count": 89,
        "featured": True, "sort_order": 2,
        "categories": [1, 2], "tags": [3, 6, 9],
    },
    {
        "title_en": "When Things Fall Apart",
        "title_bn": "যখন সবকিছু ভেঙে পড়ে",
        "slug": "when-things-fall-apart",
        "description_en": blocks_multiple(
            "Pema Chödrön's beloved classic on finding wisdom and compassion in the midst of life's difficulties. With her characteristic warmth, she shows how we can use painful emotions as a path to awakening.",
            "Drawing from Buddhist teachings on the three marks of existence, this book offers practical guidance for working with fear, grief, and uncertainty.",
        ),
        "description_bn": blocks_multiple(
            "পেমা চোদ্রনের জীবনের কঠিন সময়ে প্রজ্ঞা ও করুণা খুঁজে পাওয়ার প্রিয় ক্লাসিক। তার বৈশিষ্ট্যপূর্ণ উষ্ণতার সাথে, তিনি দেখান কীভাবে আমরা বেদনাদায়ক আবেগকে জাগরণের পথ হিসাবে ব্যবহার করতে পারি।",
            "অস্তিত্বের তিনটি চিহ্ন সম্পর্কে বৌদ্ধ শিক্ষা থেকে অঙ্কন করে, এই বইটি ভয়, শোক এবং অনিশ্চয়তার সাথে কাজ করার জন্য ব্যবহারিক নির্দেশনা প্রদান করে।",
        ),
        "author_name": "Pema Chödrön",
        "price": 12.99, "currency": "USD", "is_free": False,
        "book_status": "published", "rating": 4.6, "rating_count": 201,
        "featured": False, "sort_order": 3,
        "categories": [3, 0], "tags": [0, 1, 9],
    },
    {
        "title_en": "The Art of Happiness",
        "title_bn": "সুখের শিল্প",
        "slug": "the-art-of-happiness",
        "description_en": blocks_multiple(
            "A profound dialogue between the Dalai Lama and psychiatrist Howard Cutler exploring the nature of happiness and how to cultivate it. Blending Buddhist wisdom with Western psychology.",
            "Through compelling anecdotes and practical exercises, this book demonstrates that happiness is not a fleeting emotion but a skill that can be developed through training the mind.",
        ),
        "description_bn": blocks_multiple(
            "দালাই লামা এবং মনোরোগ বিশেষজ্ঞ হাওয়ার্ড কাটলারের মধ্যে সুখের প্রকৃতি এবং এটি কীভাবে চাষ করা যায় তা অন্বেষণ করা একটি গভীর সংলাপ। বৌদ্ধ প্রজ্ঞা এবং পাশ্চাত্য মনোবিজ্ঞানের মিশ্রণ।",
            "আকর্ষণীয় উপাখ্যান এবং ব্যবহারিক অনুশীলনের মাধ্যমে, এই বইটি প্রদর্শন করে যে সুখ একটি ক্ষণস্থায়ী আবেগ নয় বরং একটি দক্ষতা যা মনকে প্রশিক্ষণের মাধ্যমে বিকাশ করা যায়।",
        ),
        "author_name": "Dalai Lama & Howard Cutler",
        "price": 0, "currency": "USD", "is_free": True,
        "book_status": "published", "rating": 4.5, "rating_count": 167,
        "featured": True, "sort_order": 4,
        "categories": [0, 3], "tags": [1, 2, 9],
    },
    {
        "title_en": "Zen Mind, Beginner's Mind",
        "title_bn": "জেন মন, শিক্ষার্থীর মন",
        "slug": "zen-mind-beginners-mind",
        "description_en": blocks_multiple(
            "Shunryu Suzuki's timeless classic on Zen meditation and practice. With simple, direct language, he conveys the essence of Zen: that the mind of the beginner is open, curious, and full of possibilities.",
            "This book has been a source of inspiration for meditation practitioners worldwide for over fifty years, offering profound insights into the nature of practice and the art of living.",
        ),
        "description_bn": blocks_multiple(
            "শুনরিউ সুজুকির জেন ধ্যান এবং অনুশীলনের নিরবধি ক্লাসিক। সরল, প্রত্যক্ষ ভাষায়, তিনি জেনের সারমর্ম প্রকাশ করেন: শিক্ষার্থীর মন উন্মুক্ত, কৌতূহলী এবং সম্ভাবনায় পূর্ণ।",
            "এই বইটি পঞ্চাশ বছরেরও বেশি সময় ধরে বিশ্বব্যাপী ধ্যান অনুশীলনকারীদের জন্য অনুপ্রেরণার উৎস, অনুশীলনের প্রকৃতি এবং জীবনযাপনের শিল্পে গভীর অন্তর্দৃষ্টি প্রদান করে।",
        ),
        "author_name": "Shunryu Suzuki",
        "price": 8.99, "currency": "USD", "is_free": False,
        "book_status": "published", "rating": 4.7, "rating_count": 98,
        "featured": False, "sort_order": 5,
        "categories": [1, 4], "tags": [2, 3, 5],
    },
]

# --- Posts ---
posts = [
    {
        "title_en": "The Four Noble Truths: A Modern Perspective",
        "title_bn": "চারটি আর্যসত্য: একটি আধুনিক দৃষ্টিভঙ্গি",
        "slug": "four-noble-truths-modern-perspective",
        "content_en": blocks_multiple(
            "The Four Noble Truths form the foundation of all Buddhist practice. Yet their simplicity can be deceptive — beneath the surface lies a profound diagnosis of the human condition and a practical path to freedom.",
            "The First Noble Truth acknowledges that suffering (dukkha) is an inherent part of existence. But this is not a pessimistic view — it is a realistic one. By acknowledging suffering, we stop running from it and begin to understand it.",
            "The Second Noble Truth identifies the cause: craving and attachment. In modern terms, we might call this the mind's tendency to grasp at pleasure and push away pain — a pattern that modern neuroscience confirms is wired into our nervous system.",
            "The Third Noble Truth offers hope: there is a cessation, a freedom from suffering. This is not escape but transformation — the end of unnecessary suffering by seeing through the illusions that create it.",
            "The Fourth Noble Truth is the Eightfold Path: a comprehensive framework for living that encompasses wisdom, ethics, and meditation. It is not a list of beliefs but a way of life to be practiced daily.",
        ),
        "content_bn": blocks_multiple(
            "চারটি আর্যসত্য সমস্ত বৌদ্ধ অনুশীলনের ভিত্তি গঠন করে। কিন্তু তাদের সরলতা প্রতারণামূলক হতে পারে — পৃষ্ঠের নীচে মানব অবস্থার একটি গভীর রোগ নির্ণয় এবং স্বাধীনতার একটি ব্যবহারিক পথ রয়েছে।",
            "প্রথম আর্যসত্য স্বীকার করে যে দুঃখ অস্তিত্বের একটি সহজাত অংশ। কিন্তু এটি একটি হতাশাবাদী দৃষ্টিভঙ্গি নয় — এটি একটি বাস্তববাদী দৃষ্টিভঙ্গি। দুঃখ স্বীকার করে, আমরা এটি থেকে পালানো বন্ধ করি এবং এটি বুঝতে শুরু করি।",
        ),
        "excerpt_en": "An exploration of the Buddha's foundational teaching through the lens of modern psychology and neuroscience.",
        "excerpt_bn": "আধুনিক মনোবিজ্ঞান এবং স্নায়ুবিজ্ঞানের দৃষ্টিকোণ থেকে বুদ্ধের মৌলিক শিক্ষার একটি অনুসন্ধান।",
        "author": "Dr. Ananda Silva",
        "reading_time": 8, "featured": True, "sort_order": 0,
        "categories": [0, 4], "tags": [2, 3, 6],
    },
    {
        "title_en": "Working with Anxiety Through Mindfulness",
        "title_bn": "মননশীলতার মাধ্যমে উদ্বেগ নিয়ে কাজ করা",
        "slug": "working-with-anxiety-mindfulness",
        "content_en": blocks_multiple(
            "Anxiety is the mind's alarm system — it evolved to protect us from danger. But in modern life, that alarm system can become over-sensitized, triggering false alarms that leave us exhausted and afraid.",
            "Mindfulness offers a different relationship with anxiety. Instead of trying to eliminate anxious feelings, we learn to observe them with curiosity and compassion. This shift — from fighting to understanding — is transformative.",
            "Start by noticing where anxiety lives in your body. The tight chest, the shallow breath, the knot in the stomach. Bring gentle attention to these sensations without trying to change them. This simple act of presence begins to soothe the nervous system.",
            "Practice: When anxiety arises, pause. Take three conscious breaths. Place a hand on your heart. Say to yourself: 'This is anxiety. It is uncomfortable but not dangerous. It will pass.' This is not denial — it is skillful means.",
        ),
        "content_bn": blocks_multiple(
            "উদ্বেগ হল মনের এলার্ম সিস্টেম — এটি আমাদের বিপদ থেকে রক্ষা করার জন্য বিবর্তিত হয়েছে। কিন্তু আধুনিক জীবনে, সেই এলার্ম সিস্টেম অত্যধিক সংবেদনশীল হয়ে উঠতে পারে, মিথ্যা এলার্ম ট্রিগার করে যা আমাদের ক্লান্ত এবং ভীত করে তোলে।",
            "মননশীলতা উদ্বেগের সাথে একটি ভিন্ন সম্পর্ক প্রদান করে। উদ্বেগজনক অনুভূতি দূর করার চেষ্টা করার পরিবর্তে, আমরা কৌতূহল এবং করুণার সাথে সেগুলি পর্যবেক্ষণ করতে শিখি। এই পরিবর্তন — লড়াই থেকে বোঝার দিকে — রূপান্তরকারী।",
        ),
        "excerpt_en": "Practical mindfulness techniques for transforming your relationship with anxiety.",
        "excerpt_bn": "উদ্বেগের সাথে আপনার সম্পর্ক পরিবর্তনের জন্য ব্যবহারিক মননশীলতা কৌশল।",
        "author": "Sarah Khenpo",
        "reading_time": 6, "featured": True, "sort_order": 1,
        "categories": [2, 3], "tags": [0, 3, 9],
    },
    {
        "title_en": "The Buddha's Teachings on Compassion",
        "title_bn": "করুণা সম্পর্কে বুদ্ধের শিক্ষা",
        "slug": "buddhas-teachings-on-compassion",
        "content_en": blocks_multiple(
            "Compassion (karuna) is one of the four Brahmaviharas — the divine abodes — in Buddhist practice. It is the wish for all beings to be free from suffering, and it is a quality that can be cultivated through intentional practice.",
            "The Buddha taught that compassion begins with oneself. We cannot genuinely wish for others to be free from suffering if we are at war with our own pain. Self-compassion is not selfishness — it is the foundation of genuine care for others.",
            "Loving-kindness meditation (metta bhavana) is the classical method for developing compassion. Begin by offering wishes of safety, happiness, health, and ease to yourself. Then gradually extend these wishes to others — starting with a benefactor, then a friend, then a neutral person, then a difficult person, and finally all beings.",
            "True compassion does not mean fixing others' problems. It means being present with their suffering without being overwhelmed by it. This is the middle way between avoidance and enmeshment.",
        ),
        "content_bn": blocks_multiple(
            "করুণা হল চারটি ব্রহ্মবিহারের একটি — ঐশ্বরিক আবাস — বৌদ্ধ অনুশীলনে। এটি সমস্ত প্রাণীর দুঃখ থেকে মুক্ত হওয়ার ইচ্ছা এবং এটি একটি গুণ যা ইচ্ছাকৃত অনুশীলনের মাধ্যমে চাষ করা যায়।",
            "বুদ্ধ শিখিয়েছিলেন যে করুণা নিজের থেকে শুরু হয়। আমরা আন্তরিকভাবে অন্যদের দুঃখ থেকে মুক্ত হতে চাইতে পারি না যদি আমরা আমাদের নিজের বেদনার সাথে যুদ্ধ করি। আত্ম-করুণা স্বার্থপরতা নয় — এটি অন্যদের জন্য প্রকৃত যত্নের ভিত্তি।",
        ),
        "excerpt_en": "A deep dive into the Buddhist practice of compassion — from self-compassion to universal loving-kindness.",
        "excerpt_bn": "আত্ম-করুণা থেকে সর্বজনীন মৈত্রী পর্যন্ত করুণার বৌদ্ধ অনুশীলনে একটি গভীর ডুব।",
        "author": "Bhikkhu Analayo",
        "reading_time": 7, "featured": False, "sort_order": 2,
        "categories": [0, 1], "tags": [1, 3, 7],
    },
    {
        "title_en": "Science Confirms: Meditation Changes the Brain",
        "title_bn": "বিজ্ঞান নিশ্চিত করে: ধ্যান মস্তিষ্ক পরিবর্তন করে",
        "slug": "science-meditation-changes-brain",
        "content_en": blocks_multiple(
            "Over the past two decades, neuroscientific research has confirmed what meditators have known for millennia: consistent meditation practice fundamentally changes the structure and function of the brain.",
            "Studies from Harvard, Stanford, and the Max Planck Institute have shown that eight weeks of daily mindfulness practice can reduce the size of the amygdala (the brain's fear center) while increasing gray matter density in the prefrontal cortex (associated with attention and emotional regulation).",
            "Long-term meditators show enhanced activity in brain regions associated with empathy, compassion, and positive affect. The default mode network — responsible for mind-wandering and rumination — becomes less active and better integrated.",
            "These findings do not 'prove' Buddhism true — science and Dharma are different domains of inquiry. But they do suggest that the mind-training techniques developed over centuries have measurable, beneficial effects on human wellbeing.",
        ),
        "content_bn": blocks_multiple(
            "গত দুই দশক ধরে, স্নায়ুবৈজ্ঞানিক গবেষণা নিশ্চিত করেছে যা ধ্যানকারীরা সহস্রাব্দ ধরে জেনে এসেছে: নিয়মিত ধ্যান অনুশীলন মৌলিকভাবে মস্তিষ্কের গঠন এবং কার্যকারিতা পরিবর্তন করে।",
            "হার্ভার্ড, স্ট্যানফোর্ড এবং ম্যাক্স প্ল্যাঙ্ক ইনস্টিটিউটের গবেষণায় দেখা গেছে যে আট সপ্তাহের দৈনিক মননশীলতা অনুশীলন অ্যামিগডালার (মস্তিষ্কের ভয় কেন্দ্র) আকার কমাতে পারে যখন প্রিফ্রন্টাল কর্টেক্সে (মনোযোগ এবং আবেগ নিয়ন্ত্রণের সাথে সম্পর্কিত) ধূসর পদার্থের ঘনত্ব বাড়ায়।",
        ),
        "excerpt_en": "A review of the latest neuroscience research on how meditation reshapes the brain for greater wellbeing.",
        "excerpt_bn": "কীভাবে ধ্যান অধিক সুস্থতার জন্য মস্তিষ্ককে পুনরায় আকার দেয় সে সম্পর্কে সর্বশেষ স্নায়ুবিজ্ঞান গবেষণার একটি পর্যালোচনা।",
        "author": "Dr. James Kingsley",
        "reading_time": 5, "featured": False, "sort_order": 3,
        "categories": [2, 3], "tags": [4, 8, 9],
    },
]

# --- Page ---
page = {
    "title_en": "About Bodhi Mitra",
    "title_bn": "বোধি মিত্র সম্পর্কে",
    "slug": "about",
    "content_en": blocks_multiple(
        "Bodhi Mitra — a friend on the path of awakening — is a small journal maintained by practicing psychiatrists who have spent many years sitting with patients in clinic, and many mornings sitting in silence on the cushion.",
        "We write at the seam where two great traditions of mind meet: the Buddha's meditative heritage and modern psychiatry's evidence-based science. Our aim is not to prescribe treatment but to offer reflections — notes from the path, gently given.",
        "This site offers books, articles, and courses on Buddhist psychology, mindfulness, meditation, and mental health. All content is bilingual in English and Bengali, reflecting the rich cultural heritage of the region where these traditions have flourished for millennia.",
    ),
    "content_bn": blocks_multiple(
        "বোধি মিত্র — জাগরণের পথে এক বন্ধু — একটি ছোট জার্নাল, যা অনুশীলনরত মনোরোগ বিশেষজ্ঞদের দ্বারা পরিচালিত যারা ক্লিনিকে রোগীদের সাথে এবং অনেক সকাল নীরবে কুশনে বসে কাটিয়েছেন।",
        "আমরা লিখি যেখানে মনের দুটি মহান ঐতিহ্য মিলিত হয়: বুদ্ধের ধ্যানময় উত্তরাধিকার এবং আধুনিক মনোরোগবিদ্যার প্রমাণ-ভিত্তিক বিজ্ঞান। আমাদের লক্ষ্য চিকিৎসার নির্দেশনা দেওয়া নয় বরং প্রতিফলন — পথের নোট — মৃদুভাবে দেওয়া।",
        "এই সাইটটি বৌদ্ধ মনোবিজ্ঞান, মননশীলতা, ধ্যান এবং মানসিক স্বাস্থ্যের উপর বই, নিবন্ধ এবং কোর্স সরবরাহ করে। সমস্ত বিষয়বস্তু ইংরেজি এবং বাংলায় দ্বিভাষিক, যা এই অঞ্চলের সমৃদ্ধ সাংস্কৃতিক ঐতিহ্যকে প্রতিফলিত করে যেখানে এই ঐতিহ্যগুলি সহস্রাব্দ ধরে বিকাশ লাভ করেছে।",
    ),
    "visible": True, "sort_order": 0,
    "seo_title": "About Bodhi Mitra — A Friend on the Path",
    "seo_description": "Learn about Bodhi Mitra, a bilingual journal exploring Buddhist psychology, mindfulness, and mental health through the lens of practicing psychiatrists.",
}

# --- Course ---
course = {
    "title_en": "Foundations of Buddhist Meditation",
    "title_bn": "বৌদ্ধ ধ্যানের ভিত্তি",
    "slug": "foundations-of-buddhist-meditation",
    "description_en": blocks_multiple(
        "A comprehensive introduction to Buddhist meditation practice. This course covers the essential teachings and techniques needed to establish a sustainable meditation practice.",
        "Over the course of 10 lessons, you will learn about posture, breath awareness, body scanning, loving-kindness meditation, and how to integrate mindfulness into daily life.",
    ),
    "description_bn": blocks_multiple(
        "বৌদ্ধ ধ্যান অনুশীলনের একটি বিস্তৃত ভূমিকা। এই কোর্সটি একটি টেকসই ধ্যান অনুশীলন প্রতিষ্ঠার জন্য প্রয়োজনীয় প্রয়োজনীয় শিক্ষা এবং কৌশলগুলি কভার করে।",
        "১০ টি পাঠের কোর্সে, আপনি ভঙ্গি, শ্বাস সচেতনতা, বডি স্ক্যানিং, মৈত্রী ধ্যান এবং দৈনন্দিন জীবনে মননশীলতাকে কীভাবে সংহত করবেন সে সম্পর্কে শিখবেন।",
    ),
    "price": 0, "is_free": True,
    "course_status": "published", "sort_order": 0,
    "lessons": [
        {"title": "Introduction to Meditation", "duration": 15, "video_url": ""},
        {"title": "Posture and Breath", "duration": 20, "video_url": ""},
        {"title": "Mindfulness of Body", "duration": 25, "video_url": ""},
        {"title": "Mindfulness of Feelings", "duration": 20, "video_url": ""},
        {"title": "Mindfulness of Mind", "duration": 25, "video_url": ""},
        {"title": "Mindfulness of Dharmas", "duration": 30, "video_url": ""},
        {"title": "Loving-Kindness Meditation", "duration": 25, "video_url": ""},
        {"title": "Walking Meditation", "duration": 15, "video_url": ""},
        {"title": "Integrating Mindfulness into Daily Life", "duration": 20, "video_url": ""},
        {"title": "Bringing It All Together", "duration": 30, "video_url": ""},
    ],
}

# --- Video ---
video = {
    "title_en": "Guided Metta Bhavana (Loving-Kindness Meditation)",
    "title_bn": "নির্দেশিত মৈত্রী ভাবনা (মৈত্রী ধ্যান)",
    "slug": "guided-metta-bhavana",
    "description_en": "A 30-minute guided loving-kindness meditation led by Bhante Sujato. Suitable for both beginners and experienced practitioners.",
    "description_bn": "ভান্তে সুজাতোর নেতৃত্বে একটি ৩০ মিনিটের নির্দেশিত মৈত্রী ধ্যান। নতুন এবং অভিজ্ঞ উভয় অনুশীলনকারীদের জন্য উপযুক্ত।",
    "embed_url": "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "duration": 1800, "sort_order": 0,
}


# ============================================================
# INSERTION LOGIC
# ============================================================
db = sqlite3.connect(str(DB))
cur = db.cursor()

# -- Categories --
cat_ids = []
for c in categories:
    did = docid()
    cur.execute(
        "INSERT INTO categories (document_id, name_en, name_bn, slug, color, visible, sort_order, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (did, c["name_en"], c["name_bn"], c["slug"], c["color"], c["visible"], c["sort_order"], now, now, now),
    )
    cat_ids.append(cur.lastrowid)
print(f"Created {len(cat_ids)} categories")

# -- Tags --
tag_ids = []
for t in tags:
    did = docid()
    cur.execute(
        "INSERT INTO tags (document_id, name_en, name_bn, slug, color, created_at, updated_at, published_at) VALUES (?,?,?,?,?,?,?,?)",
        (did, t["name_en"], t["name_bn"], t["slug"], t["color"], now, now, now),
    )
    tag_ids.append(cur.lastrowid)
print(f"Created {len(tag_ids)} tags")

# -- Books --
for b in books:
    did = docid()
    cur.execute(
        """INSERT INTO books
        (document_id, title_en, title_bn, slug, description_en, description_bn, author_name,
         price, currency, is_free, book_status, rating, rating_count, featured, sort_order,
         created_at, updated_at, published_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            did, b["title_en"], b["title_bn"], b["slug"],
            json.dumps(b["description_en"], ensure_ascii=False),
            json.dumps(b["description_bn"], ensure_ascii=False),
            b["author_name"], b["price"], b["currency"], b["is_free"],
            b["book_status"], b["rating"], b["rating_count"], b["featured"], b["sort_order"],
            now, now, now,
        ),
    )
    book_id = cur.lastrowid
    # Link categories
    for ord_i, ci in enumerate(b.get("categories", [])):
        cur.execute(
            "INSERT INTO books_categories_lnk (book_id, category_id, category_ord) VALUES (?,?,?)",
            (book_id, cat_ids[ci], ord_i),
        )
    # Link tags
    for ord_i, ti in enumerate(b.get("tags", [])):
        cur.execute(
            "INSERT INTO books_tags_lnk (book_id, tag_id, tag_ord) VALUES (?,?,?)",
            (book_id, tag_ids[ti], ord_i),
        )
print(f"Created {len(books)} books")

# -- Posts --
for p in posts:
    did = docid()
    cur.execute(
        """INSERT INTO posts
        (document_id, title_en, title_bn, slug, content_en, content_bn, excerpt_en, excerpt_bn,
         author, reading_time, featured, sort_order, created_at, updated_at, published_at)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            did, p["title_en"], p["title_bn"], p["slug"],
            json.dumps(p["content_en"], ensure_ascii=False),
            json.dumps(p["content_bn"], ensure_ascii=False),
            p["excerpt_en"], p["excerpt_bn"], p["author"],
            p["reading_time"], p["featured"], p["sort_order"],
            now, now, now,
        ),
    )
    post_id = cur.lastrowid
    for ord_i, ci in enumerate(p.get("categories", [])):
        cur.execute(
            "INSERT INTO posts_categories_lnk (post_id, category_id, category_ord) VALUES (?,?,?)",
            (post_id, cat_ids[ci], ord_i),
        )
    for ord_i, ti in enumerate(p.get("tags", [])):
        cur.execute(
            "INSERT INTO posts_tags_lnk (post_id, tag_id, tag_ord) VALUES (?,?,?)",
            (post_id, tag_ids[ti], ord_i),
        )
print(f"Created {len(posts)} posts")

# -- Page --
page_did = docid()
cur.execute(
    """INSERT INTO pages
    (document_id, title_en, title_bn, slug, content_en, content_bn,
     visible, sort_order, seo_title, seo_description,
     created_at, updated_at, published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    (
        page_did, page["title_en"], page["title_bn"], page["slug"],
        json.dumps(page["content_en"], ensure_ascii=False),
        json.dumps(page["content_bn"], ensure_ascii=False),
        page["visible"], page["sort_order"],
        page["seo_title"], page["seo_description"],
        now, now, now,
    ),
)
print("Created 1 page")

# -- Course --
course_did = docid()
cur.execute(
    """INSERT INTO courses
    (document_id, title_en, title_bn, slug, description_en, description_bn,
     price, is_free, course_status, sort_order, lessons,
     created_at, updated_at, published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
    (
        course_did, course["title_en"], course["title_bn"], course["slug"],
        json.dumps(course["description_en"], ensure_ascii=False),
        json.dumps(course["description_bn"], ensure_ascii=False),
        course["price"], course["is_free"], course["course_status"], course["sort_order"],
        json.dumps(course["lessons"], ensure_ascii=False),
        now, now, now,
    ),
)
print("Created 1 course")

# -- Video --
video_did = docid()
cur.execute(
    """INSERT INTO videos
    (document_id, title_en, title_bn, slug, description_en, description_bn,
     embed_url, duration, sort_order,
     created_at, updated_at, published_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
    (
        video_did, video["title_en"], video["title_bn"], video["slug"],
        video["description_en"], video["description_bn"],
        video["embed_url"], video["duration"], video["sort_order"],
        now, now, now,
    ),
)
print("Created 1 video")

db.commit()
db.close()
print("DONE — All content seeded successfully!")
