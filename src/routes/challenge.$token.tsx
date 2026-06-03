import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { getChallenge } from "@/lib/social.functions";
import { Trophy, Swords } from "lucide-react";

export const Route = createFileRoute("/challenge/$token")({ component: ChallengePage });

function ChallengePage() {
  const { token } = useParams({ from: "/challenge/$token" });
  const fetch = useServerFn(getChallenge);
  const { data, isLoading, error } = useQuery({
    queryKey: ["challenge", token],
    queryFn: () => fetch({ data: { token } }),
  });

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl" dir="rtl">
        <div className="text-center mb-6">
          <Swords className="size-12 mx-auto text-primary mb-2" />
          <h1 className="font-display text-4xl font-extrabold text-gradient-sunset">אתגר חברים</h1>
        </div>

        {isLoading && <div className="text-center py-10 text-muted-foreground">טוען...</div>}
        {error && <div className="text-center py-10 text-destructive">{(error as Error).message}</div>}

        {data && (
          <div className="bg-card border rounded-3xl shadow-card p-6 space-y-5">
            <p className="text-center text-lg">
              <span className="font-bold text-gradient-sunset">{data.challenger?.display_name ?? data.challenger?.username ?? "שחקן"}</span>{" "}
              מאתגר אותך לפתור את ההגדרה:
            </p>

            {data.clue && (
              <div className="bg-muted/40 rounded-2xl p-5 text-center">
                {data.clue.category && (
                  <span className="px-2.5 py-1 rounded-full bg-card text-xs text-muted-foreground">{data.clue.category}</span>
                )}
                <h2 className="font-display text-2xl font-bold mt-3">{data.clue.clue}</h2>
                <p className="text-xs text-muted-foreground mt-2">קושי: {"★".repeat(data.clue.difficulty ?? 1)}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="ניקוד" value={data.score} icon={<Trophy className="size-4" />} />
              <Stat label="טעויות" value={data.wrong} />
              <Stat label="רמזים" value={data.hints} />
            </div>

            <Link to="/play" className="block text-center py-3 rounded-xl bg-gradient-sunset text-white font-display font-bold shadow-glow hover:opacity-90 transition">
              קבל את האתגר ←
            </Link>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-2xl p-3">
      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">{icon}{label}</div>
      <div className="font-display text-2xl font-extrabold text-gradient-sunset">{value}</div>
    </div>
  );
}
