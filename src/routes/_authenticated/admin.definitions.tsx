import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  PageHeader,
  TableToolbar,
  SortableHead,
  StatusBadge,
  DataTableShell,
} from "@/components/admin/AdminUI";
import {
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, ThumbsUp, ThumbsDown } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/definitions")({
  component: DefinitionsPage,
});

const MOCK = Array.from({ length: 10 }).map((_, i) => ({
  id: `#${1042 - i}`,
  def: [
    "כלי שמשמש לחיתוך",
    "חיה שיש לה חדק ארוך",
    "צבע השמיים בבוקר",
    "מתוק וצהוב",
    "פרי אדום ועגול",
    "כלי נגינה עם מיתרים",
    "מקום שלומדים בו",
    "ירוק ובוקע מהאדמה",
    "עוף שאינו עף",
    "כוכב הלכת שלנו",
  ][i],
  sol: ["מספריים", "פיל", "תכלת", "דבש", "תפוח", "גיטרה", "בית ספר", "צמח", "פינגווין", "כדור הארץ"][i],
  type: ["חידה", "אסוציאציה", "תיאור"][i % 3],
  category: ["טבע", "חיות", "כללי"][i % 3],
  level: i % 5 + 1,
  difficulty: ["קל", "בינוני", "קשה"][i % 3],
  status: ["פעיל", "טיוטה", "לא פעיל", "פעיל"][i % 4],
  likes: 240 - i * 11,
  dislikes: 10 + i * 2,
  success: `${85 - i * 3}%`,
  created: `2026-06-${(13 - i).toString().padStart(2, "0")}`,
}));

function DefinitionsPage() {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div>
      <PageHeader
        title="ניהול הגדרות"
        description="כל ההגדרות במערכת"
      />

      <TableToolbar
        searchPlaceholder="חיפוש לפי הגדרה / פתרון / תגים..."
        filters={[
          { label: "סוג", options: ["חידה", "אסוציאציה", "תיאור"] },
          { label: "קטגוריה", options: ["טבע", "חיות", "כללי"] },
          { label: "סטטוס", options: ["פעיל", "טיוטה", "לא פעיל", "מוסתר", "בארכיון"] },
          { label: "רמה", options: ["1", "2", "3", "4", "5"] },
        ]}
        columns={["מזהה", "הגדרה", "פתרון", "סוג", "קטגוריה", "רמה", "סטטוס", "לייקים", "נוצר"]}
        bulkSelected={selected.length}
        primaryAction={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 ml-1" /> הגדרה חדשה</Button>
            </DialogTrigger>
            <DefinitionModal onClose={() => setOpen(false)} />
          </Dialog>
        }
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
            <SortableHead>הגדרה</SortableHead>
            <SortableHead>פתרון</SortableHead>
            <TableHead>סוג</TableHead>
            <TableHead>קטגוריה</TableHead>
            <SortableHead>רמה</SortableHead>
            <TableHead>קושי</TableHead>
            <TableHead>סטטוס</TableHead>
            <SortableHead>לייקים</SortableHead>
            <SortableHead>הצלחה</SortableHead>
            <SortableHead>נוצר</SortableHead>
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
            <TableCell className="max-w-[260px] truncate">{r.def}</TableCell>
            <TableCell className="font-semibold">{r.sol}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.category}</TableCell>
            <TableCell>{r.level}</TableCell>
            <TableCell>{r.difficulty}</TableCell>
            <TableCell><StatusBadge status={r.status} /></TableCell>
            <TableCell>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-emerald-600"><ThumbsUp className="size-3" />{r.likes}</span>
                <span className="inline-flex items-center gap-1 text-muted-foreground"><ThumbsDown className="size-3" />{r.dislikes}</span>
              </div>
            </TableCell>
            <TableCell>{r.success}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{r.created}</TableCell>
            <TableCell className="text-left">
              <RowActions />
            </TableCell>
          </TableRow>
        ))}
      />
    </div>
  );
}

function RowActions() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem>תצוגה מקדימה</DropdownMenuItem>
        <DropdownMenuItem>עריכה</DropdownMenuItem>
        <DropdownMenuItem>שכפול</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>שינוי קטגוריה</DropdownMenuItem>
        <DropdownMenuItem>שינוי רמה</DropdownMenuItem>
        <DropdownMenuItem>הסתרה</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive">מחיקה</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DefinitionModal({ onClose }: { onClose: () => void }) {
  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>הגדרה חדשה</DialogTitle>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2 space-y-1.5">
          <Label>הגדרה</Label>
          <Textarea placeholder="לדוגמה: כלי שמשמש לחיתוך" />
        </div>
        <div className="space-y-1.5">
          <Label>פתרון</Label>
          <Input placeholder="מספריים" />
        </div>
        <div className="space-y-1.5">
          <Label>סוג</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="בחר סוג" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="riddle">חידה</SelectItem>
              <SelectItem value="assoc">אסוציאציה</SelectItem>
              <SelectItem value="desc">תיאור</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>קטגוריה</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="בחר קטגוריה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nature">טבע</SelectItem>
              <SelectItem value="animals">חיות</SelectItem>
              <SelectItem value="general">כללי</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>רמה</Label>
          <Select>
            <SelectTrigger><SelectValue placeholder="1-5" /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>רמז</Label>
          <Input placeholder="רמז עדין שיעזור..." />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <Label>הסבר</Label>
          <Textarea placeholder="הסבר שמופיע לאחר הפתרון" />
        </div>
        <div className="space-y-1.5">
          <Label>תגים</Label>
          <Input placeholder="טבע, חיות, כלים" />
        </div>
        <div className="space-y-1.5">
          <Label>סטטוס</Label>
          <Select defaultValue="draft">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">טיוטה</SelectItem>
              <SelectItem value="active">פעיל</SelectItem>
              <SelectItem value="inactive">לא פעיל</SelectItem>
              <SelectItem value="archived">בארכיון</SelectItem>
              <SelectItem value="hidden">מוסתר</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>ביטול</Button>
        <Button onClick={onClose}>שמירה</Button>
      </DialogFooter>
    </DialogContent>
  );
}
