/** Pure parsing and validation helpers for PayPal webhook notifications. */

export const PAYPAL_WEBHOOK_EVENT_TYPES = [
  "CHECKOUT.ORDER.APPROVED",
  "PAYMENT.CAPTURE.PENDING",
  "PAYMENT.CAPTURE.COMPLETED",
  "PAYMENT.CAPTURE.DENIED",
] as const;

export type PaypalWebhookEventType = (typeof PAYPAL_WEBHOOK_EVENT_TYPES)[number];

export interface PaypalWebhookSignatureHeaders {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSignature: string;
  transmissionTime: string;
}

export type ParsedPaypalWebhook =
  | {
      kind: "supported";
      eventId: string;
      eventType: PaypalWebhookEventType;
      orderId: string;
    }
  | { kind: "ignored"; eventId: string; eventType: string }
  | { kind: "invalid" };

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  const result = asString(value);
  return result && result.length <= maxLength ? result : null;
}

function isSupportedEventType(value: string): value is PaypalWebhookEventType {
  return (PAYPAL_WEBHOOK_EVENT_TYPES as readonly string[]).includes(value);
}

function captureOrderId(resource: UnknownRecord): string | null {
  const supplementaryData = asRecord(resource.supplementary_data);
  const relatedIds = asRecord(supplementaryData.related_ids);
  return boundedString(relatedIds.order_id, 64);
}

/**
 * Extract only the identifiers needed for processing. The original event object
 * is retained separately by the route and posted back to PayPal for signature
 * verification before this parsed result is trusted.
 */
export function parsePaypalWebhookEvent(value: unknown): ParsedPaypalWebhook {
  const event = asRecord(value);
  const eventId = boundedString(event.id, 128);
  const eventType = boundedString(event.event_type, 128);
  if (!eventId || !eventType) return { kind: "invalid" };
  if (!isSupportedEventType(eventType)) return { kind: "ignored", eventId, eventType };

  const resource = asRecord(event.resource);
  const orderId =
    eventType === "CHECKOUT.ORDER.APPROVED"
      ? boundedString(resource.id, 64)
      : captureOrderId(resource);

  if (!orderId) return { kind: "invalid" };
  return { kind: "supported", eventId, eventType, orderId };
}

/** Read the five headers required by PayPal's postback verification API. */
export function readPaypalWebhookSignatureHeaders(
  headers: Headers,
): PaypalWebhookSignatureHeaders | null {
  const header = (name: string, maxLength: number) => {
    const value = headers.get(name)?.trim();
    return value && value.length <= maxLength ? value : null;
  };
  const authAlgo = header("paypal-auth-algo", 100);
  const certUrl = header("paypal-cert-url", 500);
  const transmissionId = header("paypal-transmission-id", 50);
  const transmissionSignature = header("paypal-transmission-sig", 500);
  const transmissionTime = header("paypal-transmission-time", 100);

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSignature || !transmissionTime) {
    return null;
  }

  return { authAlgo, certUrl, transmissionId, transmissionSignature, transmissionTime };
}
