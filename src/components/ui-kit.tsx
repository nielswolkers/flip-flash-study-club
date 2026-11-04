import { Link } from "@tanstack/react-router";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary: "bg-primary text-primary-foreground hover:brightness-110",
  accent: "bg-accent text-accent-foreground hover:brightness-105",
  ghost: "bg-transparent hover:bg-secondary text-foreground",
  outline: "border-2 border-border bg-card hover:border-primary/40 text-foreground",
  danger: "bg-destructive text-destructive-foreground hover:brightness-110",
};

export function Btn({ variant = "primary", className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      {...p}
      className={cn("inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none", variants[variant], className)}
    />
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-extrabold text-primary">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">F</span>
            Flashdeck
          </Link>
          <div className="flex-1" />
          <Link to="/create"><Btn variant="accent">+ Create set</Btn></Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-secondary", className)}>
      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  );
}

export function Confetti() {
  const pieces = Array.from({ length: 60 });
  const colors = ["var(--primary)", "var(--accent)", "var(--success)", "var(--destructive)"];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((_, i) => (
        <span
          key={i}
          className="absolute -top-4 h-3 w-2 rounded-sm"
          style={{ left: `${(i * 37) % 100}%`, background: colors[i % 4], animation: `confetti ${1.8 + (i % 7) * 0.25}s ${(i % 10) * 0.08}s ease-in forwards` }}
        />
      ))}
    </div>
  );
}
