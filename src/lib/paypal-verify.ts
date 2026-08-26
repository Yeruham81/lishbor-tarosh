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

export type VerifyResult = { ok: true } | { ok: false; reason: string };

function sameAmount(a: string | number, b: string | number): boolean {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.round(x * 100) === Math.round(y * 100);
}

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as UnknownRecord) : {};
}

function firstRecord(value: unknown): UnknownRecord {
  return Array.isArray(value) ? asRecord(value[0]) : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Extract the facts we care about from a PayPal capture/order response. */
export function extractCaptureFacts(order: unknown, environment: string): CaptureFacts {
  const orderRecord = asRecord(order);
  const unit = firstRecord(orderRecord.purchase_units);
  const payments = asRecord(unit.payments);
  const capture = firstRecord(payments.captures);
  const captureAmount = asRecord(capture.amount);
  const unitAmount = asRecord(unit.amount);
  const amount = Object.keys(captureAmount).length > 0 ? captureAmount : unitAmount;
  const payee = asRecord(unit.payee);
  return {
    orderId: asString(orderRecord.id) ?? "",
    orderStatus: asString(orderRecord.status) ?? "",
    captureId: asString(capture.id),
    captureStatus: asString(capture.status),
    amountValue: asString(amount.value),
    currency: asString(amount.currency_code),
    customId: asString(capture.custom_id) ?? asString(unit.custom_id),
    invoiceId: asString(capture.invoice_id) ?? asString(unit.invoice_id),
    merchantId: asString(payee.merchant_id),
    environment,
  };
}

/**
 * Decide whether a capture may grant premium. Every check must pass.
 */
export function verifyCapture(purchase: StoredPurchase, facts: CaptureFacts): VerifyResult {
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

/**
 * States in which the same PayPal order may safely be checked/captured again.
 * A retry must never create a replacement order or grant an entitlement yet.
 */
export function isRetryableCapture(facts: CaptureFacts): boolean {
  if (["CREATED", "APPROVED", "PAYER_ACTION_REQUIRED"].includes(facts.orderStatus)) {
    return true;
  }
  if (!facts.captureId) return true;
  return facts.captureStatus === "PENDING";
}
