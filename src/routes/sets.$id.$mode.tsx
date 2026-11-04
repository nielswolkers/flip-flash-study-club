import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Flashcards, Learn, Match, Test, Write } from "@/components/modes";
import { touchSet, useSet } from "@/lib/store";

export const Route = createFileRoute("/sets/$id/$mode")({
  head: ({ params }) => {
    const t = `${params.mode[0]?.toUpperCase()}${params.mode.slice(1)} — Flashdeck`;
    return {
      meta: [
        { title: t },
        { name: "description", content: `Study your set in ${params.mode} mode.` },
        { property: "og:title", content: t },
        { property: "og:description", content: `Study your set in ${params.mode} mode.` },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: ModePage,
});

const LABELS: Record<string, string> = { flashcards: "Flashcards", learn: "Learn", write: "Write", test: "Test", match: "Match" };

function ModePage() {
  const { id, mode } = Route.useParams();
  const set = useSet(id);
  useEffect(() => { if (set) touchSet(id); }, [id, !!set]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen">
      <header className="flex items-center gap-4 border-b bg-card px-4 py-3">
        <Link to="/sets/$id" params={{ id }} className="rounded-full px-3 py-1 font-semibold hover:bg-secondary">✕</Link>
        <div className="font-display text-lg font-bold">{LABELS[mode] ?? mode}</div>
        <div className="truncate text-muted-foreground">· {set?.title}</div>
        <div className="flex-1" />
        <nav className="hidden gap-1 sm:flex">
          {Object.entries(LABELS).map(([m, l]) => (
            <Link key={m} to="/sets/$id/$mode" params={{ id, mode: m }} className="rounded-full px-3 py-1 text-sm font-semibold hover:bg-secondary" activeProps={{ className: "bg-secondary text-primary" }}>{l}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        {!set ? <p className="text-muted-foreground">Loading…</p>
          : set.cards.length < 2 ? <p>Add at least 2 cards to study.</p>
          : mode === "flashcards" ? <Flashcards set={set} />
          : mode === "learn" ? <Learn key={id} set={set} />
          : mode === "write" ? <Write key={id} set={set} />
          : mode === "test" ? <Test key={id} set={set} />
          : mode === "match" ? <Match key={id} set={set} />
          : <p>Unknown mode.</p>}
      </main>
    </div>
  );
}
