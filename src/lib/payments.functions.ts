import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PREMIUM_CURRENCY, PREMIUM_PRICE } from "@/lib/paypal-verify";

/**
 * PayPal one-time premium purchase (Orders v2).
 * The amount, currency, product, user and environment are decided by the
 * server only — nothing about the transaction comes from the client.
 */

export function premiumStatusQueryKey(userId?: string) {
  return ["premium-status", userId ?? "anonymous"] as const;
}

export const getPremiumStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("is_paid, paid_at")
      .eq("id", context.userId)
      .single();
    if (error || !data) throw new Error("premium_status_unavailable");
    return { isPaid: data.is_paid, paidAt: data.paid_at ?? null };
  });

export const createPremiumOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { SITE_ORIGIN } = await import("@/lib/site");
    const {
      getPaypalConfig,
      createPaypalOrder,
      getPaypalOrder,
      approvalUrl,
      payeeMerchantId,
      ensurePaypalOrderRepresentation,
    } = await import("@/lib/paypal.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cfg = getPaypalConfig();
    const localReturnUrl = (orderId: string) => `${SITE_ORIGIN}/payment/return?token=${encodeURIComponent(orderId)}`;

    const failPendingPurchase = async (purchaseId: string) => {
      const { error } = await supabaseAdmin
        .from("purchases")
        .update({ status: "failed" })
        .eq("id", purchaseId)
        .eq("status", "pending");
      if (error) throw new Error("purchase_status_update_failed");
    };

    const findPendingPurchase = async () => {
      const { data, error } = await supabaseAdmin
        .from("purchases")
        .select("*")
        .eq("user_id", userId)
        .eq("provider", "paypal")
        .eq("environment", cfg.environment)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error("purchase_lookup_failed");
      return data;
    };

    const reusePendingPurchase = async (
      purchase: NonNullable<Awaited<ReturnType<typeof findPendingPurchase>>>,
    ): Promise<{ orderId: string; approvalUrl: string } | null> => {
      if (!purchase.paypal_order_id) {
        const createdAt = Date.parse(purchase.created_at);
        if (Number.isFinite(createdAt) && Date.now() - createdAt < 5 * 60_000) {
          // Another request may still be creating and persisting the PayPal
          // order. Do not invalidate its row or create a competing checkout.
          throw new Error("purchase_initializing_retry");
        }
        await failPendingPurchase(purchase.id);
        return null;
      }

      // A transient PayPal error must not create a replacement order: the old
      // order may already have been approved or captured.
      const order = await getPaypalOrder(cfg, purchase.paypal_order_id);
      const merchantId = payeeMerchantId(order);
      if (!merchantId) {
        await failPendingPurchase(purchase.id);
        throw new Error("paypal_merchant_missing");
      }
      if (purchase.paypal_payee_merchant_id && purchase.paypal_payee_merchant_id !== merchantId) {
        await failPendingPurchase(purchase.id);
        throw new Error("paypal_merchant_mismatch");
      }
      if (!purchase.paypal_payee_merchant_id) {
        const { error } = await supabaseAdmin
          .from("purchases")
          .update({ paypal_payee_merchant_id: merchantId })
          .eq("id", purchase.id)
          .eq("status", "pending");
        if (error) throw new Error("purchase_status_update_failed");
      }

      const status = String(order?.status ?? "");
      if (status === "APPROVED" || status === "COMPLETED") {
        return {
          orderId: purchase.paypal_order_id,
          approvalUrl: localReturnUrl(purchase.paypal_order_id),
        };
      }

      const url = approvalUrl(order);
      if (status === "CREATED" && url) {
        return { orderId: purchase.paypal_order_id, approvalUrl: url };
      }

      await failPendingPurchase(purchase.id);
      return null;
    };

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_paid")
      .eq("id", userId)
      .single();
    if (profileErr || !profile) throw new Error("profile_lookup_failed");
    if (profile.is_paid) throw new Error("already_premium");

    const pending = await findPendingPurchase();
    if (pending) {
      const reusable = await reusePendingPurchase(pending);
      if (reusable) return reusable;
    }

    const invoiceId = `LT-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: purchase, error: insErr } = await supabaseAdmin
      .from("purchases")
      .insert({
        user_id: userId,
        provider: "paypal",
        environment: cfg.environment,
        status: "pending",
        expected_amount: Number(PREMIUM_PRICE),
        expected_currency: PREMIUM_CURRENCY,
        invoice_id: invoiceId,
      })
      .select("id, invoice_id")
      .single();

    if (insErr?.code === "23505") {
      const concurrentPurchase = await findPendingPurchase();
      if (concurrentPurchase) {
        const reusable = await reusePendingPurchase(concurrentPurchase);
        if (reusable) return reusable;
      }
      throw new Error("purchase_conflict_retry");
    }
    if (insErr || !purchase) throw new Error("purchase_create_failed");

    try {
      let order = await createPaypalOrder(cfg, {
        purchaseId: purchase.id,
        invoiceId: purchase.invoice_id,
        amount: PREMIUM_PRICE,
        currency: PREMIUM_CURRENCY,
        returnUrl: `${SITE_ORIGIN}/payment/return`,
        cancelUrl: `${SITE_ORIGIN}/payment/cancel`,
      });

      if (!order?.id) throw new Error("paypal_order_invalid");

      // GET is the authoritative fallback when PayPal returns only the
      // default/minimal Create Order representation.
      order = await ensurePaypalOrderRepresentation(cfg, order);

      const url = approvalUrl(order);
      const merchantId = payeeMerchantId(order);
      if (!order?.id || !url || !merchantId) throw new Error("paypal_order_invalid");

      const { data: stored, error: updateErr } = await supabaseAdmin
        .from("purchases")
        .update({
          paypal_order_id: order.id,
          paypal_payee_merchant_id: merchantId,
        })
        .eq("id", purchase.id)
        .eq("status", "pending")
        .select("id")
        .single();
      if (updateErr || !stored) throw new Error("purchase_order_store_failed");

      console.log("[paypal] order created", {
        purchaseId: purchase.id,
        environment: cfg.environment,
      });

      return { orderId: order.id as string, approvalUrl: url };
    } catch (error) {
      await failPendingPurchase(purchase.id).catch(() => {});
      throw error;
    }
  });

export const capturePremiumOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ orderId: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { getPaypalConfig, capturePaypalOrder, getPaypalOrder } = await import("@/lib/paypal.server");
    const { extractCaptureFacts, verifyCapture, canAttemptCapture, isRetryableCapture } =
      await import("@/lib/paypal-verify");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cfg = getPaypalConfig();
    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from("purchases")
      .select("*")
      .eq("paypal_order_id", data.orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (purchaseErr) throw new Error("purchase_lookup_failed");
    if (!purchase) throw new Error("purchase_not_found");

    if (purchase.status === "completed") {
      return { status: "completed" as const, alreadyCompleted: true };
    }
    if (!canAttemptCapture(purchase.status)) throw new Error("purchase_not_pending");
    if (purchase.environment !== cfg.environment) throw new Error("purchase_environment_mismatch");

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("is_paid")
      .eq("id", userId)
      .single();
    if (profileErr || !profile) throw new Error("profile_lookup_failed");
    if (profile.is_paid) {
      const { error } = await supabaseAdmin
        .from("purchases")
        .update({ status: "canceled" })
        .eq("id", purchase.id)
        .eq("status", "pending");
      if (error) throw new Error("purchase_status_update_failed");
      throw new Error("already_premium");
    }

    let order: Awaited<ReturnType<typeof capturePaypalOrder>>;
    try {
      order = await capturePaypalOrder(cfg, data.orderId, purchase.id);
    } catch {
      // This covers both an idempotent retry after a successful capture and a
      // transient failure. GET supplies the authoritative current state.
      order = await getPaypalOrder(cfg, data.orderId);
    }

    const facts = extractCaptureFacts(order, cfg.environment);

    // Recover old pending rows created before merchant-id persistence was
    // hardened. The value comes from PayPal under this app's credentials.
    if (!purchase.paypal_payee_merchant_id && facts.merchantId) {
      const { error } = await supabaseAdmin
        .from("purchases")
        .update({ paypal_payee_merchant_id: facts.merchantId })
        .eq("id", purchase.id)
        .eq("status", "pending");
      if (error) throw new Error("purchase_status_update_failed");
      purchase.paypal_payee_merchant_id = facts.merchantId;
    }

    const verdict = verifyCapture(purchase, facts);
    if (!verdict.ok) {
      console.error("[paypal] capture rejected", {
        purchaseId: purchase.id,
        reason: verdict.reason,
        environment: cfg.environment,
      });

      if (isRetryableCapture(facts)) throw new Error("capture_pending_retryable");

      const { error } = await supabaseAdmin
        .from("purchases")
        .update({ status: "failed" })
        .eq("id", purchase.id)
        .eq("status", "pending");
      if (error) throw new Error("purchase_status_update_failed");
      throw new Error("capture_verification_failed");
    }

    const { error: rpcErr } = await supabaseAdmin.rpc("complete_purchase", {
      _purchase_id: purchase.id,
      _capture_id: facts.captureId!,
      _merchant_id: facts.merchantId!,
    });
    if (rpcErr) {
      console.error("[paypal] completion failed", {
        purchaseId: purchase.id,
        environment: cfg.environment,
      });
      // Keep the purchase pending. Retrying uses the same PayPal request ID,
      // reads the already-captured order and safely retries the local RPC.
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
    const { error } = await supabaseAdmin
      .from("purchases")
      .update({ status: "canceled" })
      .eq("paypal_order_id", data.orderId)
      .eq("user_id", context.userId)
      .eq("status", "pending");
    if (error) throw new Error("purchase_cancel_failed");
    return { ok: true };
  });
