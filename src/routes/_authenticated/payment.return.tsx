import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { capturePremiumOrder } from "@/lib/payments.functions";
import { NOINDEX_META } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payment/return")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: "אישור תשלום" }, NOINDEX_META] }),
  component: PaymentReturn,
});

function PaymentReturn() {
  const { token } = Route.useSearch();
  const capture = useServerFn(capturePremiumOrder);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const ran = useRef(false);

  const verifyPayment = async () => {
    if (!token) {
      setState("error");
      return;
    }
    setState("loading");
    try {
      await capture({ data: { orderId: token } });
      await queryClient.invalidateQueries();
      setState("success");
    } catch {
      setState("error");
    }
  };

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void verifyPayment();
    // The ref intentionally makes capture-on-return a one-time effect. Manual
    // retries call verifyPayment with the same PayPal order ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, capture, queryClient]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      {state === "loading" && (
        <>
          <Loader2 className="size-8 animate-spin text-primary" />
          <h1 className="text-xl font-bold">מאשרים את התשלום…</h1>
          <p className="text-sm text-muted-foreground">אל תסגרו את החלון</p>
        </>
      )}
      {state === "success" && (
        <>
          <CheckCircle2 className="size-10 text-primary" />
          <h1 className="text-xl font-bold">התשלום הושלם!</h1>
          <p className="text-sm text-muted-foreground">הפרסומות הוסרו מהחשבון שלכם לצמיתות. תודה על התמיכה במשחק!</p>
          <Button onClick={() => navigate({ to: "/play" })}>המשך למשחק</Button>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="size-10 text-destructive" />
          <h1 className="text-xl font-bold">עדיין לא הצלחנו לאשר את התשלום</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            ייתכן שעדכון התשלום עדיין בעיבוד. אל תתחילו רכישה חדשה — בדקו שוב את אותה העסקה.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => void verifyPayment()}>בדיקה מחדש</Button>
            <Button asChild variant="outline">
              <Link to="/play">חזרה למשחק</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
