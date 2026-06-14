import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader, TableToolbar, SortableHead, StatusBadge, DataTableShell, StatCard,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListPlayers, adminAdjustPoints, adminSetBlocked, adminKpis, adminExport,
} from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX } from "@/lib/admin-export";

export const Route = createFileRoute("/_authenticated/admin/players")({
  component: PlayersPage,
});

function PlayersPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListPlayers);
  const blockFn = useServerFn(adminSetBlocked);
  const exportFn = useServerFn(adminExport);
  const kpisFn = useServerFn(adminKpis);

  const list = useQuery({
    queryKey: ["admin", "players"],
    queryFn: () => listFn({ data: { limit: 200, offset: 0 } }),
  });
  const kpis = useQuery({ queryKey: ["admin", "kpis"], queryFn: () => kpisFn({ data: { activeWindowDays: 7 } }) });
  const k: any = kpis.data ?? {};
  const rows: any[] = list.data?.rows ?? [];
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const setBlocked = useMutation({
    mutationFn: (v: { user_id: string; blocked: boolean }) => blockFn({ data: v }),
    onSuccess: () => { toast.success("עודכן"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const [pointsTarget, setPointsTarget] = useState<any | null>(null);

  const runExport = async (fmt: "csv" | "xlsx") => {
    try {
      const res: any = await exportFn({ data: { dataset: "players", includeDeleted: false } });
      const data = res?.players ?? [];
      if (data.length === 0) { toast.message("אין נתונים לייצוא"); return; }
      if (fmt === "csv") downloadCSV(data, "players");
      else downloadXLSX({ players: data }, "players");
    } catch (e: any) { toast.error(e.message); }
  };

  const fmt = (n: any) => (typeof n === "number" ? n.toLocaleString("he-IL") : (n ?? "—"));
  const lastSeen = (r: any) => r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("he-IL") : (r.last_play_date ?? "—");

  return (
    <div>
      <PageHeader
        title="ניהול שחקנים"
        description="כל השחקנים במערכת"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline"><Download className="size-4 ml-1" /> ייצוא</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => runExport("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExport("xlsx")}>Excel (XLSX)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label="סה״כ שחקנים" value={fmt(k.total_players)} tone="primary" />
        <StatCard label="פעילים השבוע" value={fmt(k.active_players)} tone="success" />
        <StatCard label="נחסמו" value={fmt(k.blocked_players)} />
        <StatCard label="סה״כ הגדרות נפתרו" value={fmt(k.total_solves)} />
      </div>

      <TableToolbar
        searchPlaceholder="חיפוש לפי שם משתמש / אימייל..."
        filters={[{ label: "סטטוס", options: ["פעיל", "נחסם"] }]}
        columns={["שחקן", "אימייל", "גיל", "ניקוד", "פתורים", "סטטוס"]}
      />

      <DataTableShell
        headers={
          <>
            <TableHead>שחקן</TableHead>
            <TableHead className="hidden md:table-cell">אימייל</TableHead>
            <TableHead className="hidden lg:table-cell">גיל</TableHead>
            <SortableHead>רמה</SortableHead>
            <SortableHead>ניקוד</SortableHead>
            <SortableHead>פתורים</SortableHead>
            <SortableHead>רצף</SortableHead>
            <TableHead className="hidden lg:table-cell">רצף שיא</TableHead>
            <TableHead>פעילות אחרונה</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={
          list.isLoading
            ? <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            : rows.length === 0
              ? <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">אין שחקנים</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7"><AvatarFallback className="text-xs">{(r.username ?? "??").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      <span className="font-medium">{r.display_name ?? r.username}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.email ?? "—"}</TableCell>
                  <TableCell className="hidden lg:table-cell">{r.age ?? "—"}</TableCell>
                  <TableCell>{r.level ?? 1}</TableCell>
                  <TableCell className="font-semibold">{fmt(r.total_score)}</TableCell>
                  <TableCell>{fmt(r.solved_count)}</TableCell>
                  <TableCell>{r.current_streak ?? 0}</TableCell>
                  <TableCell className="hidden lg:table-cell">{r.highest_streak ?? r.best_streak ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{lastSeen(r)}</TableCell>
                  <TableCell><StatusBadge status={r.is_blocked ? "נחסם" : "פעיל"} /></TableCell>
                  <TableCell className="text-left">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="size-8"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setBlocked.mutate({ user_id: r.id, blocked: !r.is_blocked })}>
                          {r.is_blocked ? "שחרור חסימה" : "חסימה"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setPointsTarget(r)}>שינוי נקודות</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
        }
      />

      <PointsDialog target={pointsTarget} onClose={() => setPointsTarget(null)} onDone={invalidate} />
    </div>
  );
}

function PointsDialog({ target, onClose, onDone }: { target: any | null; onClose: () => void; onDone: () => void }) {
  const adjustFn = useServerFn(adminAdjustPoints);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const submit = async () => {
    const n = parseInt(delta, 10);
    if (!Number.isFinite(n) || n === 0) { toast.error("ערך לא תקין"); return; }
    try {
      await adjustFn({ data: { user_id: target.id, delta: n, reason: reason || null } });
      toast.success("הניקוד עודכן");
      setDelta("0"); setReason("");
      onDone(); onClose();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>שינוי נקודות — {target?.display_name ?? target?.username}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>שינוי (חיובי להוספה, שלילי להפחתה)</Label>
            <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>סיבה (אופציונלי)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="text-sm text-muted-foreground">ניקוד נוכחי: {target?.total_score?.toLocaleString?.("he-IL") ?? "—"}</div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={submit}>שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
