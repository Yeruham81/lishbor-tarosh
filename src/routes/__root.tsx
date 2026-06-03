import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "sonner";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "לשבור ת'ראש - המשחק שעושה היגיון" },
      { name: "description", content: "כי זה לא רק מה שאתם יודעים - זה גם איך אתם חושבים" },
      { property: "og:title", content: "לשבור ת'ראש - המשחק שעושה היגיון" },
      { name: "twitter:title", content: "לשבור ת'ראש - המשחק שעושה היגיון" },
      { property: "og:description", content: "כי זה לא רק מה שאתם יודעים - זה גם איך אתם חושבים" },
      { name: "twitter:description", content: "כי זה לא רק מה שאתם יודעים - זה גם איך אתם חושבים" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8565aeaa-bdfe-497b-8df7-81d2200a0f3a/id-preview-13d14430--d79e643b-116e-498a-bdf8-db5043b3e68e.lovable.app-1780450609409.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/8565aeaa-bdfe-497b-8df7-81d2200a0f3a/id-preview-13d14430--d79e643b-116e-498a-bdf8-db5043b3e68e.lovable.app-1780450609409.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors dir="rtl" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
