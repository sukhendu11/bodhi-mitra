/**
 * CheckoutPaymentDialog — simulated payment modal for mock mode (M2 E2.1).
 *
 * Thin wrapper around the shared `PaymentForm` for cart-page checkout. The
 * one-page /checkout route also uses PaymentForm directly.
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PaymentForm, type PaymentFormProps } from "./PaymentForm";
import { useLang } from "@/lib/i18n";

export interface CheckoutPaymentDialogProps extends Omit<PaymentFormProps, "onSuccess"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutPaymentDialog({
  open,
  onOpenChange,
  amount,
  itemCount,
  discount,
  tax,
  taxRate,
  orderId,
}: CheckoutPaymentDialogProps) {
  const { lang } = useLang();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl text-center">
            {lang === "bn" ? "আপনার পেমেন্ট সম্পূর্ণ করুন" : "Complete your payment"}
          </DialogTitle>
        </DialogHeader>
        <PaymentForm
          amount={amount}
          itemCount={itemCount}
          discount={discount}
          tax={tax}
          taxRate={taxRate}
          orderId={orderId}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}