import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell } from "@/components/ui-kit";
import { useSets } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flashdeck — Your study sets" },
      { name: "description", content: "Create flashcard sets and study with flashcards, learn, write, test and match modes." },
      { property: "og:title", content: "Flashdeck — Your study sets" },
      { property: "og:description", content: "Flashcards, learn, write, test and match — all in your browser." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const sets = useSets();
  const [q, setQ] = useState("");
  const filtered = sets.filter((s) => (s.title + s.description).toLowerCase().includes(q.toLowerCase()));
  const recent = [...sets].filter((s) => s.lastStudied).sort((a, b) => b.lastStudied! - a.lastStudied!).slice(0, 3);

  return (
    <Shell>
      <section className="mb-10 rounded-3xl bg-primary p-8 text-primary-foreground md:p-12 animate-rise">
        <h1 className="text-4xl font-extrabold md:text-5xl">What will you master today?</h1>
        <p className="mt-2 max-w-xl opacity-80">Flip cards, drill with Learn and Write, test yourself, or race the clock in Match.</p>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search your sets…"
          className="mt-6 w-full max-w-md rounded-full bg-card px-5 py-3 text-foreground outline-none ring-accent focus:ring-4"
        />
      </section>

      {recent.length > 0 && !q && (
        <>
          <h2 className="mb-3 text-lg font-bold">Jump back in</h2>
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {recent.map((s) => (
              <Link key={s.id} to="/sets/$id/$mode" params={{ id: s.id, mode: "learn" }} className="rounded-2xl border-2 bg-card p-4 transition hover:-translate-y-1 hover:border-primary">
                <div className="font-semibold">{s.title}</div>
                <div className="text-sm text-muted-foreground">Continue learning →</div>
              </Link>
            ))}
          </div>
        </>
      )}

      <h2 className="mb-3 text-lg font-bold">Your library</h2>
      {filtered.length === 0 ? (
        <p className="text-muted-foreground">No sets yet. <Link to="/create" className="font-semibold text-primary">Create one</Link>.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <Link
              key={s.id}
              to="/sets/$id"
              params={{ id: s.id }}
              style={{ animationDelay: `${i * 40}ms` }}
              className="group animate-rise rounded-2xl bg-card p-5 shadow-card transition hover:-translate-y-1"
            >
              <div className="text-lg font-bold group-hover:text-primary">{s.title}</div>
              <div className="mt-1 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{s.cards.length} terms</div>
              {s.description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{s.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </Shell>
  );
}
