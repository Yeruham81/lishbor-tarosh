import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDisplayNameStatus, confirmDisplayName } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { UserCircle2, AlertTriangle } from "lucide-react";

// Nickname rules (kept in sync with server-side validation in account.functions.ts):
// 2–20 chars, Hebrew/English letters and spaces only.
const NICK_RE = /^[A-Za-z\u0590-\u05FF ]+$/;

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
      const seed = (data.suggested ?? data.current ?? "").trim();
      // Only seed if it already matches the allowed character set
      setName(NICK_RE.test(seed) && seed.length <= 20 ? seed : "");
    }
  }, [data]);

  if (!user || !data || data.confirmed) return null;

  const trimmed = name.trim();
  const valid = trimmed.length >= 2 && trimmed.length <= 20 && NICK_RE.test(trimmed);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await doConfirm({ data: { displayName: trimmed } });
      toast.success("הכינוי שבחרתם נשמר. ברוכים הבאים! 🎉");
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
            בחרו כינוי
          </h2>
          <p className="text-sm text-muted-foreground mt-3">
            בעברית או באנגלית, עם או בלי רווחים, עד 20 תווים
          </p>
        </div>

        <input
          dir="auto"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          aria-label="כינוי"
          className="w-full px-4 py-3 rounded-xl border bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary"
        />

        <div className="flex items-start gap-2 bg-warning/10 border border-warning/30 rounded-xl p-3 text-sm">
          <AlertTriangle className="size-4 text-warning shrink-0 mt-0.5" />
          <p className="text-foreground/90">
            שימו לב, הכינוי הוא קבוע ולא תוכלו לשנות אותו בהמשך
          </p>
        </div>

        <button
          type="submit"
          disabled={!valid || busy}
          className="w-full py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 disabled:opacity-50 transition"
        >
          {busy ? "שומר..." : "יאללה למשחק"}
        </button>
      </form>
    </div>
  );
}
