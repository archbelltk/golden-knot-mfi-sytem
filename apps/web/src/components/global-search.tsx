"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

interface ClientRow {
  id: string;
  clientNumber: string;
  firstName: string;
  lastName: string;
  status: string;
}
interface LoanAccountRow {
  id: string;
  status: string;
  client: { firstName: string; lastName: string };
  product: { name: string };
}
interface LoanApplicationRow {
  id: string;
  status: string;
  client: { firstName: string; lastName: string };
  product: { name: string };
}

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [results, setResults] = useState<{ label: string; items: SearchResult[] }[]>([]);
  const dataRef = useRef<{
    clients: SearchResult[];
    accounts: SearchResult[];
    applications: SearchResult[];
  }>({ clients: [], accounts: [], applications: [] });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setMobileExpanded(true);
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      if (e.key === "Escape") {
        setOpen(false);
        setMobileExpanded(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileExpanded(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function ensureLoaded() {
    if (loaded) return;
    const [clients, accounts, applications] = await Promise.all([
      apiFetch<ClientRow[]>("/clients").catch(() => []),
      apiFetch<LoanAccountRow[]>("/loan-accounts").catch(() => []),
      apiFetch<LoanApplicationRow[]>("/loan-applications").catch(() => []),
    ]);
    dataRef.current = {
      clients: clients.map((c) => ({
        id: c.id,
        title: `${c.firstName} ${c.lastName}`,
        subtitle: `${c.clientNumber} · ${c.status}`,
        href: `/clients/${c.id}`,
      })),
      accounts: accounts.map((a) => ({
        id: a.id,
        title: `${a.client.firstName} ${a.client.lastName}`,
        subtitle: `${a.product.name} · ${a.status}`,
        href: `/loan-accounts/${a.id}`,
      })),
      applications: applications.map((a) => ({
        id: a.id,
        title: `${a.client.firstName} ${a.client.lastName}`,
        subtitle: `${a.product.name} · ${a.status}`,
        href: `/loan-applications/${a.id}`,
      })),
    };
    setLoaded(true);
  }

  function runSearch(q: string) {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      setResults([]);
      return;
    }
    const match = (r: SearchResult) =>
      r.title.toLowerCase().includes(needle) || r.subtitle.toLowerCase().includes(needle);
    const groups = [
      { label: "Clients", items: dataRef.current.clients.filter(match).slice(0, 5) },
      { label: "Loan Accounts", items: dataRef.current.accounts.filter(match).slice(0, 5) },
      { label: "Loan Applications", items: dataRef.current.applications.filter(match).slice(0, 5) },
    ].filter((g) => g.items.length > 0);
    setResults(groups);
  }

  return (
    <>
      {!mobileExpanded && (
        <button
          onClick={() => {
            setMobileExpanded(true);
            setOpen(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 md:hidden"
          aria-label="Search"
        >
          <Search size={16} />
        </button>
      )}

      <div
        ref={containerRef}
        className={`${mobileExpanded ? "fixed inset-x-4 top-3 z-40" : "hidden"} relative md:static md:block md:w-80`}
      >
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
          <Search size={16} className="shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onFocus={() => {
              setOpen(true);
              void ensureLoaded();
            }}
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              void ensureLoaded().then(() => runSearch(value));
            }}
            placeholder="Search anything…"
            className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-400 sm:inline-block">K</kbd>
          <kbd className="hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 text-xs text-slate-400 sm:inline-block">⌘</kbd>
          {mobileExpanded && (
            <button
              onClick={() => {
                setMobileExpanded(false);
                setOpen(false);
                setQuery("");
              }}
              className="shrink-0 text-slate-400 md:hidden"
              aria-label="Close search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {open && query && (
        <div className="absolute left-0 top-full z-10 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg md:w-96">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">
              {loaded ? "No matches." : "Loading…"}
            </p>
          ) : (
            results.map((group) => (
              <div key={group.label} className="border-b border-slate-100 py-1 last:border-0">
                <p className="px-4 py-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setOpen(false);
                      setMobileExpanded(false);
                      setQuery("");
                      router.push(item.href);
                    }}
                    className="flex w-full flex-col items-start px-4 py-2 text-left hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{item.title}</span>
                    <span className="text-xs text-slate-500">{item.subtitle}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
        )}
      </div>
    </>
  );
}
