import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  PageHeader, TableToolbar, SortableHead, StatusBadge, DataTableShell,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, ThumbsUp, ThumbsDown, Upload, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  adminListDefinitions, adminUpsertDefinition, adminSetDefinitionStatus,
  adminSoftDeleteDefinition, adminRestoreDefinition, adminImportDefinitions, adminExport,
} from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX, parseFile } from "@/lib/admin-export";

export const Route = createFileRoute("/_authenticated/admin/definitions")({
  component: DefinitionsPage,
});

const STATUSES = ["draft", "active", "inactive", "archived", "hidden"] as const;
const statusHe = (s: string) =>
  ({ active: "פעיל", draft: "טיוטה", inactive: "לא פעיל", archived: "בארכיון", hidden: "מוסתר" }[s] ?? s);

function DefinitionsPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListDefinitions);
  const upsertFn = useServerFn(adminUpsertDefinition);
  const setStatusFn = useServerFn(adminSetDefinitionStatus);
  const softDelFn = useServerFn(adminSoftDeleteDefinition);
  const restoreFn = useServerFn(adminRestoreDefinition);

  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const list = useQuery({
    queryKey: ["admin", "definitions"],
    queryFn: () => listFn({ data: { limit: 200, offset: 0, includeDeleted: true } }),
  });
  const rows: any[] = list.data?.rows ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: any }) => setStatusFn({ data: v }),
    onSuccess: () => { toast.success("הסטטוס עודכן"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const softDel = useMutation({
    mutationFn: (id: string) => softDelFn({ data: { id } }),
    onSuccess: () => { toast.success("ההגדרה נמחקה"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });
  const restore = useMutation({
    mutationFn: (id: string) => restoreFn({ data: { id } }),
    onSuccess: () => { toast.success("ההגדרה שוחזרה"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div>
      <PageHeader
        title="ניהול הגדרות"
        description="כל ההגדרות במערכת"
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4 ml-1" /> ייבוא
            </Button>
            <ExportMenu />
          </>
        }
      />

      <TableToolbar
        searchPlaceholder="חיפוש לפי הגדרה / פתרון / תגים..."
        filters={[
          { label: "סטטוס", options: ["פעיל", "טיוטה", "לא פעיל", "מוסתר", "בארכיון"] },
          { label: "רמה", options: ["1", "2", "3", "4", "5"] },
        ]}
        columns={["מזהה", "הגדרה", "פתרון", "קטגוריה", "רמה", "סטטוס", "לייקים", "נוצר"]}
        bulkSelected={selected.length}
        primaryAction={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(null)}><Plus className="size-4 ml-1" /> הגדרה חדשה</Button>
            </DialogTrigger>
            <DefinitionModal
              initial={editing}
              onSave={async (payload) => {
                try {
                  await upsertFn({ data: payload });
                  toast.success(editing ? "ההגדרה עודכנה" : "ההגדרה נוצרה");
                  setOpen(false); setEditing(null); invalidate();
                } catch (e: any) { toast.error(e.message); }
              }}
              onClose={() => { setOpen(false); setEditing(null); }}
            />
          </Dialog>
        }
      />

      <DataTableShell
        headers={
          <>
            <TableHead className="w-10">
              <Checkbox
                checked={selected.length > 0 && selected.length === rows.length}
                onCheckedChange={(c) => setSelected(c ? rows.map((r) => r.id) : [])}
              />
            </TableHead>
            <SortableHead>מזהה</SortableHead>
            <SortableHead>הגדרה</SortableHead>
            <SortableHead>פתרון</SortableHead>
            <TableHead>קטגוריה</TableHead>
            <SortableHead>קושי</TableHead>
            <TableHead>סטטוס</TableHead>
            <SortableHead>לייקים</SortableHead>
            <SortableHead>נפתר</SortableHead>
            <SortableHead>נוצר</SortableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={
          list.isLoading
            ? <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            : rows.length === 0
              ? <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">אין נתונים</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id} data-state={selected.includes(r.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{String(r.id).slice(0, 8)}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{r.clue}{r.deleted_at && <span className="text-destructive text-xs mr-2">(נמחק)</span>}</TableCell>
                  <TableCell className="font-semibold">{r.answer}</TableCell>
                  <TableCell>{r.category ?? "—"}</TableCell>
                  <TableCell>{r.difficulty ?? "—"}</TableCell>
                  <TableCell><StatusBadge status={statusHe(r.status)} /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 text-emerald-600"><ThumbsUp className="size-3" />{r.likes_count ?? 0}</span>
                      <span className="inline-flex items-center gap-1 text-muted-foreground"><ThumbsDown className="size-3" />{r.dislikes_count ?? 0}</span>
                    </div>
                  </TableCell>
                  <TableCell>{r.solved_count ?? 0}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("he-IL") : "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    <RowActions
                      row={r}
                      onEdit={() => { setEditing(r); setOpen(true); }}
                      onSetStatus={(s) => setStatus.mutate({ id: r.id, status: s })}
                      onDelete={() => softDel.mutate(r.id)}
                      onRestore={() => restore.mutate(r.id)}
                    />
                  </TableCell>
                </TableRow>
              ))
        }
      />

      <ImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={invalidate} />
    </div>
  );
}

function ExportMenu() {
  const exportFn = useServerFn(adminExport);
  const run = async (fmt: "csv" | "xlsx") => {
    try {
      const res: any = await exportFn({ data: { dataset: "definitions", includeDeleted: false } });
      const rows = res?.definitions ?? [];
      if (rows.length === 0) { toast.message("אין נתונים לייצוא"); return; }
      if (fmt === "csv") downloadCSV(rows, "definitions");
      else downloadXLSX({ definitions: rows }, "definitions");
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline"><Download className="size-4 ml-1" /> ייצוא</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => run("csv")}>CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={() => run("xlsx")}>Excel (XLSX)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowActions({
  row, onEdit, onSetStatus, onDelete, onRestore,
}: {
  row: any;
  onEdit: () => void;
  onSetStatus: (s: any) => void;
  onDelete: () => void;
  onRestore: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>עריכה</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onSetStatus("active")}>הפעלה</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetStatus("inactive")}>השבתה</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetStatus("draft")}>החזרה לטיוטה</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetStatus(row.status === "hidden" ? "active" : "hidden")}>
          {row.status === "hidden" ? "ביטול הסתרה" : "הסתרה"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSetStatus("archived")}>העברה לארכיון</DropdownMenuItem>
        <DropdownMenuSeparator />
        {row.deleted_at
          ? <DropdownMenuItem onClick={onRestore}>שחזור</DropdownMenuItem>
          : <DropdownMenuItem className="text-destructive" onClick={onDelete}>מחיקה</DropdownMenuItem>
        }
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DefinitionModal({
  initial, onSave, onClose,
}: { initial: any | null; onSave: (p: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    clue: initial?.clue ?? "",
    answer: initial?.answer ?? "",
    category: initial?.category ?? "",
    type: initial?.type ?? "",
    difficulty: initial?.difficulty ?? 1,
    hint: initial?.hint ?? "",
    explanation: initial?.explanation ?? "",
    status: initial?.status ?? "draft",
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>{initial ? "עריכת הגדרה" : "הגדרה חדשה"}</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>הגדרה</Label>
          <Textarea value={form.clue} onChange={(e) => set("clue", e.target.value)} placeholder="לדוגמה: כלי שמשמש לחיתוך" />
        </div>
        <div className="space-y-1.5">
          <Label>פתרון</Label>
          <Input value={form.answer} onChange={(e) => set("answer", e.target.value)} placeholder="מספריים" />
        </div>
        <div className="space-y-1.5">
          <Label>סוג</Label>
          <Input value={form.type ?? ""} onChange={(e) => set("type", e.target.value)} placeholder="חידה / אסוציאציה / תיאור" />
        </div>
        <div className="space-y-1.5">
          <Label>קטגוריה</Label>
          <Input value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>קושי (1-5)</Label>
          <Select value={String(form.difficulty)} onValueChange={(v) => set("difficulty", Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>רמז</Label>
          <Input value={form.hint ?? ""} onChange={(e) => set("hint", e.target.value)} />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>הסבר</Label>
          <Textarea value={form.explanation ?? ""} onChange={(e) => set("explanation", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>סטטוס</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{statusHe(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>ביטול</Button>
        <Button onClick={() => onSave({
          ...(initial?.id ? { id: initial.id } : {}),
          ...form,
          category: form.category || null,
          type: form.type || null,
          hint: form.hint || null,
          explanation: form.explanation || null,
        })}>שמירה</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ImportDialog({
  open, onOpenChange, onDone,
}: { open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const importFn = useServerFn(adminImportDefinitions);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [mode, setMode] = useState<"skip" | "overwrite">("skip");
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const fileName = useRef<string>("");

  const reset = () => { setRows([]); setResult(null); fileName.current = ""; if (fileRef.current) fileRef.current.value = ""; };

  const onFile = async (file: File) => {
    try {
      const parsed = await parseFile(file);
      const normalized = parsed.map((r: any) => ({
        ...r,
        difficulty: r.difficulty ? Number(r.difficulty) : 1,
      }));
      setRows(normalized);
      fileName.current = file.name;
      setResult(null);
    } catch (e: any) { toast.error("שגיאה בקריאת הקובץ: " + e.message); }
  };

  const run = async () => {
    setBusy(true);
    try {
      const res: any = await importFn({ data: { rows, mode } });
      setResult(res);
      toast.success(`יובאו ${res.inserted}, דולגו ${res.skipped}, נכשלו ${res.failed?.length ?? 0}`);
      onDone();
    } catch (e: any) { toast.error(e.message); }
    finally { setBusy(false); }
  };

  const preview = useMemo(() => rows.slice(0, 5), [rows]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ייבוא הגדרות</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>קובץ CSV או Excel</Label>
            <Input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
            />
            <p className="text-xs text-muted-foreground">
              עמודות נדרשות: clue, answer. אופציונליות: category, type, difficulty, hint, explanation, alt_answer, external_id
            </p>
          </div>

          {rows.length > 0 && (
            <>
              <div className="text-sm">{rows.length} שורות זוהו ({fileName.current})</div>
              <div className="border rounded-lg p-2 max-h-40 overflow-auto text-xs">
                {preview.map((r, i) => (
                  <div key={i} className="py-1 border-b last:border-0">
                    <span className="font-semibold">{r.answer}</span> — {r.clue}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>מצב כפילויות</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">דילוג על כפילויות</SelectItem>
                    <SelectItem value="overwrite">דריסת כפילויות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {result && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <div>הוכנסו: <span className="font-semibold text-emerald-600">{result.inserted}</span></div>
              <div>דולגו: <span className="font-semibold">{result.skipped}</span></div>
              <div>נכשלו: <span className="font-semibold text-destructive">{result.failed?.length ?? 0}</span></div>
              {result.failed?.length > 0 && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">הצגת שגיאות</summary>
                  <pre className="mt-2 max-h-32 overflow-auto">{JSON.stringify(result.failed, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>סגירה</Button>
          <Button disabled={rows.length === 0 || busy} onClick={run}>
            {busy ? "מייבא..." : "התחל ייבוא"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
