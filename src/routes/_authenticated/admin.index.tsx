import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, StatCard, StatusBadge } from "@/components/admin/AdminUI";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Users, AlertTriangle } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  adminKpis, adminListDefinitions, adminListSubmissions, adminListPlayers, adminContentHealth,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const kpisFn = useServerFn(adminKpis);
  const defsFn = useServerFn(adminListDefinitions);
  const subsFn = useServerFn(adminListSubmissions);
  const playersFn = useServerFn(adminListPlayers);
  const healthFn = useServerFn(adminContentHealth);

  const kpis = useQuery({ queryKey: ["admin", "kpis"], queryFn: () => kpisFn({ data: { activeWindowDays: 7 } }) });
  const defs = useQuery({ queryKey: ["admin", "defs", "recent"], queryFn: () => defsFn({ data: { limit: 5, offset: 0 } }) });
  const subs = useQuery({ queryKey: ["admin", "subs", "recent"], queryFn: () => subsFn({ data: { status: "all", limit: 5, offset: 0 } }) });
  const players = useQuery({ queryKey: ["admin", "players", "recent"], queryFn: () => playersFn({ data: { limit: 5, offset: 0 } }) });
  const lowSuccess = useQuery({ queryKey: ["admin", "health", "low"], queryFn: () => healthFn({ data: { flag: "low_success_rate", limit: 200 } }) });
  const highDis = useQuery({ queryKey: ["admin", "health", "dis"], queryFn: () => healthFn({ data: { flag: "high_dislikes", limit: 200 } }) });
  const missingHint = useQuery({ queryKey: ["admin", "health", "hint"], queryFn: () => healthFn({ data: { flag: "missing_hint", limit: 500 } }) });
  const missingExp = useQuery({ queryKey: ["admin", "health", "exp"], queryFn: () => healthFn({ data: { flag: "missing_explanation", limit: 500 } }) });

  const k: any = kpis.data ?? {};
  const fmt = (n: any) => (typeof n === "number" ? n.toLocaleString("he-IL") : (n ?? "—"));
  const statusHe = (s: string) =>
    ({ active: "פעיל", draft: "טיוטה", inactive: "לא פעיל", archived: "בארכיון", hidden: "מוסתר", pending: "ממתין", approved: "אושר", rejected: "נדחה" }[s] ?? s);

  return (
    <div>
      <PageHeader
        title="לוח בקרה"
        description="סקירה כללית של המערכת"
        actions={
          <>
            <Button asChild><Link to="/admin/definitions"><Plus className="size-4 ml-1" /> הגדרה חדשה</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/submissions">הצעות</Link></Button>
            <Button variant="outline" asChild><Link to="/admin/players">שחקנים</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        <StatCard label="סה״כ שחקנים" value={fmt(k.total_players)} hint={`פעילים השבוע: ${fmt(k.active_players)}`} tone="primary" />
        <StatCard label="הגדרות פעילות" value={fmt(k.total_definitions)} hint={`טיוטות: ${fmt(k.draft_definitions)}`} />
        <StatCard label="הגדרות ממתינות לאישור" value={fmt(k.pending_submissions)} hint="הצעות שחקנים" tone="warning" />
        <StatCard label="סה״כ הגדרות נפתרו" value={fmt(k.total_solves)} tone="success" />
        <StatCard label="פניות חדשות" value={fmt(k.new_messages)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base"><FileText className="size-4 inline ml-1" /> הגדרות אחרונות</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/admin/definitions">הצג הכל</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>מזהה</TableHead><TableHead>הגדרה</TableHead><TableHead>פתרון</TableHead><TableHead>סטטוס</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(defs.data?.rows ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{String(r.id).slice(0, 8)}</TableCell>
                    <TableCell className="max-w-[280px] truncate">{r.clue}</TableCell>
                    <TableCell className="font-semibold">{r.answer}</TableCell>
                    <TableCell><StatusBadge status={statusHe(r.status)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base"><AlertTriangle className="size-4 inline ml-1 text-amber-500" /> אירועים למעקב</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <AttentionRow count={lowSuccess.data?.length ?? 0} label="הגדרות עם אחוז הצלחה נמוך" tone="warning" />
            <AttentionRow count={highDis.data?.length ?? 0} label="הגדרות עם הרבה דיסלייקים" tone="destructive" />
            <AttentionRow count={missingHint.data?.length ?? 0} label="חסר רמז" />
            <AttentionRow count={missingExp.data?.length ?? 0} label="חסר הסבר" />
            <AttentionRow count={k.pending_submissions ?? 0} label="הצעות ממתינות לאישור" tone="warning" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">הגדרות מוצעות</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/admin/submissions">הצג הכל</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>מזהה</TableHead><TableHead>שחקן</TableHead><TableHead>הגדרה</TableHead><TableHead>סטטוס</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(subs.data?.rows ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{String(r.id).slice(0, 8)}</TableCell>
                    <TableCell>{r.profiles?.display_name ?? r.profiles?.username ?? "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{r.edited_clue ?? r.clue_text}</TableCell>
                    <TableCell><StatusBadge status={statusHe(r.status)} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base"><Users className="size-4 inline ml-1" /> שחקנים מובילים</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link to="/admin/players">הצג הכל</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead>שם משתמש</TableHead><TableHead>ניקוד</TableHead><TableHead>רצף</TableHead><TableHead>פעילות אחרונה</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {(players.data?.rows ?? []).map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.display_name ?? r.username}</TableCell>
                    <TableCell className="font-semibold">{fmt(r.total_score)}</TableCell>
                    <TableCell>{r.current_streak ?? 0}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("he-IL") : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AttentionRow({ count, label, tone = "default" }: { count: number; label: string; tone?: "default" | "warning" | "destructive" }) {
  const toneClass =
    tone === "warning" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
    : tone === "destructive" ? "bg-destructive/15 text-destructive border-destructive/30"
    : "";
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition">
      <span className="text-sm">{label}</span>
      <Badge variant="outline" className={toneClass}>{count}</Badge>
    </div>
  );
}
