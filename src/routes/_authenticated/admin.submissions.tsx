import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  TableToolbar,
  SortableHead,
  StatusBadge,
  DataTableShell,
} from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, X, MoreHorizontal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/submissions")({
  component: SubmissionsPage,
});

const MOCK = Array.from({ length: 10 }).map((_, i) => ({
  id: `#S${204 - i}`,
  user: ["דנה לוי", "יוסי כהן", "מיכל רון", "אורי שם טוב", "alon99"][i % 5],
  def: ["חמש אצבעות", "מנגן בנעימות", "ירוק וגדל", "כוכב לוהט", "פרי קוצני"][i % 5],
  sol: ["יד", "חליל", "צמח", "שמש", "צבר"][i % 5],
  type: ["חידה", "אסוציאציה", "תיאור"][i % 3],
  category: ["טבע", "חיות", "כללי"][i % 3],
  status: ["ממתין", "אושר", "נדחה", "ממתין"][i % 4],
  date: `2026-06-${(13 - i).toString().padStart(2, "0")}`,
}));

function SubmissionsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div>
      <PageHeader title="הצעות שחקנים" description="מודרציה של הצעות הגדרה" />

      <TableToolbar
        searchPlaceholder="חיפוש לפי שם משתמש / הגדרה..."
        filters={[
          { label: "סטטוס", options: ["ממתין", "אושר", "נדחה"] },
          { label: "סוג", options: ["חידה", "אסוציאציה", "תיאור"] },
          { label: "קטגוריה", options: ["טבע", "חיות", "כללי"] },
        ]}
        columns={["מזהה", "שחקן", "הגדרה", "פתרון", "סוג", "קטגוריה", "סטטוס", "תאריך"]}
        bulkSelected={selected.length}
      />

      <DataTableShell
        headers={
          <>
            <TableHead className="w-10">
              <Checkbox
                checked={selected.length === MOCK.length}
                onCheckedChange={(c) => setSelected(c ? MOCK.map((r) => r.id) : [])}
              />
            </TableHead>
            <SortableHead>מזהה</SortableHead>
            <TableHead>שחקן</TableHead>
            <SortableHead>הגדרה</SortableHead>
            <TableHead>פתרון</TableHead>
            <TableHead>סוג</TableHead>
            <TableHead>קטגוריה</TableHead>
            <TableHead>סטטוס</TableHead>
            <SortableHead>תאריך</SortableHead>
            <TableHead className="text-left">פעולות</TableHead>
          </>
        }
        rows={MOCK.map((r) => (
          <TableRow key={r.id} data-state={selected.includes(r.id) ? "selected" : undefined}>
            <TableCell>
              <Checkbox
                checked={selected.includes(r.id)}
                onCheckedChange={() => toggle(r.id)}
              />
            </TableCell>
            <TableCell className="font-mono text-xs">{r.id}</TableCell>
            <TableCell>{r.user}</TableCell>
            <TableCell className="max-w-[240px] truncate">{r.def}</TableCell>
            <TableCell className="font-semibold">{r.sol}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.category}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell className="text-xs text-muted-foreground">{r.date}</TableCell>
            <TableCell className="text-left">
              <div className="flex items-center gap-1 justify-end">
                <Button size="icon" variant="ghost" className="size-8 text-emerald-600">
                  <Check className="size-4" />
                </Button>
                <Button size="icon" variant="ghost" className="size-8 text-destructive">
                  <X className="size-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="size-8">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>תצוגה מקדימה</DropdownMenuItem>
                    <DropdownMenuItem>עריכה</DropdownMenuItem>
                    <DropdownMenuItem>הקצאת רמה</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>פרופיל שחקן</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}
