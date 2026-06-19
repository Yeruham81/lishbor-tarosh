import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDisplayNameStatus, confirmDisplayName } from "@/lib/account.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { UserCircle2, AlertTriangle } from "lucide-react";

const NICK_RE = /^[A-Za-z\u0590-\u05FF ]+$/;

export const PLAYER_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: "מתחילים" },
  { value: 2, label: "מתקדמים" },
  { value: 3, label: "מיומנים" },
  { value: 4, label: "מקצוענים" },
  { value: 5, label: "מומחים" },
];

const AGES = Array.from({ length: 100 - 18 + 1 }, (_, i) => 18 + i);

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
  const [age, setAge] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data && !data.confirmed) {
      const seed = (data.suggested ?? data.current ?? "").trim();
      setName(NICK_RE.test(seed) && seed.length <= 20 ? seed : "");
    }
  }, [data]);

  if (!user || !data || data.confirmed) return null;

  const trimmed = name.trim();
  const ageN = Number(age);
  const levelN = Number(level);
  const valid =
    trimmed.length >= 2 &&
    trimmed.length <= 20 &&
    NICK_RE.test(trimmed) &&
    Number.isInteger(ageN) &&
    ageN >= 18 &&
    ageN <= 100 &&
    Number.isInteger(levelN) &&
    levelN >= 1 &&
    levelN <= 5;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await doConfirm({ data: { displayName: trimmed, age: ageN, playerLevel: levelN } });
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
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      dir="rtl"
    >
      <form
        onSubmit={onSubmit}
        className="bg-card border rounded-3xl shadow-glow p-6 sm:p-8 max-w-md w-full space-y-4 max-h-[95vh] overflow-y-auto"
      >
        <div className="text-center">
          <UserCircle2 className="size-12 mx-auto text-primary mb-2" />
          <h2 className="font-display text-2xl font-extrabold text-gradient-sunset">עוד רגע מתחילים</h2>
          <p className="text-sm text-muted-foreground mt-3">כמה פרטים שיעזרו לנו להתאים את המשחק אליכם</p>
        </div>
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
        <div>
          <div className="flex items-center gap-2 bg-warning/10 border border-warning/30 rounded-xl px-3 py-1.5 text-xs mb-3">
            <AlertTriangle className="size-4 text-warning shrink-0" />
            <p className="text-foreground/90">שימו לב, את הכינוי לא תוכלו לשנות בהמשך</p>
          </div>
          <label className="block text-sm font-medium mb-1">גיל</label>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            aria-label="גיל"
            className="w-full px-4 py-3 rounded-xl border bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">בני כמה אתם?</option>
            {AGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">רמה</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="רמה"
            className="w-full px-4 py-3 rounded-xl border bg-background text-right focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">איך אתם בהגדרות היגיון?</option>
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
