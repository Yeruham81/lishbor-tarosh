/**
 * Server-only PayPal configuration + Orders v2 client.
 *
 * Credentials and the active environment come exclusively from backend
 * secrets, read at request time (never at module scope). Nothing here is
 * ever exposed to the browser and no credential is logged.
 */

const API_BASES = {
  sandbox: "https://api-m.sandbox.paypal.com",
  live: "https://api-m.paypal.com",
} as const;

export type PaypalEnvironment = keyof typeof API_BASES;

export interface PaypalConfig {
  environment: PaypalEnvironment;
  apiBase: string;
  clientId: string;
  clientSecret: string;
}

export interface PaypalWebhookVerificationArgs {
  webhookId: string;
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSignature: string;
  transmissionTime: string;
  webhookEventRaw: string;
}

export interface PaypalOrder {
  id?: string;
  status?: string;
  purchase_units?: Array<{
    payee?: { merchant_id?: string };
    [key: string]: unknown;
  }>;
  links?: Array<{ rel?: string; href?: string }>;
  [key: string]: unknown;
}

export function getPaypalConfig(): PaypalConfig {
  const raw = (process.env["PAYPAL_ENVIRONMENT"] ?? "").trim().toLowerCase();
  if (raw !== "sandbox" && raw !== "live") {
    throw new Error("paypal_environment_invalid");
  }
  const environment = raw as PaypalEnvironment;
  const prefix = environment === "sandbox" ? "PAYPAL_SANDBOX" : "PAYPAL_LIVE";
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) {
    throw new Error("paypal_credentials_missing");
  }
  return { environment, apiBase: API_BASES[environment], clientId, clientSecret };
}

/** Webhook IDs are app- and environment-specific and remain server-side. */
export function getPaypalWebhookId(environment: PaypalEnvironment): string {
  const name = environment === "sandbox" ? "PAYPAL_SANDBOX_WEBHOOK_ID" : "PAYPAL_LIVE_WEBHOOK_ID";
  const webhookId = process.env[name]?.trim();
  if (!webhookId) throw new Error("paypal_webhook_id_missing");
  return webhookId;
}

async function getAccessToken(cfg: PaypalConfig): Promise<string> {
  const basic = btoa(`${cfg.clientId}:${cfg.clientSecret}`);
  const res = await fetch(`${cfg.apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    console.error("[paypal] oauth failed", {
      status: res.status,
      debugId: res.headers.get("paypal-debug-id"),
      environment: cfg.environment,
    });
    throw new Error("paypal_auth_failed");
  }
  const json = (await res.json()) as { access_token?: string };
  if (!json?.access_token) throw new Error("paypal_auth_failed");
  return json.access_token as string;
}

async function paypalFetch<T>(
  cfg: PaypalConfig,
  path: string,
  init: {
    method: string;
    body?: unknown;
    rawBody?: string;
    requestId?: string;
    prefer?: "return=representation";
  },
): Promise<T> {
  const token = await getAccessToken(cfg);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;
  if (init.prefer) headers.Prefer = init.prefer;

  const res = await fetch(`${cfg.apiBase}${path}`, {
    method: init.method,
    headers,
    body: init.rawBody ?? (init.body ? JSON.stringify(init.body) : undefined),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[paypal] request failed", {
      path,
      status: res.status,
      debugId: res.headers.get("paypal-debug-id"),
      environment: cfg.environment,
    });
    throw new Error("paypal_request_failed");
  }
  return json as T;
}

export interface CreateOrderArgs {
  purchaseId: string;
  invoiceId: string;
  amount: string;
  currency: string;
  returnUrl: string;
  cancelUrl: string;
}

export async function createPaypalOrder(cfg: PaypalConfig, args: CreateOrderArgs) {
  return paypalFetch<PaypalOrder>(cfg, "/v2/checkout/orders", {
    method: "POST",
    requestId: `order-${args.purchaseId}`,
    prefer: "return=representation",
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: args.purchaseId,
          invoice_id: args.invoiceId,
          description: "לשבור ת'ראש — גרסת פרימיום",
          amount: {
            currency_code: args.currency,
            value: args.amount,
            breakdown: {
              item_total: { currency_code: args.currency, value: args.amount },
            },
          },
          items: [
            {
              name: "לשבור ת'ראש — גרסת פרימיום",
              sku: "PREMIUM_LIFETIME",
              quantity: "1",
              category: "DIGITAL_GOODS",
              unit_amount: { currency_code: args.currency, value: args.amount },
            },
          ],
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: args.returnUrl,
            cancel_url: args.cancelUrl,
          },
        },
      },
    },
  });
}

export async function getPaypalOrder(cfg: PaypalConfig, orderId: string) {
  return paypalFetch<PaypalOrder>(cfg, `/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

export async function capturePaypalOrder(cfg: PaypalConfig, orderId: string, purchaseId: string) {
  return paypalFetch<PaypalOrder>(cfg, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    requestId: `capture-${purchaseId}`,
    prefer: "return=representation",
    body: {},
  });
}

function isAllowedPaypalCertificateUrl(cfg: PaypalConfig, value: string): boolean {
  try {
    const url = new URL(value);
    const expectedHosts =
      cfg.environment === "sandbox"
        ? new Set(["api.sandbox.paypal.com", "api-m.sandbox.paypal.com"])
        : new Set(["api.paypal.com", "api-m.paypal.com"]);
    return (
      url.protocol === "https:" &&
      expectedHosts.has(url.hostname) &&
      url.port === "" &&
      url.username === "" &&
      url.password === "" &&
      url.pathname.startsWith("/v1/notifications/certs/")
    );
  } catch {
    return false;
  }
}

/** Verify a real webhook by posting its signed fields back to PayPal. */
export async function verifyPaypalWebhookSignature(
  cfg: PaypalConfig,
  args: PaypalWebhookVerificationArgs,
): Promise<boolean> {
  if (!isAllowedPaypalCertificateUrl(cfg, args.certUrl)) {
    throw new Error("paypal_webhook_cert_url_invalid");
  }

  // Keep webhook_event byte-for-byte as received. PayPal warns that parsing and
  // re-serializing the event can invalidate postback verification.
  const verificationBody = [
    "{",
    `"auth_algo":${JSON.stringify(args.authAlgo)},`,
    `"cert_url":${JSON.stringify(args.certUrl)},`,
    `"transmission_id":${JSON.stringify(args.transmissionId)},`,
    `"transmission_sig":${JSON.stringify(args.transmissionSignature)},`,
    `"transmission_time":${JSON.stringify(args.transmissionTime)},`,
    `"webhook_id":${JSON.stringify(args.webhookId)},`,
    `"webhook_event":${args.webhookEventRaw}`,
    "}",
  ].join("");

  const result = await paypalFetch<{ verification_status?: string }>(
    cfg,
    "/v1/notifications/verify-webhook-signature",
    {
      method: "POST",
      rawBody: verificationBody,
    },
  );

  return result.verification_status === "SUCCESS";
}

/** Approval link the buyer must be redirected to. */
export function approvalUrl(order: PaypalOrder): string | null {
  const links = order.links ?? [];
  const link = links.find((l) => l.rel === "payer-action" || l.rel === "approve");
  return link?.href ?? null;
}

export function payeeMerchantId(order: PaypalOrder): string | null {
  return order?.purchase_units?.[0]?.payee?.merchant_id ?? null;
}

/** Fetch the full authoritative order when Create Order returned minimally. */
export async function ensurePaypalOrderRepresentation(cfg: PaypalConfig, order: PaypalOrder) {
  if (order?.id && approvalUrl(order) && payeeMerchantId(order)) return order;
  if (!order?.id) throw new Error("paypal_order_invalid");
  return getPaypalOrder(cfg, order.id);
}
