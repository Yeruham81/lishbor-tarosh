import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/admin/AdminUI";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/taxonomy")({
  component: TaxonomyPage,
});

const TYPES = [
  { id: 1, name: "חידה", desc: "חידות לוגיות", color: "#f97316", count: 412 },
  { id: 2, name: "אסוציאציה", desc: "קישור רעיוני", color: "#3b82f6", count: 287 },
  { id: 3, name: "תיאור", desc: "תיאור מילולי", color: "#10b981", count: 510 },
];
const CATEGORIES = [
  { id: 1, name: "טבע", desc: "צמחים, נופים, מזג אוויר", color: "#22c55e", count: 184 },
  { id: 2, name: "חיות", desc: "בעלי חיים שונים", color: "#a855f7", count: 156 },
  { id: 3, name: "כללי", desc: "נושאים כלליים", color: "#64748b", count: 869 },
];
const LEVELS = [
  { id: 1, name: "רמה 1 — קל", desc: "מתחילים", color: "#22c55e", count: 240 },
  { id: 2, name: "רמה 2", desc: "בינוני קל", color: "#84cc16", count: 280 },
  { id: 3, name: "רמה 3", desc: "בינוני", color: "#eab308", count: 260 },
  { id: 4, name: "רמה 4", desc: "מתקדם", color: "#f97316", count: 230 },
  { id: 5, name: "רמה 5 — קשה", desc: "מומחים", color: "#ef4444", count: 199 },
];

type Row = { id: number; name: string; desc: string; color: string; count: number };

function TaxonomyTable({ rows, label }: { rows: Row[]; label: string }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">{rows.length} {label}</div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="size-4 ml-1" /> פריט חדש</Button>
            </DialogTrigger>
            <TaxonomyModal title={`${label} חדש`} />
          </Dialog>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>שם</TableHead>
                <TableHead>תיאור</TableHead>
                <TableHead>צבע</TableHead>
                <TableHead>כמות</TableHead>
                <TableHead className="text-left">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell><GripVertical className="size-4 text-muted-foreground cursor-grab" /></TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{r.desc}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="inline-block size-4 rounded border" style={{ background: r.color }} />
                      <span className="font-mono text-xs">{r.color}</span>
                    </div>
                  </TableCell>
                  <TableCell>{r.count.toLocaleString("he-IL")}</TableCell>
                  <TableCell className="text-left">
                    <div className="flex items-center gap-1 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="size-8"><Pencil className="size-4" /></Button>
                        </DialogTrigger>
                        <TaxonomyModal title="עריכת פריט" initial={r} />
                      </Dialog>
                      <Button size="icon" variant="ghost" className="size-8 text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TaxonomyModal({ title, initial }: { title: string; initial?: Row }) {
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>שם</Label>
          <Input defaultValue={initial?.name ?? ""} placeholder="שם הפריט" />
        </div>
        <div className="space-y-1.5">
          <Label>תיאור</Label>
          <Textarea defaultValue={initial?.desc ?? ""} placeholder="תיאור קצר" />
        </div>
        <div className="space-y-1.5">
          <Label>צבע</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="size-10 rounded border cursor-pointer"
            />
            <Input value={color} onChange={(e) => setColor(e.target.value)} className="font-mono" />
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline">ביטול</Button>
        <Button>שמירה</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function TaxonomyPage() {
  return (
    <div>
      <PageHeader title="טקסונומיה" description="ניהול סוגים, קטגוריות ורמות" />
      <Tabs defaultValue="types" dir="rtl">
        <TabsList>
          <TabsTrigger value="types">סוגים</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות</TabsTrigger>
          <TabsTrigger value="levels">רמות</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="mt-4">
          <TaxonomyTable rows={TYPES} label="סוגים" />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <TaxonomyTable rows={CATEGORIES} label="קטגוריות" />
        </TabsContent>
        <TabsContent value="levels" className="mt-4">
          <TaxonomyTable rows={LEVELS} label="רמות" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
