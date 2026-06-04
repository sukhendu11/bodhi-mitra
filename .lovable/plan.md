## Full-Site Customizer Upgrade

Extend the existing `site_settings` JSON config and Site Customizer to give the admin tabbed, bilingual control over every page on the site.

### 1. Extend `SiteConfig` schema (`src/lib/siteSettings.tsx`)

Add new groups to `SiteConfig` (and `DEFAULT_CONFIG`), all stored in the existing `site_settings.config` JSON column — no SQL migration needed since it's already `jsonb`:

- `article` — `show_author_bio`, `show_related_posts`, `sidebar_title_en/bn`, `sidebar_text_en/bn`, `newsletter_title_en/bn`, `newsletter_text_en/bn`
- `about` — `title_en/bn`, `body_en/bn` (rich text), `mission_en/bn`, `image_url`, `image_alt_en/bn`
- `contact` — `title_en/bn`, `intro_en/bn`, `form_name_label_en/bn`, `form_email_label_en/bn`, `form_message_label_en/bn`, `submit_label_en/bn`, `success_text_en/bn`, `email`, `phone`, `address_en/bn`, `map_embed_url`
- `pages` — array of `{ slug, title_en, title_bn, header_en, header_bn, body_en, body_bn, banner_url, visible }` for Satsang/Books/Wisdom/Buddhist-Psychology and any custom routes

`mergeConfig` already deep-merges per top-level key — keep that behavior.

### 2. Re-architect `/admin/settings` (`src/routes/admin.settings.tsx`)

Replace the current 6-tab strip with a clearly grouped tab set:

```
[ Branding ] [ Homepage ] [ Article Page ] [ About ] [ Contact ] [ Dynamic Pages ] [ Theme ] [ Nav & Footer ] [ Social ] [ SEO ]
```

- Reuse existing `Section`, `Field`, `TextareaField`, `ColorField`, `FileUploadField` helpers
- Add a `RichTextField` (multiline textarea with larger row count) for About body
- Dynamic Pages tab: list editable cards per page slug (`about`, `contact`, `books`, `wisdom`, `buddhist-psychology`, `satsang`); admin can edit header/body/banner per slug and toggle visibility
- Image uploads go to existing `site-assets` bucket via existing `uploadAsset` helper (extended to accept `kind: string`)

### 3. Wire pages to dynamic content

- `src/routes/about.tsx` — read `cfg.about.*` via `useSiteSettings()` + `useI18n()`; remove all hardcoded copy; render hero image, title, body, mission bilingually
- `src/routes/contact.tsx` — read `cfg.contact.*`; render bilingual form labels, intro, success text; show email/phone/address; embed map iframe from `map_embed_url`
- `src/routes/posts.$slug.tsx` — gate author bio / related posts on `cfg.article.show_*`; render sidebar widget + newsletter block from `cfg.article.*`
- `src/routes/books.tsx`, `wisdom.tsx`, `buddhist-psychology.tsx` — pull the matching entry from `cfg.pages[]` by slug for header/body/banner; respect `visible`

### 4. Bilingual rendering

Every page uses the existing `useI18n()` `lang` state to pick `_en` vs `_bn` fields, falling back to English when Bangla is empty.

### Notes

- No DB migration: `site_settings.config` is already `jsonb` and `mergeConfig` tolerates missing keys, so old saved configs keep working.
- No new storage bucket: reuse `site-assets`.
- Pure presentation/config work — no business logic changes.

### Files touched

- `src/lib/siteSettings.tsx` — extend `SiteConfig` + `DEFAULT_CONFIG`
- `src/routes/admin.settings.tsx` — add 4 new tabs and editors
- `src/routes/about.tsx`, `src/routes/contact.tsx`, `src/routes/posts.$slug.tsx`, `src/routes/books.tsx`, `src/routes/wisdom.tsx`, `src/routes/buddhist-psychology.tsx` — read from settings
