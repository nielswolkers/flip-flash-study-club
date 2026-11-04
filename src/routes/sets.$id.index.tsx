import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Btn, Shell } from "@/components/ui-kit";
import { Flashcards } from "@/components/modes";
import { deleteSet, updateCard, useSet } from "@/lib/store";

export const Route = createFileRoute("/sets/$id/")({
  head: () => ({
    meta: [
      { title: "Study set — Flashdeck" },
      { name: "description", content: "Pick a study mode: flashcards, learn, write, test or match." },
      { property: "og:title", content: "Study set — Flashdeck" },
      { property: "og:description", content: "Pick a study mode: flashcards, learn, write, test or match." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SetPage,
});

export const MODES = [
  { mode: "flashcards", label: "Flashcards", icon: "🃏" },
  { mode: "learn", label: "Learn", icon: "🧠" },
  { mode: "write", label: "Write", icon: "✍️" },
  { mode: "test", label: "Test", icon: "📝" },
  { mode: "match", label: "Match", icon: "⚡" },
] as const;

function SetPage() {
  const { id } = Route.useParams();
  const set = useSet(id);
  const nav = useNavigate();
  if (!set) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  const mastered = set.cards.filter((c) => (c.known ?? 0) >= 2).length;

  return (
    <Shell>
      <div className="animate-rise">
        <h1 className="text-4xl font-extrabold">{set.title}</h1>
        {set.description && <p className="mt-1 text-muted-foreground">{set.description}</p>}
        <div className="my-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {MODES.map((m) => (
            <Link key={m.mode} to="/sets/$id/$mode" params={{ id, mode: m.mode }} className="flex items-center gap-3 rounded-2xl bg-card p-4 font-bold shadow-card transition hover:-translate-y-1 hover:text-primary">
              <span className="text-2xl">{m.icon}</span>{m.label}
            </Link>
          ))}
        </div>
        {set.cards.length > 0 && <Flashcards set={set} compact />}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Terms in this set ({set.cards.length}) · <span className="text-success">{mastered} mastered</span></h2>
          <div className="flex gap-2">
            <Link to="/sets/$id/edit" params={{ id }}><Btn variant="outline">✎ Edit</Btn></Link>
            <Btn variant="outline" onClick={() => navigator.clipboard.writeText(set.cards.map((c) => `${c.term}\t${c.definition}`).join("\n"))}>⧉ Export</Btn>
            <Btn variant="danger" onClick={() => { if (confirm("Delete this set?")) { deleteSet(id); nav({ to: "/" }); } }}>Delete</Btn>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {set.cards.map((c) => (
            <div key={c.id} className="grid grid-cols-[1fr_2fr_auto] items-center gap-4 rounded-xl bg-card p-4 shadow-card">
              <div className="border-r pr-4 font-semibold">{c.term}</div>
              <div>{c.definition}</div>
              <button aria-label="Star" onClick={() => updateCard(id, c.id, { starred: !c.starred })} className={`text-xl transition hover:scale-125 ${c.starred ? "text-accent" : "text-muted-foreground"}`}>★</button>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
