import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  PageHeader, TableToolbar, SortableHead, StatusBadge, DataTableShell, PaginationBar,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Reply, Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminListMessages, adminUpdateMessage, adminExport } from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX } from "@/lib/admin-export";
import { useAdminTable } from "@/hooks/use-admin-table";

export const Route = createFileRoute("/_authenticated/admin/messages")({
  component: MessagesPage,
});

const statusHe = (s: string) =>
  ({ new: "חדש", in_progress: "בטיפול", resolved: "נפתר", closed: "סגור" }[s] ?? s);

const TYPE_HE: Record<string, string> = {
  bug: "תקלה",
  complaint: "תלונה",
  idea: "הצעה",
  other: "אחר",
};

const TYPE_CLASS: Record<string, string> = {
  bug: "bg-destructive/15 text-destructive border-destructive/30",
  complaint: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/40",
  idea: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/40",
  other: "bg-muted text-muted-foreground border-border",
};

const COLS = [
  { key: "name", label: "שם" },
  { key: "email", label: "אימייל" },
  { key: "type", label: "סוג" },
  { key: "subject", label: "נושא" },
  { key: "message", label: "הודעה" },
  { key: "status", label: "סטטוס" },
  { key: "created", label: "תאריך" },
];

function MessagesPage() {
  const qc = useQueryClient();
  const t = useAdminTable("messages", { defaultSort: "created_at", defaultPageSize: 20, defaultFilters: { status: "all" } });

  const listFn = useServerFn(adminListMessages);
  const updateFn = useServerFn(adminUpdateMessage);
  const exportFn = useServerFn(adminExport);

  const [viewing, setViewing] = useState<any | null>(null);
  const [replying, setReplying] = useState<any | null>(null);

  const queryArgs = {
    status: (t.filters.status as any) || "all",
    search: t.debouncedSearch || undefined,
    sort_by: t.sort as any,
    sort_dir: t.dir,
    limit: t.pageSize,
    offset: t.page * t.pageSize,
  };
  const list = useQuery({
    queryKey: ["admin", "messages", queryArgs],
    queryFn: () => listFn({ data: queryArgs }),
    placeholderData: (prev) => prev,
  });
  const rows: any[] = list.data?.rows ?? [];
  const total = list.data?.total ?? 0;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin"] });

  const update = useMutation({
    mutationFn: (v: any) => updateFn({ data: v }),
    onSuccess: () => { toast.success("עודכן"); invalidate(); },
    onError: (e: any) => toast.error(e.message),
  });

  const runExport = async (fmt: "csv" | "xlsx") => {
    try {
      const res: any = await exportFn({ data: { dataset: "messages", includeDeleted: false } });
      const data = res?.messages ?? [];
      if (data.length === 0) { toast.message("אין נתונים לייצוא"); return; }
      if (fmt === "csv") downloadCSV(data, "messages");
      else downloadXLSX({ messages: data }, "messages");
    } catch (e: any) { toast.error(e.message); }
  };

  const statusOptions = useMemo(() => [
    { label: "הכל", value: "all" },
    { label: "חדש", value: "new" },
    { label: "בטיפול", value: "in_progress" },
    { label: "נפתר", value: "resolved" },
    { label: "סגור", value: "closed" },
  ], []);

  return (
    <div>
      <PageHeader
        title="פניות שהתקבלו"
        description="ניהול ההודעות שהתקבלו משחקנים"
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
        searchPlaceholder="חיפוש לפי שם / נושא / הודעה..."
        filters={[
          { key: "status", label: "סטטוס", value: t.filters.status ?? "all", onChange: (v) => t.setFilter("status", v), options: statusOptions, width: "w-[150px]" },
        ]}
        columns={COLS.map((c) => ({ key: c.key, label: c.label, visible: t.isVisible(c.key), onToggle: () => t.toggleCol(c.key) }))}
      />

      <DataTableShell
        headers={
          <>
            {t.isVisible("name") && <TableHead>שם</TableHead>}
            {t.isVisible("email") && <TableHead className="hidden md:table-cell">אימייל</TableHead>}
            {t.isVisible("type") && <TableHead>סוג</TableHead>}
            {t.isVisible("subject") && <TableHead>נושא</TableHead>}
            {t.isVisible("message") && <TableHead className="hidden lg:table-cell">הודעה</TableHead>}
            {t.isVisible("status") && <SortableHead sortKey="status" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>סטטוס</SortableHead>}
            {t.isVisible("created") && <SortableHead sortKey="created_at" currentSort={t.sort} currentDir={t.dir} onSort={t.setSort}>תאריך</SortableHead>}
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={
          list.isLoading
            ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">טוען...</TableCell></TableRow>
            : rows.length === 0
              ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">אין פניות</TableCell></TableRow>
              : rows.map((r) => (
                <TableRow key={r.id}>
                  {t.isVisible("name") && <TableCell className="font-medium">{r.name ?? "—"}</TableCell>}
                  {t.isVisible("email") && <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{r.email ?? "—"}</TableCell>}
                  {t.isVisible("type") && (
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TYPE_CLASS[r.type] ?? TYPE_CLASS.other}`}>
                        {TYPE_HE[r.type] ?? r.type ?? "—"}
                      </span>
                    </TableCell>
                  )}
                  {t.isVisible("subject") && <TableCell>{r.subject ?? "—"}</TableCell>}
                  {t.isVisible("message") && <TableCell className="hidden lg:table-cell max-w-[280px] truncate text-sm text-muted-foreground">{r.message}</TableCell>}
                  {t.isVisible("status") && <TableCell><StatusBadge status={statusHe(r.status)} /></TableCell>}
                  {t.isVisible("created") && (
                    <TableCell className="text-xs text-muted-foreground">
                      {r.created_at ? new Date(r.created_at).toLocaleDateString("he-IL") : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => { setViewing(r); if (!r.read_at) update.mutate({ id: r.id, mark_read: true }); }}>
                        <Eye className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="size-8" onClick={() => setReplying(r)}>
                        <Reply className="size-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, mark_read: true })}>סמן כנקרא</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: "new" })}>סטטוס: חדש</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: "in_progress" })}>סטטוס: בטיפול</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: "resolved" })}>סטטוס: נפתר</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => update.mutate({ id: r.id, status: "closed" })}>סטטוס: סגור</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <Dialog open={!!viewing} onOpenChange={(v) => { if (!v) setViewing(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{viewing?.subject ?? "פנייה"}</DialogTitle></DialogHeader>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">מאת:</span> {viewing?.name} ({viewing?.email})</div>
            <div className="whitespace-pre-wrap p-3 rounded-lg bg-muted">{viewing?.message}</div>
            {viewing?.reply_text && (
              <div>
                <div className="text-muted-foreground mt-3">תגובה ששלחת:</div>
                <div className="whitespace-pre-wrap p-3 rounded-lg bg-primary/5 border border-primary/20">{viewing.reply_text}</div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ReplyDialog
        msg={replying}
        onClose={() => setReplying(null)}
        onSaved={() => { setReplying(null); invalidate(); }}
      />
    </div>
  );
}

function ReplyDialog({ msg, onClose, onSaved }: { msg: any | null; onClose: () => void; onSaved: () => void }) {
  const updateFn = useServerFn(adminUpdateMessage);
  const [text, setText] = useState("");
  const send = async () => {
    try {
      await updateFn({ data: { id: msg.id, reply_text: text, status: "resolved" } });
      toast.success("תגובה נשלחה");
      setText("");
      onSaved();
    } catch (e: any) { toast.error(e.message); }
  };
  return (
    <Dialog open={!!msg} onOpenChange={(v) => { if (!v) { setText(""); onClose(); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>תגובה לפנייה</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <div className="text-muted-foreground">פנייה מקורית מ-{msg?.name}:</div>
          <div className="whitespace-pre-wrap p-3 rounded-lg bg-muted">{msg?.message}</div>
          <Textarea rows={6} placeholder="כתוב תגובה..." value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button disabled={!text.trim()} onClick={send}>שליחה</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
