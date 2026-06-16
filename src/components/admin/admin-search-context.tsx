import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Ctx = {
  globalSearch: string;
  setGlobalSearch: (v: string) => void;
};

const AdminSearchContext = createContext<Ctx | null>(null);

export function AdminSearchProvider({ children }: { children: ReactNode }) {
  const [globalSearch, setGlobalSearch] = useState("");
  return (
    <AdminSearchContext.Provider value={{ globalSearch, setGlobalSearch }}>
      {children}
    </AdminSearchContext.Provider>
  );
}

export function useAdminSearchContext() {
  const ctx = useContext(AdminSearchContext);
  if (!ctx) {
    return { globalSearch: "", setGlobalSearch: () => {} };
  }
  return ctx;
}

/**
 * Subscribe the current admin table's search input to the global admin
 * search bar. Whenever the global search changes, push it into the local
 * search (which already debounces and resets page to 0).
 */
export function useGlobalSearchSync(setSearch: (v: string) => void) {
  const { globalSearch } = useAdminSearchContext();
  useEffect(() => {
    setSearch(globalSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearch]);
}
