import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader, TableToolbar, SortableHead, StatusBadge, DataTableShell, PaginationBar,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, X, Pencil, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListSubmissions, adminApproveSubmission, adminRejectSubmission, adminEditSubmission, adminExport,
  adminBulkApproveSubmissions, adminBulkRejectSubmissions,
} from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX } from "@/lib/admin-export";
import { useAdminTable } from "@/hooks/use-admin-table";
import { useGlobalSearchSync } from "@/components/admin/admin-search-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/submissions")({
  component: SubmissionsPage,
});

const statusHe = (s: string) =>
  ({ pending: "ממתין", approved: "אושר", rejected: "נדחה" }[s] ?? s);

const COLS = [
  { key: "id", label: "מזהה" },
  { key: "player", label: "שחקן" },
  { key: "clue", label: "הגדרה" },
  { key: "answer", label: "פתרון" },
  { key: "notes", label: "הסברים והערות אם יש" },
  { key: "status", label: "סטטוס" },
  { key: "created", label: "תאריך" },
];

function SubmissionsPage() {
  const qc = useQueryClient();
  const t = useAdminTable("submissions", { defaultSort: "created_at", defaultPageSize: 20, defaultFilters: { status: "pending" } });
  useGlobalSearchSync(t.setSearch);

  const listFn = useServerFn(adminListSubmissions);
  const approveFn = useServerFn(adminApproveSubmission);
  const rejectFn = useServerFn(adminRejectSubmission);
  const exportFn = useServerFn(adminExport);
  const bulkApproveFn = useServerFn(adminBulkApproveSubmissions);
  const bulkRejectFn = useServerFn(adminBulkRejectSubmissions);

  const [editing, setEditing] = useState<any | null>(null);

  const queryArgs = {
    status: (t.filters.status as any) || "pending",
    search: t.debouncedSearch || undefined,
    sort_by: t.sort as any,
    sort_dir: t.dir,
    limit: t.pageSize,
    offset: t.page * t.pageSize,
  };
  const list = useQuery({
    queryKey: ["admin", "submissions", queryArgs],
    queryFn: () => listFn({ data: queryArgs }),
    placeholderData: (prev) => prev,
  });
  const rows: any[] = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const approve = useMutation({
    mutationFn: (id: string) => approveFn({ data: { id, points: 50, difficulty: 1 } }),
    onSuccess: () => { toast.success("הצעה אושרה"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const reject = useMutation({
    mutationFn: (id: string) => rejectFn({ data: { id } }),
    onSuccess: () => { toast.success("הצעה נדחתה"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const runBulkApprove = async () => {
    if (t.selected.length === 0) return;
    try {
      const res: any = await bulkApproveFn({ data: { ids: t.selected, points: 50, difficulty: 1 } });
      toast.success(`אושרו ${res.ok} הצעות`);
      t.clearSel(); invalidate();
    } catch (e: any) { toast.error(e.message); }
  };
  const runBulkReject = async () => {
    if (t.selected.length === 0) return;
    if (!window.confirm(`לדחות ${t.selected.length} הצעות?`)) return;
    try {
      const res: any = await bulkRejectFn({ data: { ids: t.selected } });
      toast.success(`נדחו ${res.ok} הצעות`);
      t.clearSel(); invalidate();
    } catch (e: any) { toast.error(e.message); }
  };

  const runExport = async (fmt: "csv" | "xlsx") => {
    try {
      const res: any = await exportFn({ data: { dataset: "submissions", includeDeleted: false } });
      const data = res?.submissions ?? [];
      if (data.length === 0) { toast.message("אין נתונים לייצוא"); return; }
      if (fmt === "csv") downloadCSV(data, "submissions");
      else downloadXLSX({ submissions: data }, "submissions");
    } catch (e: any) { toast.error(e.message); }
  };

  const statusOptions = useMemo(() => [
    { label: "הכל", value: "all" },
    { label: "ממתין", value: "pending" },
    { label: "אושר", value: "approved" },
    { label: "נדחה", value: "rejected" },
  ], []);

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => t.selected.includes(id));

  return (
    <div>
      <PageHeader
        title="הגדרות מוצעות"
        description="ניהול ההגדרות שהתקבלו משחקנים"
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

      <TableToolbar
        search={t.search}
        onSearchChange={t.setSearch}
        searchPlaceholder="חיפוש לפי הגדרה / פתרון / קטגוריה..."
        filters={[
          { key: "status", label: "סטטוס", value: t.filters.status ?? "pending", onChange: (v) => t.setFilter("status", v), options: statusOptions, width: "w-[150px]" },
        ]}
        columns={COLS.map((c) => ({ key: c.key, label: c.label, visible: t.isVisible(c.key), onToggle: () => t.toggleCol(c.key) }))}
        bulkSelected={t.selected.length}
        onClearSelection={t.clearSel}
        bulkActions={
          <>
            <Button size="sm" variant="outline" onClick={runBulkApprove}>אישור</Button>
            <Button size="sm" variant="destructive" onClick={runBulkReject}>דחייה</Button>
          </>
        }
      />

      <DataTableShell
        headers={
          <>
            <TableHead className="w-10">
              <Checkbox checked={allSelected} onCheckedChange={(c) => t.selectAll(allIds, !!c)} />
            </TableHead>
            {t.isVisible("id") && <SortableHead>מזהה</SortableHead>}
            {t.isVisible("player") && <TableHead>שחקן</TableHead>}
            {t.isVisible("clue") && <TableHead>הגדרה</TableHead>}
            {t.isVisible("answer") && <TableHead>פתרון</TableHead>}
            {t.isVisible("notes") && <TableHead>הסברים והערות אם יש</TableHead>}
            {t.isVisible("status") && <SortableHead sortKey="status" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>סטטוס</SortableHead>}
            {t.isVisible("created") && <SortableHead sortKey="created_at" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>תאריך</SortableHead>}
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={
          list.isLoading
            ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            : rows.length === 0
              ? <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">אין הצעות</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id} data-state={t.selected.includes(r.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={t.selected.includes(r.id)} onCheckedChange={() => t.toggleSel(r.id)} />
                  </TableCell>
                  {t.isVisible("id") && <TableCell className="font-mono text-xs">{String(r.id).slice(0, 8)}</TableCell>}
                  {t.isVisible("player") && <TableCell>{r.profiles?.display_name ?? r.profiles?.username ?? "—"}</TableCell>}
                  {t.isVisible("clue") && <TableCell className="max-w-[240px] truncate">{r.edited_clue ?? r.clue_text}</TableCell>}
                  {t.isVisible("answer") && <TableCell className="font-semibold">{r.edited_answer ?? r.suggested_answer}</TableCell>}
                  {t.isVisible("notes") && <TableCell className="max-w-[260px] truncate text-sm text-muted-foreground">{r.notes ?? "—"}</TableCell>}
                  {t.isVisible("status") && <TableCell><StatusBadge status={statusHe(r.status)} /></TableCell>}
                  {t.isVisible("created") && (
                    <TableCell className="text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("he-IL") : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon" variant="ghost" className="size-8 text-emerald-600"
                        disabled={r.status === "approved" || approve.isPending}
                        onClick={() => approve.mutate(r.id)}
                        title="אישור"
                      ><Check className="size-4" /></Button>
                      <Button
                        size="icon" variant="ghost" className="size-8 text-destructive"
                        disabled={r.status === "approved" || reject.isPending}
                        onClick={() => { if (window.confirm("לדחות את ההצעה?")) reject.mutate(r.id); }}
                        title="דחייה"
                      ><X className="size-4" /></Button>
                      <Button
                        size="icon" variant="ghost" className="size-8"
                        disabled={r.status === "approved"}
                        onClick={() => setEditing(r)}
                        title="עריכה"
                      ><Pencil className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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

      <EditDialog
        sub={editing}
        onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); invalidate(); }}
      />
    </div>
  );
}

function EditDialog({ sub, onClose, onSaved }: { sub: any | null; onClose: () => void; onSaved: () => void }) {
  const editFn = useServerFn(adminEditSubmission);
  const [form, setForm] = useState<any>({});
  if (sub && form._id !== sub.id) {
    setForm({
      _id: sub.id,
      edited_clue: sub.edited_clue ?? sub.clue_text ?? "",
      edited_answer: sub.edited_answer ?? sub.suggested_answer ?? "",
      edited_explanation: sub.edited_explanation ?? "",
      edited_category: sub.edited_category ?? sub.category ?? "",
      edited_difficulty: sub.edited_difficulty ?? 1,
      admin_notes: sub.admin_notes ?? "",
    });
  }
  const save = async () => {
    try {
      await editFn({
        data: {
          id: sub.id,
          edited_clue: form.edited_clue || null,
          edited_answer: form.edited_answer || null,
          edited_explanation: form.edited_explanation || null,
          edited_category: form.edited_category || null,
          edited_difficulty: Number(form.edited_difficulty) || null,
          admin_notes: form.admin_notes || null,
        } as any,
      });
      toast.success("עודכן");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={!!sub} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>עריכת הצעה</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>הגדרה</Label>
            <Textarea value={form.edited_clue ?? ""} onChange={(e) => setForm({ ...form, edited_clue: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>פתרון</Label>
            <Input value={form.edited_answer ?? ""} onChange={(e) => setForm({ ...form, edited_answer: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>הסבר</Label>
            <Textarea value={form.edited_explanation ?? ""} onChange={(e) => setForm({ ...form, edited_explanation: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>קטגוריה</Label>
              <Input value={form.edited_category ?? ""} onChange={(e) => setForm({ ...form, edited_category: e.target.value })} />
            </div>
            <div className="space-y-1.5"><Label>קושי (1-5)</Label>
              <Select value={String(form.edited_difficulty ?? 1)} onValueChange={(v) => setForm({ ...form, edited_difficulty: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>הערות פנימיות</Label>
            <Textarea value={form.admin_notes ?? ""} onChange={(e) => setForm({ ...form, admin_notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={save}>שמירה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
