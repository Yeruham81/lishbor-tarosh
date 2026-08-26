import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { BadgeDollarSign, CheckCircle2, Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createPremiumOrder, premiumStatusQueryKey } from "@/lib/payments.functions";
import { toast } from "sonner";

export function PremiumUpgradeDialog({
  open,
  onOpenChange,
  isPaid,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPaid: boolean;
}) {
  const { user } = useAuth();
  const createOrder = useServerFn(createPremiumOrder);
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);

  const setOpen = (next: boolean) => {
    if (pending) return;
    onOpenChange(next);
  };

  const startPurchase = async () => {
    if (pending || isPaid) return;
    setPending(true);
    try {
      const result = await createOrder();
      window.location.assign(result.approvalUrl);
    } catch {
      setPending(false);
      await queryClient.invalidateQueries({
        queryKey: premiumStatusQueryKey(user?.id),
      });
      toast.error("לא הצלחנו לפתוח את התשלום. נסו שוב בעוד רגע.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent dir="rtl" className="max-w-md text-right sm:text-right">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
            {isPaid ? <Crown className="size-6 text-primary" /> : <BadgeDollarSign className="size-6 text-primary" />}
          </div>
          <DialogTitle className="font-display text-2xl font-extrabold">
            {isPaid ? "כבר נתתם בראש!" : "תנו בראש — בלי פרסומות"}
          </DialogTitle>
          <DialogDescription className="pt-2 text-center leading-relaxed">
            {isPaid
              ? "החשבון שלכם כבר כולל הסרת פרסומות לצמיתות. תודה על התמיכה במשחק."
              : "בתשלום חד־פעמי של 20 ₪ אתם תומכים בהמשך הפיתוח העצמאי של לשבור ת'ראש ונהנים מחוויית משחק משודרגת ללא פרסומות — לתמיד."}
          </DialogDescription>
        </DialogHeader>

        {!isPaid && (
          <>
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
                משחק ללא פרסומות
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
                מעבר אוטומטי להגדרה הבאה
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-bold">
                <CheckCircle2 className="size-5 shrink-0 text-primary" />
                תשלום חד־פעמי בלבד — ללא מנוי וללא חידוש אוטומטי
              </div>
            </div>

            <Button onClick={startPurchase} disabled={pending} size="lg" className="w-full">
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  מעבירים אתכם ל־PayPal…
                </>
              ) : (
                "מעבר לתשלום מאובטח"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              התשלום מתבצע באופן מאובטח באתר PayPal. פרטי אמצעי התשלום אינם מועברים אלינו ואינם נשמרים אצלנו.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
