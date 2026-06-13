import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, SlidersHorizontal, Columns3, Plus, ArrowUpDown } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-2xl md:text-3xl font-extrabold truncate">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "primary" | "success" | "warning";
}) {
  const toneClass = {
    default: "",
    primary: "border-primary/30 bg-primary/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
  }[tone];
  return (
    <Card className={toneClass}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl md:text-3xl font-display font-extrabold">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export function TableToolbar({
  searchPlaceholder = "חיפוש...",
  filters = [],
  columns = [],
  primaryAction,
  bulkSelected = 0,
}: {
  searchPlaceholder?: string;
  filters?: { label: string; options: string[] }[];
  columns?: string[];
  primaryAction?: ReactNode;
  bulkSelected?: number;
}) {
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder={searchPlaceholder} className="pr-9" />
        </div>
        {filters.map((f, i) => (
          <Select key={i}>
            <SelectTrigger className="w-[140px]">
              <SlidersHorizontal className="size-3.5 ml-1" />
              <SelectValue placeholder={f.label} />
            </SelectTrigger>
            <SelectContent>
              {f.options.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ))}
        {columns.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Columns3 className="size-4 ml-1" /> עמודות
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>הצגת עמודות</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((c) => (
                <DropdownMenuCheckboxItem key={c} checked>
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <div className="ms-auto flex items-center gap-2">{primaryAction}</div>
      </div>
      {bulkSelected > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium">{bulkSelected} נבחרו</span>
          <Button size="sm" variant="outline">
            פעולה מרובה
          </Button>
          <Button size="sm" variant="ghost">
            ביטול
          </Button>
        </div>
      )}
    </div>
  );
}

export function SortableHead({ children }: { children: ReactNode }) {
  return (
    <TableHead>
      <button className="inline-flex items-center gap-1 hover:text-foreground transition">
        {children}
        <ArrowUpDown className="size-3 opacity-50" />
      </button>
    </TableHead>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    פעיל: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    טיוטה: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    "לא פעיל": "bg-muted text-muted-foreground border-border",
    מוסתר: "bg-muted text-muted-foreground border-border",
    "בארכיון": "bg-muted text-muted-foreground border-border",
    "ממתין": "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
    "אושר": "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    "נדחה": "bg-destructive/15 text-destructive border-destructive/30",
    חדש: "bg-primary/15 text-primary border-primary/30",
    נקרא: "bg-muted text-muted-foreground border-border",
    "נחסם": "bg-destructive/15 text-destructive border-destructive/30",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {status}
    </Badge>
  );
}

export function PaginationBar() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t">
      <div className="text-sm text-muted-foreground">מציג 1-10 מתוך 247</div>
      <div className="flex items-center gap-2">
        <Select defaultValue="10">
          <SelectTrigger className="w-[80px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10</SelectItem>
            <SelectItem value="25">25</SelectItem>
            <SelectItem value="50">50</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline">
          הקודם
        </Button>
        <span className="text-sm px-2">1 / 25</span>
        <Button size="sm" variant="outline">
          הבא
        </Button>
      </div>
    </div>
  );
}

export function DataTableShell({
  headers,
  rows,
}: {
  headers: ReactNode;
  rows: ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>{headers}</TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
          </Table>
        </div>
        <div className="px-4 pb-4">
          <PaginationBar />
        </div>
      </CardContent>
    </Card>
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Plus };
