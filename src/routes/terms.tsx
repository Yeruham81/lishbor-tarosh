import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { termsOfUse } from "@/content/legal";
import { canonical, NOINDEX_META, publicPageMeta } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      ...publicPageMeta({
        title: "תנאי שימוש | לשבור ת'ראש",
        description: "תנאי השימוש במשחק לשבור ת'ראש, כללי החשבון, ניקוד, תוכן משתמש והתנהגות מותרת.",
        path: "/terms",
      }),
      NOINDEX_META,
    ],
    links: [canonical("/terms")],
  }),
});

function TermsPage() {
  return (
    <AppShell>
      <LegalDocumentPage doc={termsOfUse} />
    </AppShell>
  );
}
