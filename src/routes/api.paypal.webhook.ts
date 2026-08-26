import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { parsePaypalWebhookEvent, readPaypalWebhookSignatureHeaders } from "@/lib/paypal-webhook";

const MAX_WEBHOOK_BYTES = 256 * 1024;

function response(status: number, body: string | null = null): Response {
  return new Response(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export const Route = createFileRoute("/api/paypal/webhook")({
  server: {
    handlers: {
      GET: async () => response(200, "paypal_webhook_ready"),
      POST: async ({ request }) => {
        const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
        if (!contentType.startsWith("application/json"))
          return response(415, "unsupported_media_type");

        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
          return response(413, "payload_too_large");
        }

        const signatureHeaders = readPaypalWebhookSignatureHeaders(request.headers);
        if (!signatureHeaders) return response(400, "webhook_headers_missing");

        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_WEBHOOK_BYTES) {
          return response(413, "payload_too_large");
        }

        let webhookEvent: unknown;
        try {
          webhookEvent = JSON.parse(rawBody) as unknown;
        } catch {
          return response(400, "invalid_json");
        }

        try {
          const { getPaypalConfig, getPaypalWebhookId, verifyPaypalWebhookSignature } =
            await import("@/lib/paypal.server");
          const cfg = getPaypalConfig();
          const webhookId = getPaypalWebhookId(cfg.environment);
          const verified = await verifyPaypalWebhookSignature(cfg, {
            webhookId,
            ...signatureHeaders,
            webhookEventRaw: rawBody,
          });
          if (!verified) return response(401, "invalid_signature");

          const parsed = parsePaypalWebhookEvent(webhookEvent);
          if (parsed.kind === "invalid") return response(400, "invalid_event");
          if (parsed.kind === "ignored") return response(204);

          const { processVerifiedPaypalWebhook } = await import("@/lib/paypal-webhook.server");
          await processVerifiedPaypalWebhook(cfg, parsed);
          return response(204);
        } catch (error) {
          const code = error instanceof Error ? error.message : "unknown";
          if (code === "paypal_webhook_cert_url_invalid") {
            return response(400, "invalid_certificate_url");
          }
          console.error("[paypal-webhook] processing failed", { code });
          return response(503, "webhook_processing_unavailable");
        }
      },
    },
  },
});
