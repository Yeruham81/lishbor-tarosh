/**
 * Pure, dependency-free verification helpers for PayPal Orders v2 captures.
 *
 * These contain NO secrets and NO network access so they can be unit tested.
 * They are the single place where "may we grant premium?" is decided.
 */

export const PREMIUM_PRICE = "20.00";
export const PREMIUM_CURRENCY = "ILS";

export interface StoredPurchase {
  id: string;
  user_id: string;
  status: string;
  environment: string;
  expected_amount: number | string;
  expected_currency: string;
  invoice_id: string;
  paypal_order_id: string | null;
  paypal_capture_id: string | null;
  paypal_payee_merchant_id: string | null;
}

export interface CaptureFacts {
  orderId: string;
  orderStatus: string;
  captureId: string | null;
  captureStatus: string | null;
  amountValue: string | null;
  currency: string | null;
  customId: string | null;
  invoiceId: string | null;
  merchantId: string | null;
  environment: string;
}

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

function sameAmount(a: string | number, b: string | number): boolean {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.round(x * 100) === Math.round(y * 100);
}

/** Extract the facts we care about from a PayPal capture/order response. */
export function extractCaptureFacts(
  order: any,
  environment: string,
): CaptureFacts {
  const unit = order?.purchase_units?.[0] ?? {};
  const capture = unit?.payments?.captures?.[0] ?? null;
  const amount = capture?.amount ?? unit?.amount ?? null;
  return {
    orderId: order?.id ?? "",
    orderStatus: order?.status ?? "",
    captureId: capture?.id ?? null,
    captureStatus: capture?.status ?? null,
    amountValue: amount?.value ?? null,
    currency: amount?.currency_code ?? null,
    customId: capture?.custom_id ?? unit?.custom_id ?? null,
    invoiceId: capture?.invoice_id ?? unit?.invoice_id ?? null,
    merchantId: unit?.payee?.merchant_id ?? null,
    environment,
  };
}

/**
 * Decide whether a capture may grant premium. Every check must pass.
 */
export function verifyCapture(
  purchase: StoredPurchase,
  facts: CaptureFacts,
): VerifyResult {
  if (facts.environment !== purchase.environment) {
    return { ok: false, reason: "environment_mismatch" };
  }
  if (facts.orderStatus !== "COMPLETED") {
    return { ok: false, reason: "order_not_completed" };
  }
  if (!facts.captureId) return { ok: false, reason: "missing_capture" };
  if (facts.captureStatus !== "COMPLETED") {
    return { ok: false, reason: "capture_not_completed" };
  }
  if (!purchase.paypal_order_id || facts.orderId !== purchase.paypal_order_id) {
    return { ok: false, reason: "order_id_mismatch" };
  }
  if (!facts.amountValue || !sameAmount(facts.amountValue, purchase.expected_amount)) {
    return { ok: false, reason: "amount_mismatch" };
  }
  if (facts.currency !== purchase.expected_currency || facts.currency !== PREMIUM_CURRENCY) {
    return { ok: false, reason: "currency_mismatch" };
  }
  if (facts.customId !== purchase.id) {
    return { ok: false, reason: "custom_id_mismatch" };
  }
  if (facts.invoiceId !== purchase.invoice_id) {
    return { ok: false, reason: "invoice_id_mismatch" };
  }
  if (
    !facts.merchantId ||
    !purchase.paypal_payee_merchant_id ||
    facts.merchantId !== purchase.paypal_payee_merchant_id
  ) {
    return { ok: false, reason: "merchant_mismatch" };
  }
  if (purchase.paypal_capture_id && purchase.paypal_capture_id !== facts.captureId) {
    return { ok: false, reason: "capture_already_used" };
  }
  return { ok: true };
}

/** Purchase states from which a capture attempt is allowed. */
export function canAttemptCapture(status: string): boolean {
  return status === "pending";
}
