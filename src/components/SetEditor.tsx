import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Btn } from "@/components/ui-kit";
import { parseImport, uid, upsertSet, type StudySet } from "@/lib/store";

export function SetEditor({ initial }: { initial?: StudySet }) {
  const nav = useNavigate();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [cards, setCards] = useState(initial?.cards ?? [1, 2, 3].map(() => ({ id: uid(), term: "", definition: "" })));
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const update = (id: string, k: "term" | "definition", v: string) => setCards((c) => c.map((x) => (x.id === id ? { ...x, [k]: v } : x)));
  const valid = cards.filter((c) => c.term.trim() && c.definition.trim());

  const save = () => {
    const id = initial?.id ?? uid();
    upsertSet({ id, title: title.trim() || "Untitled set", description, cards: valid, createdAt: initial?.createdAt ?? Date.now(), lastStudied: initial?.lastStudied });
    nav({ to: "/sets/$id", params: { id } });
  };

  const doImport = () => {
    const parsed = parseImport(importText).map((p) => ({ id: uid(), ...p }));
    setCards((c) => [...c.filter((x) => x.term || x.definition), ...parsed]);
    setImportText("");
    setImportOpen(false);
  };

  return (
    <div className="animate-rise">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">{initial ? "Edit set" : "Create a new study set"}</h1>
        <Btn onClick={save} disabled={valid.length < 1}>{initial ? "Save" : "Create"}</Btn>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='Title, e.g. "Biology – Chapter 22"' className="mb-3 w-full rounded-xl border-2 bg-card px-4 py-3 text-lg font-semibold outline-none focus:border-primary" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description…" className="mb-4 w-full rounded-xl border-2 bg-card px-4 py-3 outline-none focus:border-primary" rows={2} />

      <div className="mb-4 flex gap-2">
        <Btn variant="outline" onClick={() => setImportOpen((o) => !o)}>⇪ Import</Btn>
        <Btn variant="outline" onClick={() => setCards((c) => c.map((x) => ({ ...x, term: x.definition, definition: x.term })))}>⇄ Swap terms & definitions</Btn>
      </div>
      {importOpen && (
        <div className="mb-6 rounded-2xl bg-card p-4 shadow-card animate-rise">
          <p className="mb-2 text-sm text-muted-foreground">Paste one card per line. Separate term and definition with a Tab, " - ", " = " or a comma (Quizlet export works).</p>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={6} className="w-full rounded-xl border-2 bg-background p-3 font-mono text-sm outline-none focus:border-primary" placeholder={"dog\thond\ncat - kat"} />
          <div className="mt-2 text-sm text-muted-foreground">{parseImport(importText).length} cards detected</div>
          <Btn className="mt-3" onClick={doImport} disabled={!importText.trim()}>Import</Btn>
        </div>
      )}

      <div className="space-y-3">
        {cards.map((c, i) => (
          <div key={c.id} className="rounded-2xl bg-card p-4 shadow-card animate-rise">
            <div className="mb-2 flex items-center justify-between text-sm font-semibold text-muted-foreground">
              <span>{i + 1}</span>
              <div className="flex gap-1">
                <button disabled={i === 0} onClick={() => setCards((cs) => { const a = [...cs]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; return a; })} className="rounded px-2 hover:bg-secondary disabled:opacity-30">↑</button>
                <button onClick={() => setCards((cs) => cs.filter((x) => x.id !== c.id))} className="rounded px-2 hover:bg-secondary hover:text-destructive">🗑</button>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <input value={c.term} onChange={(e) => update(c.id, "term", e.target.value)} className="w-full border-b-2 bg-transparent py-1 outline-none focus:border-accent" />
                <span className="text-xs font-semibold uppercase text-muted-foreground">Term</span>
              </label>
              <label className="block">
                <input value={c.definition} onChange={(e) => update(c.id, "definition", e.target.value)} onKeyDown={(e) => { if (e.key === "Tab" && !e.shiftKey && i === cards.length - 1) setCards((cs) => [...cs, { id: uid(), term: "", definition: "" }]); }} className="w-full border-b-2 bg-transparent py-1 outline-none focus:border-accent" />
                <span className="text-xs font-semibold uppercase text-muted-foreground">Definition</span>
              </label>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setCards((c) => [...c, { id: uid(), term: "", definition: "" }])} className="mt-4 w-full rounded-2xl border-2 border-dashed py-6 font-bold text-muted-foreground transition hover:border-accent hover:text-foreground">+ Add card</button>
      <div className="mt-6 flex justify-end"><Btn onClick={save} disabled={valid.length < 1}>{initial ? "Save" : "Create"}</Btn></div>
    </div>
  );
}
