import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PREMIUM_CURRENCY, PREMIUM_PRICE } from "@/lib/paypal-verify";

/**
 * PayPal one-time premium purchase (Orders v2).
 * The amount, currency, product, user and environment are decided by the
 * server only — nothing about the transaction comes from the client.
 */

export const getPremiumStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("is_paid, paid_at")
      .eq("id", context.userId)
      .single();
    return { isPaid: !!data?.is_paid, paidAt: data?.paid_at ?? null };
  });

export const createPremiumOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { SITE_ORIGIN } = await import("@/lib/site");
    const { getPaypalConfig, createPaypalOrder, approvalUrl, payeeMerchantId } =
      await import("@/lib/paypal.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cfg = getPaypalConfig();

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_paid")
      .eq("id", userId)
      .single();
    if (profile?.is_paid) throw new Error("already_premium");

    const invoiceId = `LT-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;

    const { data: purchase, error: insErr } = await (supabaseAdmin as any)
      .from("purchases")
      .insert({
        user_id: userId,
        provider: "paypal",
        environment: cfg.environment,
        status: "pending",
        expected_amount: PREMIUM_PRICE,
        expected_currency: PREMIUM_CURRENCY,
        invoice_id: invoiceId,
      })
      .select("id, invoice_id")
      .single();
    if (insErr || !purchase) throw new Error("purchase_create_failed");

    let order: any;
    try {
      order = await createPaypalOrder(cfg, {
        purchaseId: purchase.id,
        invoiceId: purchase.invoice_id,
        amount: PREMIUM_PRICE,
        currency: PREMIUM_CURRENCY,
        returnUrl: `${SITE_ORIGIN}/payment/return`,
        cancelUrl: `${SITE_ORIGIN}/payment/cancel`,
      });
    } catch (e) {
      await (supabaseAdmin as any)
        .from("purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id);
      throw e;
    }

    const url = approvalUrl(order);
    if (!order?.id || !url) {
      await (supabaseAdmin as any)
        .from("purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id);
      throw new Error("paypal_order_invalid");
    }

    await (supabaseAdmin as any)
      .from("purchases")
      .update({
        paypal_order_id: order.id,
        paypal_payee_merchant_id: payeeMerchantId(order),
      })
      .eq("id", purchase.id);

    console.log("[paypal] order created", {
      purchaseId: purchase.id,
      environment: cfg.environment,
    });

    return { orderId: order.id as string, approvalUrl: url };
  });

export const capturePremiumOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const {
      getPaypalConfig,
      capturePaypalOrder,
      getPaypalOrder,
    } = await import("@/lib/paypal.server");
    const { extractCaptureFacts, verifyCapture, canAttemptCapture } = await import(
      "@/lib/paypal-verify"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cfg = getPaypalConfig();

    const { data: purchase } = await (supabaseAdmin as any)
      .from("purchases")
      .select("*")
      .eq("paypal_order_id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!purchase) throw new Error("purchase_not_found");

    if (purchase.status === "completed") {
      return { status: "completed" as const, alreadyCompleted: true };
    }
    if (!canAttemptCapture(purchase.status)) throw new Error("purchase_not_pending");

    let order: any;
    try {
      order = await capturePaypalOrder(cfg, data.orderId, purchase.id);
    } catch {
      // Already captured (422 ORDER_ALREADY_CAPTURED) or transient failure:
      // fall back to reading the authoritative order state.
      order = await getPaypalOrder(cfg, data.orderId);
    }

    const facts = extractCaptureFacts(order, cfg.environment);
    const verdict = verifyCapture(purchase, facts);
    if (!verdict.ok) {
      console.error("[paypal] capture rejected", {
        purchaseId: purchase.id,
        reason: verdict.reason,
        environment: cfg.environment,
      });
      await (supabaseAdmin as any)
        .from("purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id)
        .eq("status", "pending");
      throw new Error("capture_verification_failed");
    }

    const { error: rpcErr } = await (supabaseAdmin as any).rpc("complete_purchase", {
      _purchase_id: purchase.id,
      _capture_id: facts.captureId,
      _merchant_id: facts.merchantId,
    });
    if (rpcErr) {
      console.error("[paypal] completion failed", {
        purchaseId: purchase.id,
        environment: cfg.environment,
      });
      throw new Error("purchase_completion_failed");
    }

    console.log("[paypal] purchase completed", {
      purchaseId: purchase.id,
      environment: cfg.environment,
    });

    return { status: "completed" as const, alreadyCompleted: false };
  });

export const cancelPremiumOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await (supabaseAdmin as any)
      .from("purchases")
      .update({ status: "canceled" })
      .eq("paypal_order_id", data.orderId)
      .eq("user_id", context.userId)
      .eq("status", "pending");
    return { ok: true };
  });
