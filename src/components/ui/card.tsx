import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-white ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }: CardProps) {
  return (
    <div className={`flex items-center justify-between px-6 py-4 border-b border-stone-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }: CardProps) {
  return <h3 className={`text-base font-semibold text-stone-900 ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
