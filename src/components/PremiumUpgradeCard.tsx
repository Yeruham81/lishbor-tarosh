import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useFeatureFlags } from "@/hooks/use-public-settings";
import { createPremiumOrder, getPremiumStatus, premiumStatusQueryKey } from "@/lib/payments.functions";

/** One-time premium purchase (20 ₪) via PayPal. */
export function PremiumUpgradeCard() {
  const { user } = useAuth();
  const flags = useFeatureFlags();
  const fetchStatus = useServerFn(getPremiumStatus);
  const createOrder = useServerFn(createPremiumOrder);
  const [pending, setPending] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: premiumStatusQueryKey(user?.id),
    queryFn: () => fetchStatus(),
    enabled: !!user,
  });

  // The admin switch controls the premium offer everywhere. While the
  // setting is loading, render nothing to avoid briefly flashing the offer.
  // Paid users still keep their entitlement/status message when the offer is hidden.
  if (flags.loading) return null;

  if (!flags.disableAdsButtonVisible) {
    if (isLoading || isError || !data?.isPaid) return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-lg border p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        בודקים את מצב החשבון…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        לא הצלחנו לבדוק כרגע את מצב הפרימיום. נסו לרענן את העמוד.
      </div>
    );
  }

  if (data?.isPaid) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 p-4">
        <Crown className="size-5 text-primary" />
        <span className="text-sm font-semibold">החשבון שלך כולל הסרת פרסומות לצמיתות. תודה על התמיכה במשחק!</span>
      </div>
    );
  }

  const start = async () => {
    if (pending) return;
    setPending(true);
    try {
      const res = await createOrder();
      window.location.assign(res.approvalUrl);
    } catch {
      setPending(false);
      toast.error("לא הצלחנו לפתוח את התשלום. נסו שוב.");
    }
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Crown className="size-5 text-primary" />
        <span className="font-semibold">תנו בראש — 20 ₪ בתשלום חד־פעמי</span>
      </div>
      <p className="text-sm text-muted-foreground">
        תמיכה בהמשך הפיתוח העצמאי של המשחק והסרת הפרסומות מהחשבון שלך לצמיתות.
      </p>
      <Button onClick={start} disabled={pending} className="w-fit">
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            מעבירים לתשלום…
          </>
        ) : (
          "לתשלום מאובטח ב־PayPal"
        )}
      </Button>
    </div>
  );
}
