import type { SiteConfig } from "@/lib/siteSettings";
import { Field, FieldRow, Section } from "@/components/SettingsFields";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface TabProps {
  cfg: SiteConfig;
  update: <K extends keyof SiteConfig>(group: K, patch: Partial<SiteConfig[K]>) => void;
}

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "BDT", symbol: "৳", label: "Bangladeshi Taka" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
  { code: "CAD", symbol: "C$", label: "Canadian Dollar" },
];

export function CommerceTab({ cfg, update }: TabProps) {
  return (
    <>
      <Section title="Currency" desc="Default currency for book pricing and purchases.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Currency</Label>
            <select
              value={cfg.commerce.currency}
              onChange={(e) => {
                const curr = CURRENCIES.find((c) => c.code === e.target.value);
                update("commerce", {
                  currency: e.target.value,
                  currency_symbol: curr?.symbol ?? "$",
                });
              }}
              className="w-full px-3 py-2 text-sm border border-border/60 rounded-lg bg-background focus:outline-none focus:border-foreground/40"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} — {c.label} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/40">
            <span className="text-lg font-semibold">{cfg.commerce.currency_symbol}</span>
            <span className="text-sm text-muted-foreground">
              Preview: {cfg.commerce.currency_symbol}25.00
            </span>
          </div>
        </div>
      </Section>

      <Section title="Tax" desc="Tax rate applied to purchases (Stripe handles collection).">
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">
            Tax Rate: <span className="font-mono">{cfg.commerce.tax_rate}%</span>
          </Label>
          <Slider
            min={0}
            max={30}
            step={0.5}
            value={[cfg.commerce.tax_rate]}
            onValueChange={([v]) => update("commerce", { tax_rate: v })}
          />
          <p className="text-xs text-muted-foreground">
            {cfg.commerce.tax_rate === 0
              ? "No tax applied"
              : `${cfg.commerce.tax_rate}% tax on all purchases (e.g., ${cfg.commerce.currency_symbol}25.00 → ${cfg.commerce.currency_symbol}${(25 * (1 + cfg.commerce.tax_rate / 100)).toFixed(2)})`}
          </p>
        </div>
      </Section>

      <Section title="Refund Policy" desc="Displayed on checkout and purchase confirmation pages.">
        <div className="space-y-4">
          <Field
            label="Refund Policy (English)"
            value={cfg.commerce.refund_policy_en}
            onChange={(v) => update("commerce", { refund_policy_en: v })}
            placeholder="Digital purchases are non-refundable once the PDF has been accessed."
          />
          <Field
            label="Refund Policy (Bangla)"
            value={cfg.commerce.refund_policy_bn}
            onChange={(v) => update("commerce", { refund_policy_bn: v })}
            placeholder="ডিজিটাল ক্রয় PDF অ্যাক্সেস করার পর ফেরত দেওয়া যায় না।"
          />
        </div>
      </Section>
    </>
  );
}
