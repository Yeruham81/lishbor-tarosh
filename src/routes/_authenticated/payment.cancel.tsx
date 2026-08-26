import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { cancelPremiumOrder } from "@/lib/payments.functions";
import { NOINDEX_META } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/payment/cancel")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({ meta: [{ title: "התשלום בוטל" }, NOINDEX_META] }),
  component: PaymentCancel,
});

function PaymentCancel() {
  const { token } = Route.useSearch();
  const cancel = useServerFn(cancelPremiumOrder);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current || !token) return;
    ran.current = true;
    cancel({ data: { orderId: token } }).catch(() => {});
  }, [token, cancel]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <XCircle className="size-10 text-muted-foreground" />
      <h1 className="text-xl font-bold">התשלום בוטל</h1>
      <p className="text-sm text-muted-foreground">לא בוצע חיוב. אפשר לנסות שוב בכל עת.</p>
      <Button asChild variant="outline">
        <Link to="/profile">חזרה לפרופיל</Link>
      </Button>
    </div>
  );
}
