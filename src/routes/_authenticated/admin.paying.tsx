import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader, DataTableShell, PaginationBar } from "@/components/admin/AdminUI";
import { TableCell, TableHead, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { adminListPaidPlayers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/paying")({
  component: PayingPlayersPage,
});

function PayingPlayersPage() {
  const listFn = useServerFn(adminListPaidPlayers);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const args = {
    search: search || undefined,
    limit: pageSize,
    offset: page * pageSize,
  };

  const q = useQuery({
    queryKey: ["admin", "paying", args],
    queryFn: () => listFn({ data: args }),
    placeholderData: (prev) => prev,
  });

  const rows: any[] = q.data?.rows ?? [];
  const total = q.data?.total ?? 0;

  const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString("he-IL") : "—");
  const fmtAmount = (n?: number | null) =>
    typeof n === "number" ? `₪${n.toLocaleString("he-IL", { minimumFractionDigits: 2 })}` : "—";

  return (
    <div>
      <PageHeader title="שחקנים משלמים" description="רשימת שחקנים ששילמו עבור המנוי" />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="חיפוש"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
      </div>

      <DataTableShell
        headers={
          <>
            <TableHead>שם</TableHead>
            <TableHead className="hidden md:table-cell">גיל</TableHead>
            <TableHead className="hidden md:table-cell">תאריך הרשמה</TableHead>
            <TableHead>תאריך תשלום</TableHead>
            <TableHead>סכום</TableHead>
          </>
        }
        rows={
          q.isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                טוען...
              </TableCell>
            </TableRow>
          ) : rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                אין שחקנים משלמים
              </TableCell>
            </TableRow>
          ) : (
            rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.display_name ?? r.username}</TableCell>
                <TableCell className="hidden md:table-cell">{r.age ?? "—"}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {fmtDate(r.created_at)}
                </TableCell>
                <TableCell className="text-sm">{fmtDate(r.paid_at)}</TableCell>
                <TableCell className="font-semibold">{fmtAmount(r.payment_amount)}</TableCell>
              </TableRow>
            ))
          )
        }
        footer={
          <PaginationBar
            page={page}
            pageSize={pageSize}
            total={total}
            loading={q.isFetching}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(0);
            }}
          />
        }
      />
    </div>
  );
}
