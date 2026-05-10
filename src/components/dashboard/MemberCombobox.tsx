"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface MemberOption {
  memberId: number;
  fullName: string;
  departmentName: string;
}

interface Props {
  value: string;
  members: MemberOption[];
  onChange: (memberId: string) => void;
  placeholder?: string;
  noResultsText?: string;
}

export function MemberCombobox({ value, members, onChange, placeholder, noResultsText }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => members.find((m) => String(m.memberId) === value), [members, value]);

  useEffect(() => {
    if (!open) return;
    function onClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members.slice(0, 50);
    return members
      .filter((m) =>
        m.fullName.toLowerCase().includes(q) ||
        m.departmentName.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [members, query]);

  function pick(memberId: number) {
    onChange(String(memberId));
    setOpen(false);
    setQuery("");
  }

  function clear() {
    onChange("");
    setQuery("");
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={open ? query : selected?.fullName ?? query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
          if (selected && event.target.value !== selected.fullName) clear();
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="dashboard-field min-h-11 w-full px-3 py-2 text-sm"
      />
      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-border bg-surface shadow-[0_24px_60px_rgba(2,10,24,0.28)]">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted">{noResultsText ?? "No matches."}</p>
          ) : (
            <ul>
              {filtered.map((member) => (
                <li key={member.memberId}>
                  <button
                    type="button"
                    onClick={() => pick(member.memberId)}
                    className={`flex w-full items-start justify-between gap-3 px-3 py-2.5 text-start hover:bg-surface-elevated/60 ${String(member.memberId) === value ? "bg-primary/10" : ""}`}
                  >
                    <span className="text-sm text-foreground">{member.fullName}</span>
                    <span className="text-[11px] text-muted">{member.departmentName}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
