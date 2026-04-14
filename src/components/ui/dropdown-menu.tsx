"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

interface DropdownMenuProps {
  trigger?: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
}

export function DropdownMenu({ trigger, children, align = "right" }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition-colors"
      >
        {trigger || <MoreHorizontal className="h-4 w-4" />}
      </button>
      {open && (
        <div
          className={`absolute z-50 mt-1 min-w-[160px] rounded-lg border border-stone-200 bg-white py-1 shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
          style={{ animation: "fade-in 0.1s ease-out" }}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}

export function DropdownItem({ children, onClick, danger }: DropdownItemProps) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-stone-700 hover:bg-stone-50"
      }`}
    >
      {children}
    </button>
  );
}
