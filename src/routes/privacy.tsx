import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { LegalDocumentPage } from "@/components/LegalDocumentPage";
import { privacyPolicy } from "@/content/legal";
import { canonical, NOINDEX_META, publicPageMeta } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      ...publicPageMeta({
        title: "מדיניות פרטיות | לשבור ת'ראש",
        description: "מדיניות הפרטיות של משחק לשבור ת'ראש והסבר על איסוף מידע, עוגיות ושירותי צד שלישי.",
        path: "/privacy",
      }),
      NOINDEX_META,
    ],
    links: [canonical("/privacy")],
  }),
});

function PrivacyPage() {
  return (
    <AppShell>
      <LegalDocumentPage doc={privacyPolicy} />
    </AppShell>
  );
}
