import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  PAYPAL_WEBHOOK_EVENT_TYPES,
  parsePaypalWebhookEvent,
  readPaypalWebhookSignatureHeaders,
} from "@/lib/paypal-webhook";

describe("PayPal webhook parsing", () => {
  it("extracts the order id from an approved-order event", () => {
    expect(
      parsePaypalWebhookEvent({
        id: "WH-APPROVED",
        event_type: "CHECKOUT.ORDER.APPROVED",
        resource: { id: "ORDER123" },
      }),
    ).toEqual({
      kind: "supported",
      eventId: "WH-APPROVED",
      eventType: "CHECKOUT.ORDER.APPROVED",
      orderId: "ORDER123",
    });
  });

  it("extracts the related order id from every supported capture event", () => {
    for (const eventType of [
      "PAYMENT.CAPTURE.PENDING",
      "PAYMENT.CAPTURE.COMPLETED",
      "PAYMENT.CAPTURE.DENIED",
    ]) {
      expect(
        parsePaypalWebhookEvent({
          id: `WH-${eventType}`,
          event_type: eventType,
          resource: {
            id: "CAPTURE123",
            supplementary_data: { related_ids: { order_id: "ORDER123" } },
          },
        }),
      ).toMatchObject({ kind: "supported", eventType, orderId: "ORDER123" });
    }
  });

  it("ignores unregistered events and rejects malformed registered events", () => {
    expect(
      parsePaypalWebhookEvent({
        id: "WH-REFUND",
        event_type: "PAYMENT.CAPTURE.REFUNDED",
        resource: {},
      }),
    ).toEqual({
      kind: "ignored",
      eventId: "WH-REFUND",
      eventType: "PAYMENT.CAPTURE.REFUNDED",
    });
    expect(
      parsePaypalWebhookEvent({
        id: "WH-BROKEN",
        event_type: "PAYMENT.CAPTURE.COMPLETED",
        resource: { custom_id: "untrusted-order-id" },
      }),
    ).toEqual({ kind: "invalid" });
  });

  it("requires all five PayPal signature headers", () => {
    const headers = new Headers({
      "paypal-auth-algo": "SHA256withRSA",
      "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
      "paypal-transmission-id": "TRANSMISSION-1",
      "paypal-transmission-sig": "signature",
      "paypal-transmission-time": "2026-08-26T03:00:00Z",
    });
    expect(readPaypalWebhookSignatureHeaders(headers)).toEqual({
      authAlgo: "SHA256withRSA",
      certUrl: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
      transmissionId: "TRANSMISSION-1",
      transmissionSignature: "signature",
      transmissionTime: "2026-08-26T03:00:00Z",
    });
    headers.delete("paypal-transmission-sig");
    expect(readPaypalWebhookSignatureHeaders(headers)).toBeNull();
  });

  it("subscribes the implementation to the four events exposed by the app", () => {
    expect(PAYPAL_WEBHOOK_EVENT_TYPES).toEqual([
      "CHECKOUT.ORDER.APPROVED",
      "PAYMENT.CAPTURE.PENDING",
      "PAYMENT.CAPTURE.COMPLETED",
      "PAYMENT.CAPTURE.DENIED",
    ]);
  });
});

describe("PayPal webhook security wiring", () => {
  it("verifies signatures before processing and re-fetches authoritative orders", () => {
    const route = readFileSync("src/routes/api.paypal.webhook.ts", "utf8");
    const processor = readFileSync("src/lib/paypal-webhook.server.ts", "utf8");
    expect(route.indexOf("verifyPaypalWebhookSignature")).toBeLessThan(
      route.indexOf("processVerifiedPaypalWebhook"),
    );
    expect(route).toContain("MAX_WEBHOOK_BYTES");
    expect(processor).toContain("getPaypalOrder(cfg, event.orderId)");
    expect(processor).toContain("verifyCapture(purchase, facts)");
    expect(processor).toContain('rpc("complete_purchase"');
  });

  it("uses the existing idempotent capture request id and handles browser/webhook races", () => {
    const processor = readFileSync("src/lib/paypal-webhook.server.ts", "utf8");
    const payments = readFileSync("src/lib/payments.functions.ts", "utf8");
    expect(processor).toContain("capturePaypalOrder(cfg, event.orderId, purchase.id)");
    expect(processor).toContain('purchase.status === "completed"');
    expect(payments).toContain("The verified webhook can complete this purchase");
    expect(payments).toContain('latest.status === "completed"');
  });
});
