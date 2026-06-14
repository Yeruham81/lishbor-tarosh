import { useEffect, useState } from "react";

export type SortDir = "asc" | "desc";

export type AdminTableState = {
  search: string;
  filters: Record<string, string>;
  sort: string;
  dir: SortDir;
  page: number;
  pageSize: number;
  hiddenCols: string[];
};

export type AdminTableInit = {
  defaultSort: string;
  defaultDir?: SortDir;
  defaultPageSize?: number;
  defaultFilters?: Record<string, string>;
};

const STORAGE_PREFIX = "admin:table:";

export function useAdminTable(module: string, init: AdminTableInit) {
  const key = `${STORAGE_PREFIX}${module}`;
  const [state, setState] = useState<AdminTableState>(() => {
    const base: AdminTableState = {
      search: "",
      filters: init.defaultFilters ?? {},
      sort: init.defaultSort,
      dir: init.defaultDir ?? "desc",
      page: 0,
      pageSize: init.defaultPageSize ?? 20,
      hiddenCols: [],
    };
    if (typeof window === "undefined") return base;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return base;
      const parsed = JSON.parse(raw);
      return { ...base, ...parsed, filters: { ...base.filters, ...(parsed.filters ?? {}) } };
    } catch {
      return base;
    }
  });

  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* noop */ }
  }, [key, state]);

  // debounced search for queries (400ms)
  const [debouncedSearch, setDebouncedSearch] = useState(state.search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(state.search), 400);
    return () => clearTimeout(t);
  }, [state.search]);

  const setSearch = (v: string) => setState((s) => ({ ...s, search: v, page: 0 }));
  const setFilter = (k: string, v: string) =>
    setState((s) => ({ ...s, filters: { ...s.filters, [k]: v }, page: 0 }));
  const setSort = (sortKey: string) =>
    setState((s) => ({
      ...s,
      sort: sortKey,
      dir: s.sort === sortKey ? (s.dir === "asc" ? "desc" : "asc") : "desc",
      page: 0,
    }));
  const setPage = (page: number) => setState((s) => ({ ...s, page: Math.max(0, page) }));
  const setPageSize = (pageSize: number) => setState((s) => ({ ...s, pageSize, page: 0 }));
  const toggleCol = (col: string) =>
    setState((s) => ({
      ...s,
      hiddenCols: s.hiddenCols.includes(col)
        ? s.hiddenCols.filter((x) => x !== col)
        : [...s.hiddenCols, col],
    }));
  const isVisible = (col: string) => !state.hiddenCols.includes(col);

  // selection (not persisted)
  const [selected, setSelected] = useState<string[]>([]);
  const toggleSel = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const selectAll = (ids: string[], v: boolean) => setSelected(v ? Array.from(new Set(ids)) : []);
  const clearSel = () => setSelected([]);

  return {
    ...state,
    debouncedSearch,
    setSearch,
    setFilter,
    setSort,
    setPage,
    setPageSize,
    toggleCol,
    isVisible,
    selected,
    toggleSel,
    selectAll,
    clearSel,
  };
}

export type UseAdminTable = ReturnType<typeof useAdminTable>;
