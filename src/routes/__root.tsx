import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts, useRouterState } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";
import { SITE_LOCALE, SITE_NAME, absoluteUrl } from "@/lib/site";
import { usePrefsApplier } from "@/hooks/use-prefs-applier";
import { screenReaderRouteName } from "@/lib/profile-preferences";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      {
        name: "google-adsense-account",
        content: "ca-pub-6833431679534018",
      },
      {
        name: "google-site-verification",
        content: "yhd3M3CXpBLtYgSwHzkM3XqIkK4bCy4ULaavjCZdyVE",
      },
      { title: "לשבור ת'ראש - המשחק שעושה היגיון" },
      { name: "description", content: "כי זה לא רק מה אתם יודעים - זה גם איך אתם חושבים" },
      { property: "og:title", content: "לשבור ת'ראש - המשחק שעושה היגיון" },
      { name: "twitter:title", content: "לשבור ת'ראש - המשחק שעושה היגיון" },
      { property: "og:description", content: "כי זה לא רק מה אתם יודעים - זה גם איך אתם חושבים" },
      { name: "twitter:description", content: "כי זה לא רק מה אתם יודעים - זה גם איך אתם חושבים" },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:locale", content: SITE_LOCALE },
      { property: "og:url", content: absoluteUrl("/") },
      {
  property: "og:image",
  content: absoluteUrl("/lishbor-tarosh-og.jpg"),
},
{
  name: "twitter:image",
  content: absoluteUrl("/lishbor-tarosh-og.jpg"),
},
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "icon", type: "image/x-icon", href: "/favicon.jpg" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800;900&family=Heebo:wght@300;400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <GlobalProfilePreferences />
        <Outlet />
        <Toaster position="top-center" richColors dir="rtl" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function GlobalProfilePreferences() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const preferences = usePrefsApplier();

  if (!preferences.screen_reader) return null;

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {`עברת לעמוד ${screenReaderRouteName(pathname)}`}
    </p>
  );
}
