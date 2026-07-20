import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDisplayNameStatus, confirmDisplayName } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { UserCircle2, AlertTriangle } from "lucide-react";

const NICK_RE = /^[A-Za-z\u0590-\u05FF0-9 .,_-]{2,20}$/;
const normalizeNick = (s: string) => s.replace(/\s+/g, " ").trim();

export const PLAYER_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "מתחילים" },
  { value: 2, label: "מתקדמים" },
  { value: 3, label: "מיומנים" },
  { value: 4, label: "מקצוענים" },
  { value: 5, label: "מומחים" },
];

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
  const [level, setLevel] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !data.confirmed) {
      const seed = (data.suggested ?? data.current ?? "").trim();
      setName(NICK_RE.test(seed) && seed.length <= 20 ? seed : "");
    }
  }, [data]);

  if (!user || !data || data.confirmed) return null;

  const trimmed = normalizeNick(name);
  const levelN = Number(level);

  const valid = NICK_RE.test(trimmed) && Number.isInteger(levelN) && levelN >= 1 && levelN <= 5;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;

    setBusy(true);

    try {
      await doConfirm({
        data: {
          displayName: trimmed,
          playerLevel: levelN,
        },
      });

      toast.success("הכינוי שבחרתם נשמר. ברוכים הבאים! 🎉");

      await qc.invalidateQueries({
        queryKey: ["display-name-status"],
      });
      await qc.invalidateQueries({
        queryKey: ["profile"],
      });
      await qc.invalidateQueries({
        queryKey: ["stats"],
      });
    } catch (e: any) {
      toast.error(e.message ?? "שגיאה");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
    >
      <form onSubmit={onSubmit} className="bg-card border rounded-3xl shadow-glow p-5 sm:p-6 max-w-sm w-full space-y-3">
        <div className="text-center">
          <UserCircle2 className="size-10 mx-auto text-primary mb-2" />

          <h2 className="font-display text-2xl font-extrabold text-gradient-sunset">עוד רגע מתחילים</h2>

          <p className="text-sm text-muted-foreground mt-2">כמה פרטים שיעזרו לנו להתאים את המשחק אליכם</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">בחרו כינוי</label>

          <input
            dir="auto"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            aria-label="כינוי"
            placeholder="כינוי"
            className="w-full px-4 py-3 rounded-xl border bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary"
          />

          <p className="text-xs text-muted-foreground mt-1">בעברית או באנגלית, עם או בלי רווחים, עד 20 תווים</p>
        </div>

        <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-1.5 text-xs">
          <AlertTriangle className="size-4 text-warning shrink-0" />

          <p className="text-foreground/90">שימו לב, את הכינוי לא תוכלו לשנות בהמשך</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">רמה</label>

          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="רמה"
            className="w-full px-4 py-3 rounded-xl border bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">איך אתם בפתירת הגדרות היגיון?</option>

            {PLAYER_LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
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
