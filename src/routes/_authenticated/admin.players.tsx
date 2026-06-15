import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader,
  TableToolbar,
  SortableHead,
  StatusBadge,
  DataTableShell,
  StatCard,
  PaginationBar,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Download, Trash2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListPlayers,
  adminAdjustPoints,
  adminSetBlocked,
  adminKpis,
  adminExport,
  adminBulkSetBlocked,
  adminDeletePlayer,
} from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX } from "@/lib/admin-export";
import { useAdminTable } from "@/hooks/use-admin-table";

export const Route = createFileRoute("/_authenticated/admin/players")({
  component: PlayersPage,
});

const COLS = [
  { key: "player", label: "שחקן" },
  { key: "email", label: "אימייל" },
  { key: "age", label: "גיל" },
  { key: "level", label: "שלב" },
  { key: "score", label: "ניקוד" },
  { key: "solved", label: "פתורים" },
  { key: "streak", label: "רצף" },
  { key: "best_streak", label: "רצף שיא" },
  { key: "last_seen", label: "פעילות אחרונה" },
  { key: "status", label: "סטטוס" },
];

function PlayersPage() {
  const qc = useQueryClient();
  const t = useAdminTable("players", {
    defaultSort: "total_score",
    defaultPageSize: 20,
    defaultFilters: { status: "all" },
  });

  const listFn = useServerFn(adminListPlayers);
  const blockFn = useServerFn(adminSetBlocked);
  const exportFn = useServerFn(adminExport);
  const kpisFn = useServerFn(adminKpis);
  const bulkBlockFn = useServerFn(adminBulkSetBlocked);
  const deletePlayerFn = useServerFn(adminDeletePlayer);

  const queryArgs = {
    search: t.debouncedSearch || undefined,
    blocked: t.filters.status === "blocked" ? true : t.filters.status === "active" ? false : undefined,
    sort_by: t.sort as any,
    sort_dir: t.dir,
    limit: t.pageSize,
    offset: t.page * t.pageSize,
  };
  const list = useQuery({
    queryKey: ["admin", "players", queryArgs],
    queryFn: () => listFn({ data: queryArgs }),
    placeholderData: (prev) => prev,
  });
  const kpis = useQuery({ queryKey: ["admin", "kpis"], queryFn: () => kpisFn({ data: { activeWindowDays: 7 } }) });
  const k: any = kpis.data ?? {};
  const rows: any[] = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const setBlocked = useMutation({
    mutationFn: (v: { user_id: string; blocked: boolean }) => blockFn({ data: v }),
    onSuccess: () => {
      toast.success("עודכן");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [pointsTarget, setPointsTarget] = useState<any | null>(null);
  const [viewing, setViewing] = useState<any | null>(null);

  const runBulkBlock = async (blocked: boolean) => {
    if (t.selected.length === 0) return;
    if (blocked && !window.confirm(`לחסום ${t.selected.length} שחקנים?`)) return;
    try {
      const res: any = await bulkBlockFn({ data: { user_ids: t.selected, blocked } });
      toast.success(`עודכנו ${res.ok} שחקנים`);
      t.clearSel();
      invalidate();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const runExport = async (fmt: "csv" | "xlsx") => {
    try {
      const res: any = await exportFn({ data: { dataset: "players", includeDeleted: false } });
      const data = res?.players ?? [];
      if (data.length === 0) {
        toast.message("אין נתונים לייצוא");
        return;
      }
      if (fmt === "csv") downloadCSV(data, "players");
      else downloadXLSX({ players: data }, "players");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const fmt = (n: any) => (typeof n === "number" ? n.toLocaleString("he-IL") : (n ?? "—"));
  const lastSeen = (r: any) =>
    r.last_seen_at ? new Date(r.last_seen_at).toLocaleDateString("he-IL") : (r.last_play_date ?? "—");

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => t.selected.includes(id));

  const statusOptions = useMemo(
    () => [
      { label: "כל הסטטוסים", value: "all" },
      { label: "פעיל", value: "active" },
      { label: "נחסם", value: "blocked" },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="שחקנים"
        description="ניהול המשתמשים הרשומים במערכת"
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="size-4 ml-1" /> ייצוא
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => runExport("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => runExport("xlsx")}>Excel (XLSX)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        <StatCard label='סה"כ שחקנים' value={fmt(k.total_players)} tone="primary" />
        <StatCard label="פעילים השבוע" value={fmt(k.active_players)} tone="success" />
        <StatCard label="שחקנים שנחסמו" value={fmt(k.blocked_players)} />
        <StatCard label='סה"כ הגדרות שנפתרו' value={fmt(k.total_solves)} />
      </div>

      <TableToolbar
        search={t.search}
        onSearchChange={t.setSearch}
        searchPlaceholder="חיפוש לפי שם משתמש / אימייל..."
        filters={[
          {
            key: "status",
            label: "סטטוס",
            value: t.filters.status ?? "all",
            onChange: (v) => t.setFilter("status", v),
            options: statusOptions,
            width: "w-[150px]",
          },
        ]}
        columns={COLS.map((c) => ({
          key: c.key,
          label: c.label,
          visible: t.isVisible(c.key),
          onToggle: () => t.toggleCol(c.key),
        }))}
        bulkSelected={t.selected.length}
        onClearSelection={t.clearSel}
        bulkActions={
          <>
            <Button size="sm" variant="destructive" onClick={() => runBulkBlock(true)}>
              חסימה
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulkBlock(false)}>
              שחרור חסימה
            </Button>
          </>
        }
      />

      <DataTableShell
        headers={
          <>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={(c) => t.selectAll(allIds, !!c)} />
            </TableHead>
            {t.isVisible("player") && <TableHead>שחקן</TableHead>}
            {t.isVisible("email") && <TableHead className="hidden md:table-cell">אימייל</TableHead>}
            {t.isVisible("age") && <TableHead className="hidden lg:table-cell">גיל</TableHead>}
            {t.isVisible("level") && (
              <SortableHead sortKey="level" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>
                שלב
              </SortableHead>
            )}
            {t.isVisible("score") && (
              <SortableHead sortKey="total_score" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>
                ניקוד
              </SortableHead>
            )}
            {t.isVisible("solved") && (
              <SortableHead sortKey="solved_count" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>
                פתורים
              </SortableHead>
            )}
            {t.isVisible("streak") && (
              <SortableHead sortKey="current_streak" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>
                רצף
              </SortableHead>
            )}
            {t.isVisible("best_streak") && <TableHead className="hidden lg:table-cell">רצף שיא</TableHead>}
            {t.isVisible("last_seen") && (
              <SortableHead sortKey="last_seen_at" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>
                פעילות אחרונה
              </SortableHead>
            )}
            {t.isVisible("status") && <TableHead>סטטוס</TableHead>}
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={
          list.isLoading ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                טוען...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                אין שחקנים
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id} data-state={t.selected.includes(r.id) ? "selected" : undefined}>
                <TableCell>
                  <Checkbox checked={t.selected.includes(r.id)} onCheckedChange={() => t.toggleSel(r.id)} />
                </TableCell>
                {t.isVisible("player") && (
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarFallback className="text-xs">
                          {(r.username ?? "??").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{r.display_name ?? r.username}</span>
                    </div>
                  </TableCell>
                )}
                {t.isVisible("email") && (
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.email ?? "—"}</TableCell>
                )}
                {t.isVisible("age") && <TableCell className="hidden lg:table-cell">{r.age ?? "—"}</TableCell>}
                {t.isVisible("level") && <TableCell>{r.level ?? 1}</TableCell>}
                {t.isVisible("score") && <TableCell className="font-semibold">{fmt(r.total_score)}</TableCell>}
                {t.isVisible("solved") && <TableCell>{fmt(r.solved_count)}</TableCell>}
                {t.isVisible("streak") && <TableCell>{r.current_streak ?? 0}</TableCell>}
                {t.isVisible("best_streak") && (
                  <TableCell className="hidden lg:table-cell">{r.highest_streak ?? r.best_streak ?? 0}</TableCell>
                )}
                {t.isVisible("last_seen") && (
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{lastSeen(r)}</TableCell>
                )}
                {t.isVisible("status") && (
                  <TableCell>
                    <StatusBadge status={r.is_blocked ? "נחסם" : "פעיל"} />
                  </TableCell>
                )}
                <TableCell className="text-left">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewing(r)}>צפייה</DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (!r.is_blocked && !window.confirm("לחסום את השחקן?")) return;
                          setBlocked.mutate({ user_id: r.id, blocked: !r.is_blocked });
                        }}
                      >
                        {r.is_blocked ? "שחרור חסימה" : "חסימה"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setPointsTarget(r)}>שינוי נקודות</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )
        }
        footer={
          <PaginationBar
            page={t.page}
            pageSize={t.pageSize}
            total={total}
            loading={list.isFetching}
            onPageChange={t.setPage}
            onPageSizeChange={t.setPageSize}
          />
        }
      />

      <PointsDialog target={pointsTarget} onClose={() => setPointsTarget(null)} onDone={invalidate} />
      <ViewDialog target={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function ViewDialog({ target, onClose }: { target: any | null; onClose: () => void }) {
  return (
    <Dialog
      open={!!target}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{target?.display_name ?? target?.username}</DialogTitle>
        </DialogHeader>
        {target && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">אימייל:</span> {target.email ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">שלב:</span> {target.level ?? 1}
            </div>
            <div>
              <span className="text-muted-foreground">ניקוד:</span> {target.total_score?.toLocaleString?.("he-IL") ?? 0}
            </div>
            <div>
              <span className="text-muted-foreground">פתורים:</span> {target.solved_count ?? 0}
            </div>
            <div>
              <span className="text-muted-foreground">רצף נוכחי:</span> {target.current_streak ?? 0}
            </div>
            <div>
              <span className="text-muted-foreground">רצף שיא:</span> {target.highest_streak ?? target.best_streak ?? 0}
            </div>
            <div>
              <span className="text-muted-foreground">נרשם:</span>{" "}
              {target.created_at ? new Date(target.created_at).toLocaleDateString("he-IL") : "—"}
            </div>
            <div>
              <span className="text-muted-foreground">סטטוס:</span> {target.is_blocked ? "נחסם" : "פעיל"}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PointsDialog({ target, onClose, onDone }: { target: any | null; onClose: () => void; onDone: () => void }) {
  const adjustFn = useServerFn(adminAdjustPoints);
  const [delta, setDelta] = useState("0");
  const [reason, setReason] = useState("");
  const submit = async () => {
    const n = parseInt(delta, 10);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("ערך לא תקין");
      return;
    }
    try {
      await adjustFn({ data: { user_id: target.id, delta: n, reason: reason || null } });
      toast.success("הניקוד עודכן");
      setDelta("0");
      setReason("");
      onDone();
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  return (
    <Dialog
      open={!!target}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>שינוי נקודות — {target?.display_name ?? target?.username}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>שינוי (חיובי להוספה, שלילי להפחתה)</Label>
            <Input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>סיבה (אופציונלי)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="text-sm text-muted-foreground">
            ניקוד נוכחי: {target?.total_score?.toLocaleString?.("he-IL") ?? "—"}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ביטול
          </Button>
          <Button onClick={submit}>שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
