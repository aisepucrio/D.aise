"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ChevronDown } from "lucide-react";

export type SelectOption = { value: string; label: string };

type SelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  id?: string;
};

export function Select({ value, onChange, options, id }: SelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value) ?? options[0];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("mousedown", onDocPointerDown);
    return () => document.removeEventListener("mousedown", onDocPointerDown);
  }, [close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        data-open={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-h-[2.75rem] items-center gap-3 rounded-xl border border-stroke bg-surface-input px-4 py-2.5 text-left text-sm font-medium text-foreground shadow-sm outline-none transition-colors hover:border-zinc-600 focus-visible:border-green-500 focus-visible:ring-1 focus-visible:ring-green-500 data-[open=true]:border-zinc-600"
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label}</span>
        <ChevronDown
          className={`size-[1.125rem] shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          strokeWidth={2}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          aria-activedescendant={open ? `${listId}-${value}` : undefined}
          className="absolute left-0 right-0 z-50 mt-1.5 max-h-60 overflow-auto rounded-xl border border-stroke bg-surface-card py-1 shadow-xl shadow-black/40 ring-1 ring-white/5"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  id={`${listId}-${opt.value}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    close();
                  }}
                  className={`flex w-full items-center px-4 py-2.5 text-left text-sm font-medium outline-none transition-colors focus-visible:bg-zinc-800 ${
                    isSelected
                      ? "bg-brand/10 text-brand"
                      : "text-foreground hover:bg-zinc-800/95 hover:text-zinc-100"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
