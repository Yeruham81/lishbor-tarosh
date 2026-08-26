import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  extractCaptureFacts,
  hasCompleteCaptureRepresentation,
  verifyCapture,
  canAttemptCapture,
  PREMIUM_PRICE,
  PREMIUM_CURRENCY,
  isRetryableCapture,
  type StoredPurchase,
} from "@/lib/paypal-verify";

const PURCHASE_ID = "11111111-1111-4111-8111-111111111111";

const purchase: StoredPurchase = {
  id: PURCHASE_ID,
  user_id: "22222222-2222-4222-8222-222222222222",
  status: "pending",
  environment: "sandbox",
  expected_amount: "20.00",
  expected_currency: "ILS",
  invoice_id: "LT-abc-123",
  paypal_order_id: "ORDER123",
  paypal_capture_id: null,
  paypal_payee_merchant_id: "MERCHANT1",
};

const goodOrder = {
  id: "ORDER123",
  status: "COMPLETED",
  purchase_units: [
    {
      payee: { merchant_id: "MERCHANT1" },
      payments: {
        captures: [
          {
            id: "CAP123",
            status: "COMPLETED",
            amount: { value: "20.00", currency_code: "ILS" },
            custom_id: PURCHASE_ID,
            invoice_id: "LT-abc-123",
          },
        ],
      },
    },
  ],
};

const facts = (order: unknown, env = "sandbox") => extractCaptureFacts(order, env);

describe("verifyCapture", () => {
  it("detects a minimal PayPal response that must be followed by GET Order", () => {
    expect(
      hasCompleteCaptureRepresentation({
        ...facts(goodOrder),
        captureId: null,
        captureStatus: null,
        amountValue: null,
        currency: null,
        customId: null,
        invoiceId: null,
        merchantId: null,
      }),
    ).toBe(false);
    expect(hasCompleteCaptureRepresentation(facts(goodOrder))).toBe(true);
  });

  it("accepts a fully matching sandbox capture", () => {
    expect(verifyCapture(purchase, facts(goodOrder))).toEqual({ ok: true });
  });

  it("rejects environment mismatch (credentials switched to live)", () => {
    expect(verifyCapture(purchase, facts(goodOrder, "live"))).toEqual({
      ok: false,
      reason: "environment_mismatch",
    });
  });

  it("rejects pending / failed / canceled orders", () => {
    for (const status of ["PENDING", "VOIDED", "PAYER_ACTION_REQUIRED", "CREATED"]) {
      const o = { ...goodOrder, status };
      expect(verifyCapture(purchase, facts(o)).ok).toBe(false);
    }
  });

  it("rejects a non-completed capture", () => {
    const o = structuredClone(goodOrder);
    o.purchase_units[0].payments.captures[0].status = "DECLINED";
    expect(verifyCapture(purchase, facts(o))).toEqual({
      ok: false,
      reason: "capture_not_completed",
    });
  });

  it("rejects amount tampering", () => {
    const o = structuredClone(goodOrder);
    o.purchase_units[0].payments.captures[0].amount.value = "1.00";
    expect(verifyCapture(purchase, facts(o))).toEqual({ ok: false, reason: "amount_mismatch" });
  });

  it("rejects currency tampering", () => {
    const o = structuredClone(goodOrder);
    o.purchase_units[0].payments.captures[0].amount.currency_code = "USD";
    expect(verifyCapture(purchase, facts(o))).toEqual({ ok: false, reason: "currency_mismatch" });
  });

  it("rejects custom_id mismatch (another user's purchase)", () => {
    const o = structuredClone(goodOrder);
    o.purchase_units[0].payments.captures[0].custom_id = "33333333-3333-4333-8333-333333333333";
    expect(verifyCapture(purchase, facts(o))).toEqual({ ok: false, reason: "custom_id_mismatch" });
  });

  it("rejects invoice_id mismatch", () => {
    const o = structuredClone(goodOrder);
    o.purchase_units[0].payments.captures[0].invoice_id = "OTHER";
    expect(verifyCapture(purchase, facts(o))).toEqual({ ok: false, reason: "invoice_id_mismatch" });
  });

  it("rejects order id mismatch", () => {
    const o = { ...goodOrder, id: "ORDER999" };
    expect(verifyCapture(purchase, facts(o))).toEqual({ ok: false, reason: "order_id_mismatch" });
  });

  it("rejects a capture paid to a different merchant account", () => {
    const o = structuredClone(goodOrder);
    o.purchase_units[0].payee.merchant_id = "MERCHANT2";
    expect(verifyCapture(purchase, facts(o))).toEqual({ ok: false, reason: "merchant_mismatch" });
  });

  it("rejects reuse of a capture id already bound to the purchase", () => {
    const used = { ...purchase, paypal_capture_id: "CAPOLD" };
    expect(verifyCapture(used, facts(goodOrder))).toEqual({
      ok: false,
      reason: "capture_already_used",
    });
  });

  it("only allows capture attempts on pending purchases", () => {
    expect(canAttemptCapture("pending")).toBe(true);
    for (const s of ["completed", "canceled", "failed"]) {
      expect(canAttemptCapture(s)).toBe(false);
    }
  });

  it("only retries non-terminal PayPal states", () => {
    const created = {
      ...facts(goodOrder),
      orderStatus: "CREATED",
      captureId: null,
      captureStatus: null,
    };
    expect(isRetryableCapture(created)).toBe(true);

    const pendingCapture = { ...facts(goodOrder), captureStatus: "PENDING" };
    expect(isRetryableCapture(pendingCapture)).toBe(true);

    const declinedCapture = { ...facts(goodOrder), captureStatus: "DECLINED" };
    expect(isRetryableCapture(declinedCapture)).toBe(false);
  });

  it("uses a server-fixed price and currency", () => {
    expect(PREMIUM_PRICE).toBe("20.00");
    expect(PREMIUM_CURRENCY).toBe("ILS");
  });
});

describe("paypal server config", () => {
  const original = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env["PAYPAL_ENVIRONMENT"] = "sandbox";
    process.env["PAYPAL_SANDBOX_CLIENT_ID"] = "test-id";
    process.env["PAYPAL_SANDBOX_CLIENT_SECRET"] = "test-secret";
    process.env["PAYPAL_SANDBOX_WEBHOOK_ID"] = "WEBHOOK123";
  });

  afterEach(() => {
    process.env = { ...original };
  });

  it("selects the sandbox API base from backend secrets only", async () => {
    const { getPaypalConfig } = await import("@/lib/paypal.server");
    const cfg = getPaypalConfig();
    expect(cfg.environment).toBe("sandbox");
    expect(cfg.apiBase).toBe("https://api-m.sandbox.paypal.com");
  });

  it("rejects unsupported or missing environments", async () => {
    const { getPaypalConfig } = await import("@/lib/paypal.server");
    process.env["PAYPAL_ENVIRONMENT"] = "staging";
    expect(() => getPaypalConfig()).toThrow("paypal_environment_invalid");
    delete process.env["PAYPAL_ENVIRONMENT"];
    expect(() => getPaypalConfig()).toThrow("paypal_environment_invalid");
  });

  it("rejects a configured environment without credentials", async () => {
    const { getPaypalConfig } = await import("@/lib/paypal.server");
    process.env["PAYPAL_ENVIRONMENT"] = "live";
    expect(() => getPaypalConfig()).toThrow("paypal_credentials_missing");
  });

  it("reads the webhook id for the active environment and fails closed when absent", async () => {
    const { getPaypalWebhookId } = await import("@/lib/paypal.server");
    expect(getPaypalWebhookId("sandbox")).toBe("WEBHOOK123");
    delete process.env["PAYPAL_SANDBOX_WEBHOOK_ID"];
    expect(() => getPaypalWebhookId("sandbox")).toThrow("paypal_webhook_id_missing");
  });

  it("never puts credentials in the order payload it sends to PayPal", async () => {
    const mod = await import("@/lib/paypal.server");
    const fetchMock = vi
      .fn()
      // token request
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ access_token: "tok" }),
      })
      // order request
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ id: "ORDER123", links: [{ rel: "payer-action", href: "https://x" }] }),
      });
    vi.stubGlobal("fetch", fetchMock);

    await mod.createPaypalOrder(mod.getPaypalConfig(), {
      purchaseId: PURCHASE_ID,
      invoiceId: "LT-abc-123",
      amount: "20.00",
      currency: "ILS",
      returnUrl: "https://site/payment/return",
      cancelUrl: "https://site/payment/cancel",
    });

    const request = fetchMock.mock.calls[1][1];
    const body = String(request.body);
    const payload = JSON.parse(body);
    expect(body).not.toContain("test-secret");
    expect(body).not.toContain("test-id");
    expect(payload.intent).toBe("CAPTURE");
    expect(payload.purchase_units[0].custom_id).toBe(PURCHASE_ID);
    expect(payload.purchase_units[0].amount).toMatchObject({
      currency_code: "ILS",
      value: "20.00",
      breakdown: { item_total: { currency_code: "ILS", value: "20.00" } },
    });
    expect(payload.purchase_units[0].items).toEqual([
      expect.objectContaining({
        sku: "PREMIUM_LIFETIME",
        quantity: "1",
        category: "DIGITAL_GOODS",
        unit_amount: { currency_code: "ILS", value: "20.00" },
      }),
    ]);
    expect(payload).not.toHaveProperty("application_context");
    expect(request.headers["PayPal-Request-Id"]).toBe(`order-${PURCHASE_ID}`);
    expect(request.headers.Prefer).toBe("return=representation");
    vi.unstubAllGlobals();
  });

  it("fetches the authoritative order when Create Order is minimal", async () => {
    const mod = await import("@/lib/paypal.server");
    const fullOrder = {
      id: "ORDER123",
      status: "CREATED",
      purchase_units: [{ payee: { merchant_id: "MERCHANT1" } }],
      links: [{ rel: "payer-action", href: "https://paypal.test/approve" }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => fullOrder,
      });
    vi.stubGlobal("fetch", fetchMock);

    const result = await mod.ensurePaypalOrderRepresentation(mod.getPaypalConfig(), {
      id: "ORDER123",
      status: "CREATED",
      links: [{ rel: "payer-action", href: "https://paypal.test/approve" }],
    });

    expect(result).toEqual(fullOrder);
    expect(fetchMock.mock.calls[1][0]).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER123");
    vi.unstubAllGlobals();
  });

  it("requests a complete representation when capturing an order", async () => {
    const mod = await import("@/lib/paypal.server");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => goodOrder,
      });
    vi.stubGlobal("fetch", fetchMock);

    await mod.capturePaypalOrder(mod.getPaypalConfig(), "ORDER123", PURCHASE_ID);

    expect(fetchMock.mock.calls[1][0]).toBe("https://api-m.sandbox.paypal.com/v2/checkout/orders/ORDER123/capture");
    expect(fetchMock.mock.calls[1][1].headers.Prefer).toBe("return=representation");
    expect(fetchMock.mock.calls[1][1].headers["PayPal-Request-Id"]).toBe(`capture-${PURCHASE_ID}`);
    vi.unstubAllGlobals();
  });

  it("keeps the PayPal HTTP status available for safe stale-order recovery", async () => {
    const mod = await import("@/lib/paypal.server");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        headers: new Headers(),
        json: async () => ({ name: "RESOURCE_NOT_FOUND" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const error = await mod.getPaypalOrder(mod.getPaypalConfig(), "MISSING_ORDER").catch((cause) => cause);

    expect(error).toBeInstanceOf(mod.PaypalRequestError);
    expect(error.message).toBe("paypal_request_failed");
    expect(mod.isPaypalRequestError(error, 404)).toBe(true);
    expect(mod.isPaypalRequestError(error, 500)).toBe(false);
    vi.unstubAllGlobals();
  });

  it("verifies real webhook signatures with the environment-specific webhook id", async () => {
    const mod = await import("@/lib/paypal.server");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ access_token: "tok" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
        json: async () => ({ verification_status: "SUCCESS" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const webhookEvent = {
      id: "WH-1",
      event_type: "PAYMENT.CAPTURE.COMPLETED",
      resource: {},
    };
    const webhookEventRaw = JSON.stringify(webhookEvent, null, 2);
    const verified = await mod.verifyPaypalWebhookSignature(mod.getPaypalConfig(), {
      webhookId: mod.getPaypalWebhookId("sandbox"),
      authAlgo: "SHA256withRSA",
      certUrl: "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
      transmissionId: "TRANSMISSION-1",
      transmissionSignature: "signature",
      transmissionTime: "2026-08-26T03:00:00Z",
      webhookEventRaw,
    });

    expect(verified).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature",
    );
    const verificationBody = String(fetchMock.mock.calls[1][1].body);
    const payload = JSON.parse(verificationBody);
    expect(payload).toMatchObject({
      webhook_id: "WEBHOOK123",
      transmission_id: "TRANSMISSION-1",
      webhook_event: webhookEvent,
    });
    expect(verificationBody).toContain(`"webhook_event":${webhookEventRaw}`);
    expect(verificationBody).not.toContain("test-secret");
    vi.unstubAllGlobals();
  });

  it("rejects non-PayPal certificate URLs before signature verification", async () => {
    const mod = await import("@/lib/paypal.server");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      mod.verifyPaypalWebhookSignature(mod.getPaypalConfig(), {
        webhookId: "WEBHOOK123",
        authAlgo: "SHA256withRSA",
        certUrl: "https://attacker.example/v1/notifications/certs/CERT-1",
        transmissionId: "TRANSMISSION-1",
        transmissionSignature: "signature",
        transmissionTime: "2026-08-26T03:00:00Z",
        webhookEventRaw: "{}",
      }),
    ).rejects.toThrow("paypal_webhook_cert_url_invalid");
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
