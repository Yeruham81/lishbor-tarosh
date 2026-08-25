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
  const json: any = await res.json();
  if (!json?.access_token) throw new Error("paypal_auth_failed");
  return json.access_token as string;
}

async function paypalFetch(
  cfg: PaypalConfig,
  path: string,
  init: { method: string; body?: unknown; requestId?: string },
): Promise<any> {
  const token = await getAccessToken(cfg);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (init.requestId) headers["PayPal-Request-Id"] = init.requestId;

  const res = await fetch(`${cfg.apiBase}${path}`, {
    method: init.method,
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
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
  return json;
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
  return paypalFetch(cfg, "/v2/checkout/orders", {
    method: "POST",
    requestId: `order-${args.purchaseId}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: args.purchaseId,
          invoice_id: args.invoiceId,
          amount: { currency_code: args.currency, value: args.amount },
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
      application_context: {
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: args.returnUrl,
        cancel_url: args.cancelUrl,
      },
    },
  });
}

export async function getPaypalOrder(cfg: PaypalConfig, orderId: string) {
  return paypalFetch(cfg, `/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    method: "GET",
  });
}

export async function capturePaypalOrder(
  cfg: PaypalConfig,
  orderId: string,
  purchaseId: string,
) {
  return paypalFetch(cfg, `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
    method: "POST",
    requestId: `capture-${purchaseId}`,
    body: {},
  });
}

/** Approval link the buyer must be redirected to. */
export function approvalUrl(order: any): string | null {
  const links: Array<{ rel?: string; href?: string }> = order?.links ?? [];
  const link = links.find((l) => l.rel === "payer-action" || l.rel === "approve");
  return link?.href ?? null;
}

export function payeeMerchantId(order: any): string | null {
  return order?.purchase_units?.[0]?.payee?.merchant_id ?? null;
}
