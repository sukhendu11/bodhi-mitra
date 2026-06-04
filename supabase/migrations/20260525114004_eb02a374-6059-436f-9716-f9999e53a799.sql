UPDATE public.posts SET cover_image = CASE category
  WHEN 'Buddhist Psychology' THEN 'https://images.unsplash.com/photo-1545389336-cf090694435e?w=1200&q=80'
  WHEN 'Wisdom' THEN 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=1200&q=80'
  WHEN 'Books' THEN 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80'
END
WHERE cover_image IS NULL;