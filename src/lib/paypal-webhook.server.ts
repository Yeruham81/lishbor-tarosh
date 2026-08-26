/** Trusted server-side processing for verified PayPal webhook events. */

import type { PaypalConfig, PaypalOrder } from "@/lib/paypal.server";
import type { ParsedPaypalWebhook } from "@/lib/paypal-webhook";

export type PaypalWebhookProcessResult =
  "completed" | "already_completed" | "pending" | "failed" | "ignored";

type SupportedWebhook = Extract<ParsedPaypalWebhook, { kind: "supported" }>;

export async function processVerifiedPaypalWebhook(
  cfg: PaypalConfig,
  event: SupportedWebhook,
): Promise<PaypalWebhookProcessResult> {
  const { capturePaypalOrder, getPaypalOrder } = await import("@/lib/paypal.server");
  const { extractCaptureFacts, hasCompleteCaptureRepresentation, verifyCapture } =
    await import("@/lib/paypal-verify");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: purchase, error: purchaseError } = await supabaseAdmin
    .from("purchases")
    .select("*")
    .eq("paypal_order_id", event.orderId)
    .eq("provider", "paypal")
    .eq("environment", cfg.environment)
    .maybeSingle();

  if (purchaseError) throw new Error("webhook_purchase_lookup_failed");
  // The same PayPal app may serve another project. Unknown orders are not an
  // error and must not cause repeated deliveries to this endpoint.
  if (!purchase) return "ignored";
  if (purchase.status === "completed") return "already_completed";

  if (event.eventType === "PAYMENT.CAPTURE.PENDING") {
    return purchase.status === "pending" ? "pending" : "ignored";
  }

  if (event.eventType === "PAYMENT.CAPTURE.DENIED") {
    if (purchase.status !== "pending") return "ignored";
    const { error } = await supabaseAdmin
      .from("purchases")
      .update({ status: "failed" })
      .eq("id", purchase.id)
      .eq("status", "pending");
    if (error) throw new Error("webhook_purchase_status_update_failed");
    return "failed";
  }

  if (purchase.status !== "pending") return "ignored";

  let order: PaypalOrder;
  if (event.eventType === "CHECKOUT.ORDER.APPROVED") {
    // Avoid capturing a stale checkout for an account that already owns the
    // entitlement through another purchase.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_paid")
      .eq("id", purchase.user_id)
      .single();
    if (profileError || !profile) throw new Error("webhook_profile_lookup_failed");
    if (profile.is_paid) {
      const { error } = await supabaseAdmin
        .from("purchases")
        .update({ status: "canceled" })
        .eq("id", purchase.id)
        .eq("status", "pending");
      if (error) throw new Error("webhook_purchase_status_update_failed");
      return "ignored";
    }

    try {
      order = await capturePaypalOrder(cfg, event.orderId, purchase.id);
    } catch {
      // The browser return flow can race this webhook. GET Order recovers an
      // already-captured order while the shared request ID prevents duplicates.
      order = await getPaypalOrder(cfg, event.orderId);
    }
  } else {
    // A completed-capture notification is only a signal. The authoritative
    // order is fetched with this app's credentials before granting anything.
    order = await getPaypalOrder(cfg, event.orderId);
  }

  let facts = extractCaptureFacts(order, cfg.environment);
  if (!hasCompleteCaptureRepresentation(facts)) {
    order = await getPaypalOrder(cfg, event.orderId);
    facts = extractCaptureFacts(order, cfg.environment);
  }

  if (!purchase.paypal_payee_merchant_id && facts.merchantId) {
    const { error } = await supabaseAdmin
      .from("purchases")
      .update({ paypal_payee_merchant_id: facts.merchantId })
      .eq("id", purchase.id)
      .eq("status", "pending");
    if (error) throw new Error("webhook_purchase_status_update_failed");
    purchase.paypal_payee_merchant_id = facts.merchantId;
  }

  const verdict = verifyCapture(purchase, facts);
  if (!verdict.ok) {
    // A pending capture will be finalized by a later COMPLETED or DENIED event.
    if (facts.captureStatus === "PENDING") return "pending";
    console.error("[paypal-webhook] capture rejected", {
      eventId: event.eventId,
      purchaseId: purchase.id,
      reason: verdict.reason,
      environment: cfg.environment,
    });
    throw new Error("webhook_capture_verification_failed");
  }

  const { error: completionError } = await supabaseAdmin.rpc("complete_purchase", {
    _purchase_id: purchase.id,
    _capture_id: facts.captureId!,
    _merchant_id: facts.merchantId!,
  });
  if (completionError) throw new Error("webhook_purchase_completion_failed");

  console.log("[paypal-webhook] purchase completed", {
    eventId: event.eventId,
    purchaseId: purchase.id,
    environment: cfg.environment,
  });
  return "completed";
}
