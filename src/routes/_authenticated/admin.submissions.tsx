import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader, TableToolbar, SortableHead, StatusBadge, DataTableShell,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Check, X, MoreHorizontal, Pencil, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListSubmissions, adminApproveSubmission, adminRejectSubmission, adminEditSubmission, adminExport,
} from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX } from "@/lib/admin-export";

export const Route = createFileRoute("/_authenticated/admin/submissions")({
  component: SubmissionsPage,
});

const statusHe = (s: string) =>
  ({ pending: "ממתין", approved: "אושר", rejected: "נדחה" }[s] ?? s);

function SubmissionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListSubmissions);
  const approveFn = useServerFn(adminApproveSubmission);
  const rejectFn = useServerFn(adminRejectSubmission);
  const exportFn = useServerFn(adminExport);

  const [editing, setEditing] = useState<any | null>(null);
  const list = useQuery({
    queryKey: ["admin", "submissions"],
    queryFn: () => listFn({ data: { status: "all", limit: 200, offset: 0 } }),
  });
  const rows: any[] = list.data?.rows ?? [];
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

  const runExport = async (fmt: "csv" | "xlsx") => {
    try {
      const res: any = await exportFn({ data: { dataset: "submissions", includeDeleted: false } });
      const data = res?.submissions ?? [];
      if (data.length === 0) { toast.message("אין נתונים לייצוא"); return; }
      if (fmt === "csv") downloadCSV(data, "submissions");
      else downloadXLSX({ submissions: data }, "submissions");
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <PageHeader
        title="הצעות שחקנים"
        description="מודרציה של הצעות הגדרה"
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
        searchPlaceholder="חיפוש לפי שם משתמש / הגדרה..."
        filters={[{ label: "סטטוס", options: ["ממתין", "אושר", "נדחה"] }]}
        columns={["מזהה", "שחקן", "הגדרה", "פתרון", "סטטוס", "תאריך"]}
      />

      <DataTableShell
        headers={
          <>
            <SortableHead>מזהה</SortableHead>
            <TableHead>שחקן</TableHead>
            <SortableHead>הגדרה</SortableHead>
            <TableHead>פתרון</TableHead>
            <TableHead>קטגוריה</TableHead>
            <TableHead>סטטוס</TableHead>
            <SortableHead>תאריך</SortableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={
          list.isLoading
            ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            : rows.length === 0
              ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">אין הצעות</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{String(r.id).slice(0, 8)}</TableCell>
                  <TableCell>{r.profiles?.display_name ?? r.profiles?.username ?? "—"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{r.edited_clue ?? r.clue_text}</TableCell>
                  <TableCell className="font-semibold">{r.edited_answer ?? r.suggested_answer}</TableCell>
                  <TableCell>{r.edited_category ?? r.category ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={statusHe(r.status)} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("he-IL") : "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="icon" variant="ghost" className="size-8 text-emerald-600"
                        disabled={r.status !== "pending"}
                        onClick={() => approve.mutate(r.id)}
                      ><Check className="size-4" /></Button>
                      <Button
                        size="icon" variant="ghost" className="size-8 text-destructive"
                        disabled={r.status !== "pending"}
                        onClick={() => reject.mutate(r.id)}
                      ><X className="size-4" /></Button>
                      <Button
                        size="icon" variant="ghost" className="size-8"
                        disabled={r.status !== "pending"}
                        onClick={() => setEditing(r)}
                      ><Pencil className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
  // sync initial when sub changes
  if (sub && form._id !== sub.id) {
    setForm({
      _id: sub.id,
      edited_clue: sub.edited_clue ?? sub.clue_text ?? "",
      edited_answer: sub.edited_answer ?? sub.suggested_answer ?? "",
      edited_category: sub.edited_category ?? sub.category ?? "",
      admin_notes: sub.admin_notes ?? "",
    });
  }
  const save = async () => {
    try {
      await editFn({ data: { id: sub.id, ...form, _id: undefined } as any });
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
          <div className="space-y-1.5"><Label>קטגוריה</Label>
            <Input value={form.edited_category ?? ""} onChange={(e) => setForm({ ...form, edited_category: e.target.value })} />
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
