import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Guards that no PayPal credential, OAuth token or merchant identity is
 * committed to the repository or reachable from client code.
 */
describe("no PayPal secrets in the repository", () => {
  const grep = (pattern: string, paths: string) => {
    try {
      return execSync(`rg -n --hidden -g '!node_modules' -g '!.git' -g '!bun.lock' ${pattern} ${paths}`, {
        encoding: "utf8",
      }).trim();
    } catch {
      return "";
    }
  };

  it("contains no PayPal client secret / token literals", () => {
    const hits = grep(
      "-e 'A21A[A-Za-z0-9_-]{20,}' -e 'E[A-Za-z0-9_-]{20,}client_secret' -e 'access_token\\\\s*=\\\\s*\\\"'",
      "src public supabase",
    );
    expect(hits).toBe("");
  });

  it("keeps credential env reads out of client-reachable modules", () => {
    const hits = grep("'PAYPAL_(SANDBOX|LIVE)_CLIENT_(ID|SECRET)'", "src")
      .split("\n")
      .filter(Boolean)
      .filter((line) => !line.startsWith("src/lib/paypal.server.ts"))
      .filter((line) => !line.startsWith("src/lib/__tests__/"));
    expect(hits).toEqual([]);
  });

  it("never exposes PayPal config through VITE_ variables", () => {
    expect(grep("'VITE_PAYPAL'", "src .env* vite.config.ts")).toBe("");
  });
});
