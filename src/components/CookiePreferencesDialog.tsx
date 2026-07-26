import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { OPEN_COOKIE_PREFERENCES_EVENT, readConsent, saveConsent } from "@/lib/ads/consent";
import { toast } from "sonner";
/** * Globally-mounted preferences dialog. Opens whenever any component * dispatches `openCookiePreferences()`. Reuses the centralized consent * storage — never touches localStorage directly. */ export function CookiePreferencesDialog() {
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [advertising, setAdvertising] = useState(false);
  useEffect(() => {
    const handler = () => {
      const rec = readConsent();
      setAnalytics(rec ? rec.analytics : false);
      setAdvertising(rec ? rec.advertising : false);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler);
    return () => window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, handler);
  }, []);

  const savePrefs = () => {
    saveConsent({ analytics, advertising });
    setOpen(false);
    toast.success("ההעדפות נשמרו");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {" "}
      <DialogContent dir="rtl" className="max-w-md">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle className="font-display text-xl text-gradient-sunset text-right">
            {" "}
            ניהול העדפות עוגיות{" "}
          </DialogTitle>{" "}
        </DialogHeader>{" "}
        <div className="space-y-3 text-right text-sm">
          {" "}
          <PrefRow
            title="עוגיות חיוניות"
            desc="נדרשות לתפקוד בסיסי של המערכת ולשמירת ההתחברות. לא ניתן לכבות."
            checked
            disabled
            onChange={() => {}}
          />{" "}
          <PrefRow
            title="עוגיות ניתוח"
            desc="עוזרות לנו להבין כיצד נעשה שימוש במשחק ולשפר את החוויה."
            checked={analytics}
            onChange={setAnalytics}
          />{" "}
          <PrefRow
            title="פרסום מותאם אישית"
            desc="מאפשר שימוש בנתונים לצורך התאמת הפרסומות. גם ללא הסכמה עשויות להופיע פרסומות שאינן מותאמות אישית או פרסומות מוגבלות."
            checked={advertising}
            onChange={setAdvertising}
          />{" "}
        </div>{" "}
        <DialogFooter>
          {" "}
          <Button
            onClick={savePrefs}
            className="bg-gradient-sunset text-white shadow-glow hover:opacity-90 font-semibold"
          >
            {" "}
            שמירה ואישור{" "}
          </Button>{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
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
      {" "}
      <div className="flex-1">
        {" "}
        <div className="font-semibold">{title}</div> <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>{" "}
      </div>{" "}
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />{" "}
    </div>
  );
}
