import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { LegalModal } from "@/components/LegalModal";
import { cookieNotice, privacyPolicy } from "@/content/legal";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "cookie_consent_v1";

type Prefs = { essential: true; analytics: boolean; advertising: boolean };

function readStored(): Prefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return { essential: true, analytics: !!parsed.analytics, advertising: !!parsed.advertising };
  } catch {
    return null;
  }
}

function save(prefs: Prefs) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...prefs, savedAt: new Date().toISOString(), version: 1 }),
    );
  } catch {}
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [advertising, setAdvertising] = useState(true);

  useEffect(() => {
    if (!readStored()) setVisible(true);
  }, []);

  const acceptAll = () => {
    save({ essential: true, analytics: true, advertising: true });
    setVisible(false);
    setPrefsOpen(false);
  };

  const savePrefs = () => {
    save({ essential: true, analytics, advertising });
    setVisible(false);
    setPrefsOpen(false);
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
                <Button variant="outline" onClick={() => setPrefsOpen(true)}>
                  ניהול העדפות
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl text-gradient-sunset text-right">
              ניהול העדפות עוגיות
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-right text-sm">
            <PrefRow
              title="עוגיות חיוניות"
              desc="נדרשות לתפקוד בסיסי של המערכת ולשמירת ההתחברות. לא ניתן לכבות."
              checked
              disabled
              onChange={() => {}}
            />
            <PrefRow
              title="עוגיות ניתוח"
              desc="עוזרות לנו להבין כיצד נעשה שימוש במשחק ולשפר את החוויה."
              checked={analytics}
              onChange={setAnalytics}
            />
            <PrefRow
              title="עוגיות פרסום"
              desc="משמשות להצגת פרסומות מותאמות אישית ולמדידת ביצועיהן."
              checked={advertising}
              onChange={setAdvertising}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={savePrefs} className="sm:order-1">
              שמירת העדפות
            </Button>
            <Button
              onClick={acceptAll}
              className="bg-gradient-sunset text-white shadow-glow hover:opacity-90 font-semibold sm:order-2"
            >
              אישור הכל
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LegalModal open={privacyOpen} onOpenChange={setPrivacyOpen} doc={privacyPolicy} />
    </>
  );
}

function PrefRow({
  title,
  desc,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border bg-card">
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}
