import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSiteSettings } from "@/lib/siteSettings";
import { useLang, pickLocalized } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Bodhi Mitra" },
      { name: "description", content: "Get in touch with Bodhi Mitra." },
      { property: "og:title", content: "Contact — Bodhi Mitra" },
      { property: "og:description", content: "Get in touch with Bodhi Mitra." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const cfg = useSiteSettings();
  const { lang } = useLang();
  const c = cfg.contact;
  const [sent, setSent] = useState(false);

  const title = pickLocalized(c.title_en, c.title_bn, lang, "Contact");
  const intro = pickLocalized(c.intro_en, c.intro_bn, lang, "");
  const nameLabel = pickLocalized(c.form_name_label_en, c.form_name_label_bn, lang, "Name");
  const emailLabel = pickLocalized(c.form_email_label_en, c.form_email_label_bn, lang, "Email");
  const msgLabel = pickLocalized(c.form_message_label_en, c.form_message_label_bn, lang, "Message");
  const submitLabel = pickLocalized(c.submit_label_en, c.submit_label_bn, lang, "Send");
  const successText = pickLocalized(c.success_text_en, c.success_text_bn, lang, "Thank you.");
  const address = pickLocalized(c.address_en, c.address_bn, lang, c.location);

  const mailto = c.email
    ? `mailto:${c.email}?subject=${encodeURIComponent("Note via Bodhi Mitra")}`
    : "";

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 md:py-28">
      <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-5">Contact</p>
      <h1 className="font-serif text-4xl md:text-5xl leading-tight">{title}</h1>
      {intro && <p className="mt-6 text-muted-foreground leading-relaxed text-lg max-w-2xl">{intro}</p>}

      <div className="mt-14 grid gap-12 md:grid-cols-[1fr_280px]">
        <form
          className="space-y-5"
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            if (c.email) {
              const body = `${data.get("name")}\n${data.get("email")}\n\n${data.get("message")}`;
              window.location.href = `mailto:${c.email}?subject=${encodeURIComponent("Note via Bodhi Mitra")}&body=${encodeURIComponent(body)}`;
            }
            setSent(true);
          }}
        >
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">{nameLabel}</label>
            <Input name="name" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">{emailLabel}</label>
            <Input name="email" type="email" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">{msgLabel}</label>
            <Textarea name="message" rows={6} required />
          </div>
          <Button type="submit">{submitLabel}</Button>
          {sent && <p className="text-sm text-muted-foreground">{successText}</p>}
        </form>

        <aside className="space-y-4 text-sm text-muted-foreground">
          {c.email && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1">Email</p>
              <a className="text-foreground hover:underline" href={mailto}>{c.email}</a>
            </div>
          )}
          {c.phone && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1">Phone</p>
              <p className="text-foreground">{c.phone}</p>
            </div>
          )}
          {address && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-1">Location</p>
              <p className="text-foreground whitespace-pre-line">{address}</p>
            </div>
          )}
        </aside>
      </div>

      {c.map_embed_url && (
        <div className="mt-16 aspect-[16/8] w-full overflow-hidden rounded-md border border-border">
          <iframe
            src={c.map_embed_url}
            title="Location map"
            className="w-full h-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
    </div>
  );
}
