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

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!token) {
      setState("error");
      return;
    }
    capture({ data: { orderId: token } })
      .then(async () => {
        await queryClient.invalidateQueries();
        setState("success");
      })
      .catch(() => setState("error"));
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
          <p className="text-sm text-muted-foreground">התכונות המתקדמות נפתחו בחשבון שלכם.</p>
          <Button onClick={() => navigate({ to: "/play" })}>המשך למשחק</Button>
        </>
      )}
      {state === "error" && (
        <>
          <XCircle className="size-10 text-destructive" />
          <h1 className="text-xl font-bold">התשלום לא אושר</h1>
          <p className="text-sm text-muted-foreground">לא חויבתם. אפשר לנסות שוב מהפרופיל.</p>
          <Button asChild variant="outline">
            <Link to="/profile">חזרה לפרופיל</Link>
          </Button>
        </>
      )}
    </div>
  );
}
