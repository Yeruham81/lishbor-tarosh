import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDisplayNameStatus, confirmDisplayName } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { UserCircle2 } from "lucide-react";

export function DisplayNameSetup() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getDisplayNameStatus);
  const doConfirm = useServerFn(confirmDisplayName);
  const { data } = useQuery({
    queryKey: ["display-name-status"],
    queryFn: () => fetchStatus(),
    enabled: !!user,
  });

  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !data.confirmed) {
      setName(data.suggested ?? data.current ?? "");
    }
  }, [data]);

  if (!user || !data || data.confirmed) return null;

  const trimmed = name.trim();
  const valid = trimmed.length >= 1 && trimmed.length <= 40;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await doConfirm({ data: { displayName: trimmed } });
      toast.success("שם התצוגה נשמר. ברוך הבא! 🎉");
      await qc.invalidateQueries({ queryKey: ["display-name-status"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      await qc.invalidateQueries({ queryKey: ["stats"] });
    } catch (e: any) {
      toast.error(e.message ?? "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <form
        onSubmit={onSubmit}
        className="bg-card border rounded-3xl shadow-glow p-6 sm:p-8 max-w-md w-full space-y-5"
      >
        <div className="text-center">
          <UserCircle2 className="size-12 mx-auto text-primary mb-2" />
          <h2 className="font-display text-2xl font-extrabold text-gradient-sunset">
            איך לקרוא לך?
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            בחרו את השם שיוצג בטבלת המובילים ובפרופיל.
            <br />
            <span className="font-semibold text-foreground">שם התצוגה הוא קבוע ולא ניתן לשינוי בהמשך.</span>
          </p>
        </div>

        {data.suggested && (
          <p className="text-xs text-center text-muted-foreground">
            הצענו לך שם על-פי החשבון שלך — תוכל לערוך אם תרצה.
          </p>
        )}

        <input
          dir="rtl"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="שם פרטי, שם מלא או כינוי"
          className="w-full px-4 py-3 rounded-xl border bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="text-xs text-muted-foreground text-right">
          • מותר שם פרטי, שם מלא או כינוי<br />
          • מותר ששחקנים שונים יבחרו אותו שם
        </div>

        <button
          type="submit"
          disabled={!valid || busy}
          className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 disabled:opacity-50 transition"
        >
          {busy ? "שומר..." : "אישור והמשך"}
        </button>
      </form>
    </div>
  );
}
