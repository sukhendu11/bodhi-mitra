# Phase 12 — Forms, Communication & Notifications

## Overview
Production-harden the communication layer: email templates, newsletter management, notification persistence, contact form hardening, and admin email configuration.

## Current State (from exploration)
- **Contact form**: bilingual, DB storage, admin inbox, Resend notification to admin — NO confirmation email to submitter, NO server-side Zod validation, NO rate limiting
- **Newsletter**: subscribe + DB, feature flag, NO unsubscribe flow, NO admin management, NO welcome email
- **Comments**: CRUD, threaded, admin moderation, real-time bell (in-memory only)
- **Email**: 2 inline HTML templates (contact notification, purchase confirmation), both using `onboarding@resend.dev`
- **Notifications**: Sonner toasts (transient) + in-memory `useAdminNotifications()` — lost on page refresh
- **Form engine**: 26 field types, React Hook Form + Zod in some routes, Zod missing on contact/newsletter forms

---

## Task Priority Order

### T1: Email Template System + Refactor Existing Emails
**Impact**: HIGH — eliminates duplicate HTML, adds subscriber-facing emails
**Effort**: Medium

### T2: Newsletter Unsubscribe + Welcome Email
**Impact**: HIGH — legal compliance (CAN-SPAM/GDPR), subscriber trust
**Effort**: Medium

### T3: Newsletter Admin Management
**Impact**: HIGH — admins need visibility into subscriber base
**Effort**: Low-Medium

### T4: Notification DB Persistence
**Impact**: MEDIUM-HIGH — notifications lost on refresh is a real UX problem
**Effort**: Medium

### T5: Contact Form Zod Validation + Rate Limiting
**Impact**: MEDIUM — prevents spam, improves data quality
**Effort**: Low

### T6: Email Settings in Admin Panel
**Impact**: MEDIUM — currently requires env var editing for sender domain
**Effort**: Low

### T7: Contact Confirmation Email (to submitter)
**Impact**: MEDIUM — good UX, confirms receipt
**Effort**: Low (uses T1 template system)

---

## Detailed Task Specifications

---

### T1: Email Template System + Refactor Existing Emails

**Goal**: Create a shared email template system, refactor existing emails to use it.

#### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/email/templates.ts` | Template registry + types: `EmailTemplate`, `EmailTemplateData`, `renderEmailTemplate()` |
| `src/lib/email/base-layout.ts` | Shared HTML wrapper: header, body, footer, BM branding, responsive styles |
| `src/lib/email/send.ts` | `sendEmail({ to, subject, template, data, replyTo? })` — single entry point wrapping Resend |
| `src/lib/email/templates/contact-notification.ts` | Template: admin notified of contact submission |
| `src/lib/email/templates/contact-confirmation.ts` | Template: submitter confirmation (T7) |
| `src/lib/email/templates/purchase-confirmation.ts` | Template: purchase receipt (refactor from `purchase-emails.ts`) |
| `src/lib/email/templates/newsletter-welcome.ts` | Template: new subscriber welcome (T2) |
| `src/lib/email/templates/newsletter-unsubscribe-confirm.ts` | Template: unsubscribe confirmed (T2) |
| `src/lib/email/__tests__/templates.test.ts` | Unit tests for template rendering |

#### Files to Modify
| File | Change |
|------|--------|
| `src/lib/contact-notification.ts` | Rewrite to use `sendEmail()` + template registry |
| `src/lib/purchase-emails.ts` | Rewrite to use `sendEmail()` + template registry |
| `src/lib/newsletter.ts` | Add welcome email dispatch after subscribe |

#### Architecture
```typescript
// src/lib/email/templates.ts
type EmailTemplate =
  | "contact-notification"
  | "contact-confirmation"
  | "purchase-confirmation"
  | "newsletter-welcome"
  | "newsletter-unsubscribe-confirm";

interface EmailTemplateData {
  "contact-notification": { name: string; email: string; message: string };
  "contact-confirmation": { name: string; message: string };
  "purchase-confirmation": { userName: string; bookTitle: string; amountPaid: number; isFree: boolean; readerUrl: string; libraryUrl: string; bookUrl: string };
  "newsletter-welcome": { email: string };
  "newsletter-unsubscribe-confirm": { email: string };
}

function renderEmailTemplate<T extends EmailTemplate>(
  template: T,
  data: EmailTemplateData[T]
): { html: string; text: string; subject: string }
```

#### Base Layout Pattern
```html
<!-- Shared wrapper: BM logo, max-width 600px, system font, responsive -->
<div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
  <!-- Header: BM logo mark -->
  <div style="text-align: center; margin-bottom: 24px;">...</div>
  <!-- Body: slot content from template -->
  ${bodyContent}
  <!-- Footer: site name + tagline -->
  <p style="font-size: 12px; color: #999; text-align: center;">Bodhi Mitra</p>
</div>
```

#### Template Subjects
| Template | Subject |
|----------|---------|
| `contact-notification` | `New Contact Message from {name}` |
| `contact-confirmation` | `We received your message — Bodhi Mitra` |
| `purchase-confirmation` | `You now own "{bookTitle}" — Bodhi Mitra` |
| `newsletter-welcome` | `Welcome to Bodhi Mitra newsletter` |
| `newsletter-unsubscribe-confirm` | `You've been unsubscribed — Bodhi Mitra` |

#### Verification
- [ ] All 5 templates render valid HTML
- [ ] `sendEmail()` gracefully skips when Resend unconfigured
- [ ] Existing `sendContactNotification` and `sendPurchaseConfirmation` still work after refactor
- [ ] `escapeHtml()` used on all user data in templates
- [ ] Plain text fallback generated for each template

---

### T2: Newsletter Unsubscribe Flow + Welcome Email

**Goal**: Legal-compliant unsubscribe + welcome email on subscription.

#### Database Changes
Migration: `supabase/migrations/20260714000003_add_newsletter_unsubscribe_token.sql`
```sql
-- Add unsubscribe token for secure token-based unsubscribing
ALTER TABLE public.newsletter_subscribers
  ADD COLUMN IF NOT EXISTS unsubscribe_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Index for fast token lookup
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_token
  ON public.newsletter_subscribers (unsubscribe_token)
  WHERE active = true;
```

#### Files to Create
| File | Purpose |
|------|---------|
| `src/routes/newsletter.unsubscribe.$token.tsx` | Public route: token-based unsubscribe page (bilingual) |

#### Files to Modify
| File | Change |
|------|--------|
| `src/lib/newsletter.ts` | Add: `generateUnsubscribeToken()`, `unsubscribeFromNewsletter(token)`, `sendNewsletterWelcomeEmail()`, `sendUnsubscribeConfirmation()` |
| `src/lib/newsletter.ts` | Update `subscribeToNewsletter` to generate token + send welcome email |

#### Unsubscribe Flow
1. Admin emails subscriber with link: `{siteUrl}/newsletter/unsubscribe/{token}`
2. User clicks link → public page renders
3. Page calls `unsubscribeFromNewsletter(token)` server function
4. Server sets `active = false`, `unsubscribed_at = now()`
5. Shows bilingual success page with option to resubscribe

#### Welcome Email Flow
1. `subscribeToNewsletter` succeeds
2. Call `sendNewsletterWelcomeEmail(email)` via T1's `sendEmail()`
3. Email contains: welcome message, unsubscribe link, site link

#### Files to Create Detail
```tsx
// src/routes/newsletter.unsubscribe.$token.tsx
// - TanStack Router file route
// - Calls unsubscribeFromNewsletter(token) on mount
// - Bilingual success/error states
// - Link back to homepage
```

#### Verification
- [ ] Valid token → sets `active = false`, shows success
- [ ] Invalid/expired token → shows error page
- [ ] Already unsubscribed → shows "already unsubscribed" message
- [ ] Welcome email sent on new subscription
- [ ] Unsubscribe confirmation email sent
- [ ] Token is 64-char hex (32 bytes random)

---

### T3: Newsletter Admin Management

**Goal**: Admin UI to view, search, export, and delete newsletter subscribers.

#### Files to Create
| File | Purpose |
|------|---------|
| `src/components/SettingsNewsletterTab.tsx` | Admin tab in Settings: subscriber list, stats, export, delete |
| `src/lib/admin-newsletter.ts` | Server functions: `fetchNewsletterSubscribers`, `getNewsletterStats`, `deleteNewsletterSubscriber`, `exportNewsletterSubscribers` |

#### Files to Modify
| File | Change |
|------|--------|
| `src/routes/admin.settings.tsx` | Add "Newsletter" tab to TABS array |
| `src/components/SettingsArticleTab.tsx` | Remove newsletter title/text fields (move to SettingsNewsletterTab) |

#### Admin Newsletter Tab Features
- **Stats**: Total subscribers, Active, Unsubscribed, New this week
- **Subscriber list**: Paginated table (email, subscribed date, status, actions)
- **Search**: Filter by email
- **Actions**: Delete subscriber (with confirmation), copy email
- **Export**: CSV download of all active subscribers
- **Quick link**: Copy newsletter unsubscribe page URL for manual inclusion in emails

#### Server Functions
```typescript
// src/lib/admin-newsletter.ts
fetchNewsletterSubscribers(page, pageSize, { search?, activeOnly? })
getNewsletterStats(): Promise<{ total; active; unsubscribed; newThisWeek }>
deleteNewsletterSubscriber(id): Promise<void>
exportNewsletterSubscribers(): Promise<{ email; created_at; active }[]>
```

#### RLS Policies (migration update)
```sql
-- Admins can delete newsletter subscribers
CREATE POLICY "Admins can delete newsletter subscribers"
  ON public.newsletter_subscribers FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));
```

#### Verification
- [ ] Subscriber list loads with pagination
- [ ] Search filters by email
- [ ] Delete removes subscriber (with confirmation dialog)
- [ ] Export downloads CSV
- [ ] Stats show correct counts
- [ ] Only admins can access (RLS enforced)

---

### T4: Notification DB Persistence

**Goal**: Persist admin notifications to DB so they survive page refresh.

#### Database Changes
Migration: `supabase/migrations/20260714000004_create_admin_notifications.sql`
```sql
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('new_comment', 'comment_reply', 'contact_message', 'new_purchase')),
  message TEXT NOT NULL,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can read notifications
CREATE POLICY "Admins can read notifications"
  ON public.admin_notifications FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));

-- Only admins can insert notifications (server-side)
CREATE POLICY "Admins can insert notifications"
  ON public.admin_notifications FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));

-- Only admins can update (mark read)
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON public.admin_notifications FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  ));

-- Auto-cleanup: delete notifications older than 30 days
SELECT cron.schedule(
  'cleanup-old-notifications',
  '0 3 * * *',
  $$DELETE FROM public.admin_notifications WHERE created_at < now() - interval '30 days'$$
);
```

#### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/admin-notifications.ts` | Server functions: `fetchAdminNotifications`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`, `createAdminNotification`, `getUnreadNotificationCount` |

#### Files to Modify
| File | Change |
|------|--------|
| `src/lib/notifications.ts` | Rewrite `useAdminNotifications()` to fetch from DB + subscribe to Realtime for inserts |
| `src/components/notification-bell.tsx` | Update to use persisted notifications, add mark-read per-item, delete |
| `src/lib/comment-functions.ts` | After comment add, call `createAdminNotification()` |
| `src/routes/contact.tsx` | After message save, call `createAdminNotification({ type: 'contact_message', ... })` |
| `src/routes/api/stripe-webhook.ts` | After purchase, call `createAdminNotification({ type: 'new_purchase', ... })` |

#### Migration from In-Memory
1. `useAdminNotifications()` changes:
   - On mount: `fetchAdminNotifications()` via TanStack Query
   - Subscribe to Realtime INSERT on `admin_notifications` table
   - `markAllRead()` calls server function + updates query cache
   - Remove the old `useSubscription` on `comments` table (replaced by DB triggers)
2. Notification bell: add per-item "mark read" click, add delete button

#### Realtime Integration
```typescript
// Instead of subscribing to comments table INSERT,
// subscribe to admin_notifications table INSERT
useSubscription({
  table: "admin_notifications",
  event: "INSERT",
  onPayload: (payload) => {
    // Add to query cache immediately
    queryClient.setQueryData(['admin-notifications'], (old) => [payload.new, ...old]);
  },
});
```

#### Verification
- [ ] Notifications persist across page refresh
- [ ] New comment creates DB notification
- [ ] New contact message creates DB notification
- [ ] New purchase creates DB notification
- [ ] Mark read works per-item and bulk
- [ ] Notifications auto-cleanup after 30 days
- [ ] Realtime still works for instant notification appearance
- [ ] Bell badge shows correct unread count from DB

---

### T5: Contact Form Zod Validation + Rate Limiting

**Goal**: Server-side validation + spam prevention on contact form.

#### Files to Create
| File | Purpose |
|------|---------|
| `src/lib/schemas/contact.ts` | Zod schema: `contactFormSchema` (name: 2-100 chars, email: valid format, message: 10-5000 chars) |

#### Files to Modify
| File | Change |
|------|--------|
| `src/routes/contact.tsx` | Integrate React Hook Form + zodResolver, use `contactFormSchema` |
| `src/lib/contact-notification.ts` | Add Zod validation on input before processing |
| `src/lib/newsletter.ts` | Add Zod validation on email input |

#### Schema
```typescript
// src/lib/schemas/contact.ts
import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
```

#### Rate Limiting (Simple)
Use a client-side + server-side approach without external dependencies:

```typescript
// Server-side: track submissions per IP in a Map (resets on server restart)
const submissionTracker = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxPerHour = 5): boolean {
  const now = Date.now();
  const record = submissionTracker.get(ip);
  if (!record || now > record.resetAt) {
    submissionTracker.set(ip, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (record.count >= maxPerHour) return false;
  record.count++;
  return true;
}
```

#### Contact Form Refactor
```tsx
// Before: plain HTML form with manual validation
// After:
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { contactFormSchema, type ContactFormValues } from "@/lib/schemas/contact";

const form = useForm<ContactFormValues>({
  resolver: zodResolver(contactFormSchema),
  defaultValues: { name: "", email: "", message: "" },
});
```

#### Verification
- [ ] Submitting empty form shows validation errors
- [ ] Short name (< 2 chars) rejected
- [ ] Invalid email rejected
- [ ] Short message (< 10 chars) rejected
- [ ] Server rejects invalid data even if client validation bypassed
- [ ] Rate limit blocks > 5 submissions/hour from same IP
- [ ] Form still works with bilingual labels from SiteConfig

---

### T6: Email Settings in Admin Panel

**Goal**: Configure email sender, admin recipient, and Resend API key from admin UI.

#### Files to Create
| File | Purpose |
|------|---------|
| `src/components/SettingsEmailTab.tsx` | Admin tab: email settings (sender name, sender email, admin recipient, API key status) |

#### Files to Modify
| File | Change |
|------|--------|
| `src/routes/admin.settings.tsx` | Add "Email" tab to TABS array |
| `src/lib/siteSettings.tsx` | Add `email` group to `SiteConfig` |

#### SiteConfig Extension
```typescript
// In SiteConfig interface
email: {
  /** Sender display name for emails */
  sender_name: string;
  /** Sender email address (must be verified in Resend) */
  sender_email: string;
  /** Admin notification recipient */
  admin_email: string;
  /** Reply-to address for admin notifications */
  reply_to: string;
  /** Enable/disable email sending entirely */
  enabled: boolean;
};
```

#### Email Tab Features
- **Sender settings**: Name + email (with note about Resend domain verification)
- **Admin recipient**: Where contact notifications go
- **Reply-to**: For contact form replies
- **Status indicator**: Green badge if RESEND_API_KEY is set, red if not
- **Test email button**: Sends a test email to verify configuration
- **Save**: Persists to SiteConfig (email settings are display-only; actual API key stays in env)

#### Note
The actual `RESEND_API_KEY` stays in `.env` (security). The admin panel configures the sender/receiver addresses stored in `SiteConfig.email`. The `sendEmail()` function from T1 reads from `SiteConfig.email` for sender/receiver, falling back to env vars.

#### Verification
- [ ] Email tab appears in settings
- [ ] Sender name/email configurable
- [ ] Admin email configurable
- [ ] Status badge shows Resend connection state
- [ ] Test email sends successfully
- [ ] Settings persist and apply to outgoing emails

---

### T7: Contact Confirmation Email (to Submitter)

**Goal**: Auto-reply to contact form submitter confirming receipt.

#### Files to Modify
| File | Change |
|------|--------|
| `src/routes/contact.tsx` | After saving message, call `sendEmail({ to: email, template: 'contact-confirmation', ... })` |
| `src/lib/contact-notification.ts` | Add confirmation email dispatch alongside admin notification |

#### Flow
1. User submits contact form
2. Message saved to `contact_messages` table
3. `sendContactNotification()` fires (admin notification) — existing
4. `sendContactConfirmation({ name, email, message })` fires — NEW
5. User sees success message (bilingual, from SiteConfig)

#### Verification
- [ ] Submitting contact form sends confirmation to submitter's email
- [ ] Confirmation email has bilingual content
- [ ] Confirmation email includes unsubscribe link (for future newsletters)
- [ ] Email failure doesn't block form submission
- [ ] Rate limiting applies to confirmation emails too

---

## Implementation Order

| Order | Task | Dependencies | Estimated Files |
|-------|------|-------------|-----------------|
| 1 | T1: Email Template System | None | 10 create, 2 modify |
| 2 | T5: Contact Form Zod + Rate Limit | None | 1 create, 2 modify |
| 3 | T7: Contact Confirmation Email | T1 | 0 create, 2 modify |
| 4 | T2: Newsletter Unsubscribe + Welcome | T1 | 1 create, 1 modify |
| 5 | T3: Newsletter Admin Management | T2 | 2 create, 2 modify |
| 6 | T6: Email Settings in Admin | T1 | 1 create, 2 modify |
| 7 | T4: Notification DB Persistence | None | 1 create, 4 modify |

**Total**: ~16 new files, ~15 modified files, 4 database migrations

---

## Database Migrations Summary

| Migration | Table | Purpose |
|-----------|-------|---------|
| `20260714000003_add_newsletter_unsubscribe_token.sql` | `newsletter_subscribers` | Add `unsubscribe_token` column + index |
| `20260714000004_create_admin_notifications.sql` | `admin_notifications` | New table for persisted notifications + RLS + auto-cleanup |
| `20260714000005_add_newsletter_delete_policy.sql` | `newsletter_subscribers` | Add DELETE RLS policy for admins |
| `20260714000006_add_email_settings_to_site_config.sql` | `site_settings` | Add `email` group to config JSONB |

---

## Integration Points

| Integration | Connection |
|-------------|------------|
| **Resend** | `src/integrations/resend/client.ts` → `sendEmail()` in `src/lib/email/send.ts` |
| **Supabase** | Server functions use `supabaseAdmin` for RLS bypass on notification CRUD |
| **SiteConfig** | `email` group read by `sendEmail()` for sender/receiver addresses |
| **Feature flags** | `newsletter_automation` flag gates welcome email + footer signup widget |
| **Bilingual** | All email templates use `pickLocalized()` pattern for EN/BN content |
| **TanStack Query** | Notifications fetched via `useQuery`, cache updated on Realtime events |
| **React Hook Form** | Contact form + newsletter form use `zodResolver` |
| **Sonner** | `notify.success/error` for form submissions + admin actions |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Resend API key not configured | All email functions gracefully skip with console.warn |
| Invalid email templates | `escapeHtml()` on all user data, Zod validation on inputs |
| Notification DB bloat | Auto-cleanup cron job (30 days), pagination on fetch |
| Rate limit bypass | Server-side tracking + client-side UX feedback |
| Unsubscribe token leak | Tokens are 32-byte random, one-time use, DB indexed |

---

## Verification Checklist

### Build & Type Safety
- [ ] `tsc --noEmit` — 0 TypeScript errors
- [ ] All new files have proper imports
- [ ] No `as any` casts on new code

### Tests
- [ ] Email template rendering tests (5 templates × html + text)
- [ ] Contact form validation tests (schema edge cases)
- [ ] Newsletter subscribe/unsubscribe tests
- [ ] Rate limiting tests
- [ ] Admin notification CRUD tests
- [ ] Target: 319 → 380+ tests

### Manual Testing
- [ ] Submit contact form → check admin inbox + submitter email
- [ ] Subscribe to newsletter → check welcome email
- [ ] Click unsubscribe link → check success page
- [ ] Admin: view/delete newsletter subscribers
- [ ] Admin: notifications persist after page refresh
- [ ] Admin: email settings save and apply
- [ ] Rate limit: submit 6th time → blocked

### Bilingual
- [ ] All new email templates have EN/BN variants
- [ ] Unsubscribe page is bilingual
- [ ] Newsletter admin tab uses bilingual labels
- [ ] Contact confirmation email is bilingual

### Security
- [ ] `escapeHtml()` on all template interpolations
- [ ] Unsubscribe tokens are cryptographically random
- [ ] RLS policies enforce admin-only access on notifications
- [ ] Rate limiting prevents spam
- [ ] No secrets in client-side code
