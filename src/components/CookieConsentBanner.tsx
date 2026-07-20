import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { LegalModal } from "@/components/LegalModal";
import { cookieNotice, privacyPolicy } from "@/content/legal";
import { Cookie } from "lucide-react";
import {
  openCookiePreferences,
  readConsent,
  saveConsent,
  CONSENT_CHANGED_EVENT,
} from "@/lib/ads/consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    const sync = () => setVisible(!readConsent());
    sync();
    const onChanged = () => sync();
    const onStorage = (e: StorageEvent) => {
      if (e.key === "cookie_consent_v1") sync();
    };
    window.addEventListener(CONSENT_CHANGED_EVENT, onChanged as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CONSENT_CHANGED_EVENT, onChanged as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const acceptAll = () => {
    saveConsent({ analytics: true, advertising: true });
  };
  const rejectOptional = () => {
    saveConsent({ analytics: false, advertising: false });
  };

  if (!visible) return null;

  return (
    <>
      <div
        dir="rtl"
        className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 pointer-events-none"
        role="dialog"
        aria-label="הודעת שימוש בעוגיות"
      >
        <div className="pointer-events-auto mx-auto max-w-3xl bg-card border shadow-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="hidden sm:flex p-2 rounded-xl bg-gradient-sunset text-white shrink-0">
              <Cookie className="size-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="font-display font-bold text-lg">{cookieNotice.title}</h2>
              <p className="text-sm text-muted-foreground">{cookieNotice.intro}</p>
              <ul className="list-disc pe-5 text-sm text-muted-foreground space-y-0.5 marker:text-primary">
                {cookieNotice.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">{cookieNotice.outro}</p>
              <p className="text-xs text-muted-foreground">
                המשחק ממומן באמצעות פרסומות. גם אם לא תאשרו פרסום מותאם אישית, ייתכן שיוצגו פרסומות שאינן
                מותאמות אישית או פרסומות מוגבלות.
              </p>
              <p className="text-sm">
                למידע נוסף ראו את{" "}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="text-primary font-semibold underline-offset-2 hover:underline"
                >
                  מדיניות פרטיות
                </button>
                .
              </p>
              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <Button
                  onClick={acceptAll}
                  className="bg-gradient-sunset text-white shadow-glow hover:opacity-90 font-semibold"
                >
                  אישור הכל
                </Button>
                <Button variant="outline" onClick={rejectOptional}>
                  דחיית עוגיות לא חיוניות
                </Button>
                <Button variant="ghost" onClick={openCookiePreferences}>
                  ניהול העדפות
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LegalModal open={privacyOpen} onOpenChange={setPrivacyOpen} doc={privacyPolicy} />
    </>
  );
}
