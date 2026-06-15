import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { PageHeader } from "@/components/admin/AdminUI";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { adminListDefinitions } from "@/lib/admin.functions";
import { downloadCSV, downloadXLSX } from "@/lib/admin-export";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/taxonomy")({
  component: TaxonomyPage,
});

function TaxonomyPage() {
  const listFn = useServerFn(adminListDefinitions);
  // Pull a large set of clues to derive taxonomy counts; backend caps at 500.
  const list = useQuery({
    queryKey: ["admin", "definitions", "taxonomy"],
    queryFn: () => listFn({ data: { limit: 500, offset: 0 } }),
  });
  const rows: any[] = list.data?.rows ?? [];

  const types = useMemo(() => aggregate(rows, "type"), [rows]);
  const categories = useMemo(() => aggregate(rows, "category"), [rows]);
  const levels = useMemo(() => aggregate(rows, "difficulty"), [rows]);

  return (
    <div>
      <PageHeader title="תגיות" description="סוגים, קטגוריות ורמות שמופיעות בהגדרות" />
      <Tabs defaultValue="types" dir="rtl">
        <TabsList>
          <TabsTrigger value="types">סוגים</TabsTrigger>
          <TabsTrigger value="categories">קטגוריות</TabsTrigger>
          <TabsTrigger value="levels">רמות</TabsTrigger>
        </TabsList>
        <TabsContent value="types" className="mt-4">
          <TaxonomyTable rows={types} label="סוגים" filename="types" />
        </TabsContent>
        <TabsContent value="categories" className="mt-4">
          <TaxonomyTable rows={categories} label="קטגוריות" filename="categories" />
        </TabsContent>
        <TabsContent value="levels" className="mt-4">
          <TaxonomyTable rows={levels} label="רמות" filename="levels" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function aggregate(rows: any[], key: string) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = r[key];
    const name = v === null || v === undefined || v === "" ? "(ללא)" : String(v);
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function TaxonomyTable({
  rows, label, filename,
}: { rows: { name: string; count: number }[]; label: string; filename: string }) {
  const exportData = (fmt: "csv" | "xlsx") => {
    if (rows.length === 0) { toast.message("אין נתונים"); return; }
    if (fmt === "csv") downloadCSV(rows, filename);
    else downloadXLSX({ [filename]: rows }, filename);
  };
  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <div className="text-sm text-muted-foreground">{rows.length} {label}</div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline"><Download className="size-4 ml-1" /> ייצוא</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportData("csv")}>CSV</DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportData("xlsx")}>Excel (XLSX)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם</TableHead>
                <TableHead>כמות הגדרות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={2} className="text-center py-8 text-muted-foreground">אין נתונים</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.name}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.count.toLocaleString("he-IL")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
