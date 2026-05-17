"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";

export interface MemberOption {
  memberId: number;
  fullName: string;
  // Optional extra label (e.g. department) shown muted next to the name.
  meta?: string | null;
}

interface MemberMultiSelectProps {
  members: MemberOption[];
  /** Selected member ids. Order is preserved. */
  value: number[];
  onChange: (next: number[]) => void;
  /** Placeholder for the search input. */
  placeholder?: string;
  /** Lock the control (no add / no remove). */
  disabled?: boolean;
  /** Translation tuple: [en, ar]. Defaults to English. */
  emptyHint?: [string, string];
  lang?: "en" | "ar";
  /** Optional element id for the underlying input (label htmlFor wiring). */
  inputId?: string;
}

const FIELD_CLS =
  "w-full rounded-[0.9rem] border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground placeholder:text-muted/45 focus:border-primary/35 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors";

/**
 * Multi-select chip control for picking members. Selection renders as
 * removable chips above a search field. Used by task forms that fan out one
 * POST per selected assignee.
 */
export function MemberMultiSelect({
  members,
  value,
  onChange,
  placeholder,
  disabled,
  emptyHint,
  lang = "en",
  inputId,
}: MemberMultiSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const memberMap = useMemo(() => {
    const map = new Map<number, MemberOption>();
    for (const m of members) map.set(m.memberId, m);
    return map;
  }, [members]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members
      .filter((m) => !selectedSet.has(m.memberId))
      .filter((m) => (q ? m.fullName.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [members, query, selectedSet]);

  function add(memberId: number) {
    if (disabled || selectedSet.has(memberId)) return;
    onChange([...value, memberId]);
    setQuery("");
  }

  function remove(memberId: number) {
    if (disabled) return;
    onChange(value.filter((id) => id !== memberId));
  }

  const tr = (en: string, ar: string) => (lang === "ar" ? ar : en);

  return (
    <div ref={wrapperRef} className="space-y-2">
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const member = memberMap.get(id);
            if (!member) return null;
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
              >
                {member.fullName}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => remove(id)}
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-primary/20"
                    aria-label={tr(`Remove ${member.fullName}`, `إزالة ${member.fullName}`)}
                  >
                    <X size={9} />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted">
          {emptyHint
            ? tr(emptyHint[0], emptyHint[1])
            : tr("No assignees selected yet.", "لم يُختر أي مكلَّف بعد.")}
        </p>
      )}

      {!disabled && (
        <div className="relative">
          <input
            id={inputId}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => {
              // Delay to allow option click to fire first.
              window.setTimeout(() => setOpen(false), 120);
            }}
            placeholder={placeholder ?? tr("Search members…", "ابحث عن الأعضاء…")}
            className={FIELD_CLS}
            autoComplete="off"
          />
          {open && filtered.length > 0 && (
            <div
              role="listbox"
              className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-[0.9rem] border border-border bg-surface shadow-[0_18px_40px_rgba(0,0,0,0.32)] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1 motion-safe:duration-150"
            >
              {filtered.map((m) => (
                <button
                  key={m.memberId}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => add(m.memberId)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface-elevated focus-visible:bg-surface-elevated focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary/40"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{m.fullName}</span>
                    {m.meta ? <span className="truncate text-[10px] text-muted">{m.meta}</span> : null}
                  </span>
                  <Plus size={12} className="shrink-0 text-primary/70" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
