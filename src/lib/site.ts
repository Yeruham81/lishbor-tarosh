/**
 * Central public site configuration.
 *
 * SITE_ORIGIN is the single source of truth for the project's permanent
 * primary production domain. Every absolute public URL — canonical links,
 * Open Graph / Twitter URLs, and sitemap entries — must be derived from it
 * instead of hard-coding a hostname in routes or components.
 *
 * Public metadata is intentionally NOT derived from the incoming request
 * hostname: preview / staging hosts must never leak into canonical or social
 * metadata.
 */
export const SITE_ORIGIN = "https://lishbor-tarosh.fun";

/** Site name used in Open Graph metadata. */
export const SITE_NAME = "לשבור ת'ראש";

/** Open Graph locale (Hebrew, Israel). */
export const SITE_LOCALE = "he_IL";

/** Build an absolute public URL from a route path (e.g. "/contact"). */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Canonical `links` entry for a public, indexable route. */
export function canonical(path: string) {
  return { rel: "canonical", href: absoluteUrl(path) } as const;
}

/** Meta entry marking a route as non-indexable. */
export const NOINDEX_META = {
  name: "robots",
  content: "noindex, nofollow",
} as const;

/**
 * Standard public page metadata helper.
 * Emits title/description plus matching Open Graph & Twitter tags and a
 * self-referencing og:url derived from SITE_ORIGIN.
 */
export function publicPageMeta(opts: { title: string; description: string; path: string; type?: string }) {
  const url = absoluteUrl(opts.path);
  return [
    { title: opts.title },
    { name: "description", content: opts.description },
    { property: "og:title", content: opts.title },
    { property: "og:description", content: opts.description },
    { property: "og:url", content: url },
    { property: "og:type", content: opts.type ?? "website" },
    { property: "og:locale", content: SITE_LOCALE },
    { name: "twitter:title", content: opts.title },
    { name: "twitter:description", content: opts.description },
  ];
}
