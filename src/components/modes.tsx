import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Btn, Confetti, Progress } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { isCorrect, shuffle, updateCard, type Card, type StudySet } from "@/lib/store";

type Dir = "td" | "dt"; // td: show term, answer definition
const prompt = (c: Card, d: Dir) => (d === "td" ? c.term : c.definition);
const answer = (c: Card, d: Dir) => (d === "td" ? c.definition : c.term);

function DirToggle({ dir, setDir }: { dir: Dir; setDir: (d: Dir) => void }) {
  return (
    <div className="inline-flex rounded-full bg-secondary p-1 text-sm font-semibold">
      {(["td", "dt"] as Dir[]).map((d) => (
        <button key={d} onClick={() => setDir(d)} className={cn("rounded-full px-3 py-1 transition", dir === d && "bg-card shadow-card text-primary")}>
          {d === "td" ? "Answer with definition" : "Answer with term"}
        </button>
      ))}
    </div>
  );
}

function Done({ title, sub, onRestart, setId }: { title: string; sub: string; onRestart: () => void; setId: string }) {
  return (
    <div className="animate-rise rounded-3xl bg-card p-10 text-center shadow-card">
      <Confetti />
      <div className="text-6xl">🎉</div>
      <h2 className="mt-4 text-3xl font-extrabold">{title}</h2>
      <p className="mt-2 text-muted-foreground">{sub}</p>
      <div className="mt-6 flex justify-center gap-3">
        <Btn onClick={onRestart}>Study again</Btn>
        <Link to="/sets/$id" params={{ id: setId }}><Btn variant="outline">Back to set</Btn></Link>
      </div>
    </div>
  );
}

/* ---------------- Flashcards ---------------- */
export function Flashcards({ set, compact }: { set: StudySet; compact?: boolean }) {
  const [starOnly, setStarOnly] = useState(false);
  const [order, setOrder] = useState(() => set.cards.map((c) => c.id));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [dir, setDir] = useState<Dir>("td");
  const [anim, setAnim] = useState<"" | "left" | "right">("");
  const [sorting, setSorting] = useState(false);
  const [tally, setTally] = useState({ know: 0, learning: 0 });

  const byId = useMemo(() => new Map(set.cards.map((c) => [c.id, c])), [set.cards]);
  const deck = order.map((id) => byId.get(id)).filter((c): c is Card => !!c && (!starOnly || !!c.starred));
  const card = deck[i];
  const done = i >= deck.length;

  const go = useCallback((delta: number, sortAs?: "know" | "learning") => {
    if (sortAs && card) {
      updateCard(set.id, card.id, { known: sortAs === "know" ? (card.known ?? 0) + 1 : 0 });
      setTally((t) => ({ ...t, [sortAs]: t[sortAs] + 1 }));
    }
    setAnim(delta > 0 ? "left" : "right");
    setTimeout(() => {
      setFlipped(false);
      setI((x) => Math.max(0, Math.min(deck.length, x + delta)));
      setAnim("");
    }, 180);
  }, [card, deck.length, set.id]);

  useEffect(() => {
    if (compact) return;
    const h = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); setFlipped((f) => !f); }
      if (e.key === "ArrowRight") go(1, sorting ? "know" : undefined);
      if (e.key === "ArrowLeft") sorting ? go(1, "learning") : go(-1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [go, compact, sorting]);

  if (deck.length === 0) return <p className="text-muted-foreground">No starred cards. <button className="font-semibold text-primary" onClick={() => setStarOnly(false)}>Show all</button></p>;

  if (done) {
    return sorting
      ? <Done setId={set.id} title="Round complete!" sub={`You know ${tally.know} · Still learning ${tally.learning}`} onRestart={() => { setI(0); setTally({ know: 0, learning: 0 }); }} />
      : <Done setId={set.id} title="You've reviewed all cards" sub="Nice work. Ready for another lap?" onRestart={() => setI(0)} />;
  }

  return (
    <div>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <DirToggle dir={dir} setDir={setDir} />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={sorting} onChange={(e) => setSorting(e.target.checked)} className="accent-primary" /> Track progress
          </label>
        </div>
      )}
      <div className="perspective">
        <button
          onClick={() => setFlipped((f) => !f)}
          className={cn("relative block w-full preserve-3d transition-all duration-500", compact ? "h-72" : "h-96",
            flipped && "rotate-y-180",
            anim === "left" && "-translate-x-16 opacity-0", anim === "right" && "translate-x-16 opacity-0")}
          style={{ transformStyle: "preserve-3d" }}
        >
          {[prompt(card, dir), answer(card, dir)].map((text, side) => (
            <div key={side} className={cn("absolute inset-0 grid place-items-center rounded-3xl bg-card p-8 shadow-card backface-hidden", side === 1 && "rotate-y-180")}>
              <span className="absolute left-5 top-4 text-xs font-bold uppercase text-muted-foreground">{side === 0 ? (dir === "td" ? "Term" : "Definition") : (dir === "td" ? "Definition" : "Term")}</span>
              <span
                role="button"
                aria-label="Star"
                onClick={(e) => { e.stopPropagation(); updateCard(set.id, card.id, { starred: !card.starred }); }}
                className={cn("absolute right-5 top-3 text-2xl transition hover:scale-125", card.starred ? "text-accent" : "text-muted-foreground")}
              >★</span>
              <span className="text-center text-3xl font-semibold md:text-4xl">{text}</span>
            </div>
          ))}
        </button>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => { setOrder(shuffle(order)); setI(0); setFlipped(false); }} title="Shuffle">🔀</Btn>
          <Btn variant="ghost" onClick={() => { setStarOnly((s) => !s); setI(0); }} className={starOnly ? "text-accent-foreground bg-accent" : ""}>★ only</Btn>
        </div>
        <div className="flex items-center gap-3">
          {sorting ? (
            <>
              <Btn variant="outline" className="border-destructive text-destructive" onClick={() => go(1, "learning")}>✕ Still learning</Btn>
              <span className="font-semibold tabular-nums">{i + 1} / {deck.length}</span>
              <Btn variant="outline" className="border-success text-success" onClick={() => go(1, "know")}>✓ Know</Btn>
            </>
          ) : (
            <>
              <Btn variant="outline" onClick={() => go(-1)} disabled={i === 0}>←</Btn>
              <span className="font-semibold tabular-nums">{i + 1} / {deck.length}</span>
              <Btn variant="outline" onClick={() => go(1)}>→</Btn>
            </>
          )}
        </div>
        {!compact ? <span className="hidden text-xs text-muted-foreground md:block">Space to flip · ← →</span> : <span />}
      </div>
      <Progress className="mt-4" value={(i + 1) / deck.length} />
    </div>
  );
}

/* ---------------- Shared answer input ---------------- */
function WrittenQuestion({ card, dir, onResult }: { card: Card; dir: Dir; onResult: (ok: boolean) => void }) {
  const [val, setVal] = useState("");
  const [state, setState] = useState<"ask" | "right" | "wrong">("ask");
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { setVal(""); setState("ask"); ref.current?.focus(); }, [card.id]);

  const submit = () => {
    if (state !== "ask") return onResult(state === "right");
    const ok = isCorrect(val, answer(card, dir));
    setState(ok ? "right" : "wrong");
    if (ok) setTimeout(() => onResult(true), 700);
  };

  return (
    <div className={cn("rounded-3xl bg-card p-8 shadow-card animate-rise", state === "wrong" && "animate-shake")} key={card.id}>
      <div className="text-xs font-bold uppercase text-muted-foreground">{dir === "td" ? "Term" : "Definition"}</div>
      <div className="mt-2 text-3xl font-semibold">{prompt(card, dir)}</div>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="mt-8">
        <input
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          readOnly={state !== "ask"}
          placeholder="Type the answer"
          className={cn("w-full rounded-xl border-2 bg-background px-4 py-3 text-lg outline-none transition focus:border-primary",
            state === "right" && "border-success bg-success/10 animate-pop", state === "wrong" && "border-destructive bg-destructive/10")}
        />
        {state === "wrong" && (
          <div className="mt-4 animate-rise rounded-xl border-2 border-success bg-success/10 p-4">
            <div className="text-xs font-bold uppercase text-success">Correct answer</div>
            <div className="text-lg font-semibold">{answer(card, dir)}</div>
          </div>
        )}
        <div className="mt-4 flex justify-end gap-2">
          {state === "ask" && <Btn type="button" variant="ghost" onClick={() => setState("wrong")}>Don't know?</Btn>}
          {state === "wrong" && val && <Btn type="button" variant="ghost" onClick={() => onResult(true)}>Override: I was right</Btn>}
          <Btn type="submit">{state === "ask" ? "Answer" : "Continue"}</Btn>
        </div>
      </form>
    </div>
  );
}

function ChoiceQuestion({ card, dir, pool, onResult }: { card: Card; dir: Dir; pool: Card[]; onResult: (ok: boolean) => void }) {
  const options = useMemo(() => shuffle([card, ...shuffle(pool.filter((c) => c.id !== card.id)).slice(0, 3)]), [card.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => setPicked(null), [card.id]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { const n = Number(e.key); if (n >= 1 && n <= options.length && !picked) pick(options[n - 1].id); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const pick = (id: string) => {
    if (picked) return;
    setPicked(id);
    setTimeout(() => onResult(id === card.id), id === card.id ? 700 : 1500);
  };

  return (
    <div className="rounded-3xl bg-card p-8 shadow-card animate-rise" key={card.id}>
      <div className="text-xs font-bold uppercase text-muted-foreground">{dir === "td" ? "Term" : "Definition"}</div>
      <div className="mt-2 text-3xl font-semibold">{prompt(card, dir)}</div>
      <div className="mt-8 text-sm font-semibold text-muted-foreground">Choose the matching answer</div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {options.map((o, n) => (
          <button
            key={o.id}
            onClick={() => pick(o.id)}
            className={cn("flex items-center gap-3 rounded-xl border-2 p-4 text-left font-medium transition hover:border-primary",
              picked && o.id === card.id && "border-success bg-success/10 animate-pop",
              picked === o.id && o.id !== card.id && "border-destructive bg-destructive/10 animate-shake",
              picked && o.id !== card.id && picked !== o.id && "opacity-50")}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">{n + 1}</span>
            {answer(o, dir)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Learn (Quizlet-style adaptive) ---------------- */
// Each card needs: 1 correct multiple-choice, then 1 correct written answer → mastered.
export function Learn({ set }: { set: StudySet }) {
  const [dir, setDir] = useState<Dir>("td");
  const init = () => Object.fromEntries(set.cards.map((c) => [c.id, 0])) as Record<string, number>;
  const [level, setLevel] = useState(init);
  const [queue, setQueue] = useState(() => shuffle(set.cards.map((c) => c.id)).slice(0, 7));
  const [roundStats, setRoundStats] = useState<{ ok: number; total: number } | null>(null);
  const [stats, setStats] = useState({ ok: 0, total: 0 });

  const mastered = Object.values(level).filter((l) => l >= 2).length;
  const card = set.cards.find((c) => c.id === queue[0]);

  const result = (ok: boolean) => {
    if (!card) return;
    const nl = { ...level, [card.id]: ok ? level[card.id] + 1 : Math.max(0, level[card.id] - 1) };
    setLevel(nl);
    if (ok && nl[card.id] >= 2) updateCard(set.id, card.id, { known: (card.known ?? 0) + 2 });
    const s = { ok: stats.ok + (ok ? 1 : 0), total: stats.total + 1 };
    setStats(s);
    const rest = queue.slice(1);
    if (rest.length === 0) {
      setRoundStats(s);
      setStats({ ok: 0, total: 0 });
      const remaining = set.cards.filter((c) => nl[c.id] < 2).map((c) => c.id);
      setQueue(shuffle(remaining).slice(0, 7));
    } else setQueue(rest);
  };

  const restart = () => { setLevel(init()); setQueue(shuffle(set.cards.map((c) => c.id)).slice(0, 7)); setRoundStats(null); };

  if (mastered === set.cards.length) return <Done setId={set.id} title="You've mastered every term!" sub={`${set.cards.length} terms learned`} onRestart={restart} />;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DirToggle dir={dir} setDir={setDir} />
        <div className="text-sm font-semibold"><span className="text-success">{mastered}</span> / {set.cards.length} mastered</div>
      </div>
      <Progress value={mastered / set.cards.length} className="mb-6 h-3" />
      {roundStats ? (
        <div className="animate-rise rounded-3xl bg-card p-10 text-center shadow-card">
          <h2 className="text-3xl font-extrabold">Round done — keep it up!</h2>
          <p className="mt-2 text-muted-foreground">{roundStats.ok} of {roundStats.total} correct this round</p>
          <Btn className="mt-6" onClick={() => setRoundStats(null)}>Continue to next round</Btn>
        </div>
      ) : card && (
        level[card.id] === 0
          ? <ChoiceQuestion card={card} dir={dir} pool={set.cards} onResult={result} />
          : <WrittenQuestion card={card} dir={dir} onResult={result} />
      )}
    </div>
  );
}

/* ---------------- Write (StudyGo-style drill: wrong answers come back) ---------------- */
export function Write({ set }: { set: StudySet }) {
  const [dir, setDir] = useState<Dir>("td");
  const [queue, setQueue] = useState(() => shuffle(set.cards));
  const [wrongIds, setWrongIds] = useState<Set<string>>(new Set());
  const [correctFirst, setCorrectFirst] = useState(0);
  const [doneCount, setDoneCount] = useState(0);

  const card = queue[0];
  const result = (ok: boolean) => {
    if (ok) {
      if (!wrongIds.has(card.id)) setCorrectFirst((n) => n + 1);
      setDoneCount((n) => n + 1);
      setQueue((q) => q.slice(1));
    } else {
      setWrongIds((w) => new Set(w).add(card.id));
      // reinsert a few cards later so it comes back soon
      setQueue((q) => { const r = q.slice(1); r.splice(Math.min(r.length, 3), 0, card); return r; });
    }
  };
  const restart = (onlyWrong: boolean) => {
    const base = onlyWrong ? set.cards.filter((c) => wrongIds.has(c.id)) : set.cards;
    setQueue(shuffle(base.length ? base : set.cards)); setWrongIds(new Set()); setCorrectFirst(0); setDoneCount(0);
  };

  if (!card) {
    const pct = Math.round((correctFirst / set.cards.length) * 100);
    return (
      <div className="animate-rise rounded-3xl bg-card p-10 text-center shadow-card">
        {pct >= 80 && <Confetti />}
        <div className="text-6xl font-extrabold text-primary">{pct}%</div>
        <p className="mt-2 text-muted-foreground">{correctFirst} of {set.cards.length} right on the first try</p>
        <div className="mt-6 flex justify-center gap-3">
          {wrongIds.size > 0 && <Btn onClick={() => restart(true)}>Practice {wrongIds.size} mistakes</Btn>}
          <Btn variant="outline" onClick={() => restart(false)}>Start over</Btn>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <DirToggle dir={dir} setDir={setDir} />
        <div className="text-sm font-semibold">{doneCount} / {set.cards.length} · <span className="text-destructive">{wrongIds.size} mistakes</span></div>
      </div>
      <Progress value={doneCount / set.cards.length} className="mb-6 h-3" />
      <WrittenQuestion card={card} dir={dir} onResult={result} />
    </div>
  );
}

/* ---------------- Test ---------------- */
type Q = { card: Card; kind: "written" | "mc" | "tf"; options?: Card[]; shown?: Card };
export function Test({ set }: { set: StudySet }) {
  const [dir, setDir] = useState<Dir>("td");
  const [count, setCount] = useState(Math.min(10, set.cards.length));
  const [kinds, setKinds] = useState({ written: true, mc: true, tf: true });
  const [qs, setQs] = useState<Q[] | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const build = () => {
    const ks = (Object.keys(kinds) as Q["kind"][]).filter((k) => kinds[k]);
    if (!ks.length) return;
    setQs(shuffle(set.cards).slice(0, count).map((card, n) => {
      const kind = ks[n % ks.length];
      if (kind === "mc") return { card, kind, options: shuffle([card, ...shuffle(set.cards.filter((c) => c.id !== card.id)).slice(0, 3)]) };
      if (kind === "tf") return { card, kind, shown: Math.random() < 0.5 ? card : shuffle(set.cards.filter((c) => c.id !== card.id))[0] };
      return { card, kind };
    }));
    setAnswers({}); setSubmitted(false);
  };

  const grade = (q: Q, a = "") =>
    q.kind === "written" ? isCorrect(a, answer(q.card, dir)) : q.kind === "mc" ? a === q.card.id : a === String(q.shown!.id === q.card.id);

  if (!qs) {
    return (
      <div className="animate-rise mx-auto max-w-lg rounded-3xl bg-card p-8 shadow-card">
        <h2 className="text-2xl font-extrabold">Set up your test</h2>
        <label className="mt-6 flex items-center justify-between font-semibold">Questions (max {set.cards.length})
          <input type="number" min={1} max={set.cards.length} value={count} onChange={(e) => setCount(Math.max(1, Math.min(set.cards.length, +e.target.value)))} className="w-20 rounded-lg border-2 bg-background px-2 py-1" />
        </label>
        {([["tf", "True / False"], ["mc", "Multiple choice"], ["written", "Written"]] as const).map(([k, l]) => (
          <label key={k} className="mt-3 flex items-center justify-between font-semibold">{l}
            <input type="checkbox" checked={kinds[k]} onChange={(e) => setKinds({ ...kinds, [k]: e.target.checked })} className="h-5 w-5 accent-primary" />
          </label>
        ))}
        <div className="mt-4"><DirToggle dir={dir} setDir={setDir} /></div>
        <Btn className="mt-6 w-full" onClick={build}>Create test</Btn>
      </div>
    );
  }

  const score = qs.filter((q, n) => grade(q, answers[n])).length;

  return (
    <div className="space-y-5">
      {submitted && (
        <div className="animate-rise sticky top-2 z-10 flex items-center justify-between rounded-3xl bg-primary p-6 text-primary-foreground">
          {score / qs.length >= 0.8 && <Confetti />}
          <div><div className="text-4xl font-extrabold">{Math.round((score / qs.length) * 100)}%</div><div className="opacity-80">{score} / {qs.length} correct</div></div>
          <div className="flex gap-2"><Btn variant="accent" onClick={build}>New test</Btn><Btn variant="outline" onClick={() => setQs(null)}>Options</Btn></div>
        </div>
      )}
      {qs.map((q, n) => {
        const ok = submitted && grade(q, answers[n]);
        return (
          <div key={n} className={cn("rounded-3xl border-2 border-transparent bg-card p-6 shadow-card animate-rise", submitted && (ok ? "border-success" : "border-destructive"))} style={{ animationDelay: `${n * 40}ms` }}>
            <div className="flex justify-between text-xs font-bold uppercase text-muted-foreground"><span>{q.kind === "tf" ? "True or false" : q.kind === "mc" ? "Multiple choice" : "Written"}</span><span>{n + 1} of {qs.length}</span></div>
            <div className="mt-2 text-2xl font-semibold">{prompt(q.card, dir)}</div>
            {q.kind === "tf" && (
              <>
                <div className="mt-3 text-lg">= <span className="font-semibold">{answer(q.shown!, dir)}</span></div>
                <div className="mt-4 flex gap-3">
                  {["true", "false"].map((v) => (
                    <button key={v} disabled={submitted} onClick={() => setAnswers({ ...answers, [n]: v })} className={cn("flex-1 rounded-xl border-2 p-3 font-semibold capitalize transition hover:border-primary", answers[n] === v && "border-primary bg-secondary")}>{v}</button>
                  ))}
                </div>
              </>
            )}
            {q.kind === "mc" && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {q.options!.map((o) => (
                  <button key={o.id} disabled={submitted} onClick={() => setAnswers({ ...answers, [n]: o.id })}
                    className={cn("rounded-xl border-2 p-3 text-left transition hover:border-primary", answers[n] === o.id && "border-primary bg-secondary", submitted && o.id === q.card.id && "border-success bg-success/10")}>{answer(o, dir)}</button>
                ))}
              </div>
            )}
            {q.kind === "written" && (
              <input disabled={submitted} value={answers[n] ?? ""} onChange={(e) => setAnswers({ ...answers, [n]: e.target.value })} placeholder="Type the answer" className="mt-4 w-full rounded-xl border-2 bg-background px-4 py-3 outline-none focus:border-primary" />
            )}
            {submitted && !ok && <div className="mt-3 text-sm font-semibold text-success">Correct: {answer(q.card, dir)}{q.kind === "tf" && ` → ${q.shown!.id === q.card.id ? "True" : "False"}`}</div>}
          </div>
        );
      })}
      {!submitted && <Btn className="w-full py-4 text-base" onClick={() => { setSubmitted(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Submit test</Btn>}
    </div>
  );
}

/* ---------------- Match ---------------- */
type Tile = { key: string; cardId: string; text: string };
export function Match({ set }: { set: StudySet }) {
  const bestKey = `flashdeck.match.${set.id}`;
  const makeTiles = () => shuffle(shuffle(set.cards).slice(0, 6).flatMap((c) => [
    { key: c.id + "t", cardId: c.id, text: c.term }, { key: c.id + "d", cardId: c.id, text: c.definition },
  ]));
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [started, setStarted] = useState(false);
  const [sel, setSel] = useState<Tile | null>(null);
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string[]>([]);
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const [penalty, setPenalty] = useState(0);
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => { const b = localStorage.getItem(bestKey); if (b) setBest(+b); }, [bestKey]);
  const finished = started && tiles.length > 0 && gone.size === tiles.length;
  useEffect(() => {
    if (!started || finished) return;
    const t = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(t);
  }, [started, finished]);
  const elapsed = Math.max(0, (now - start) / 1000 + penalty);

  useEffect(() => {
    if (finished && (best === null || elapsed < best)) { setBest(elapsed); localStorage.setItem(bestKey, String(elapsed)); }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  const begin = () => { setTiles(makeTiles()); setGone(new Set()); setSel(null); setPenalty(0); setStart(Date.now()); setNow(Date.now()); setStarted(true); };

  const click = (t: Tile) => {
    if (gone.has(t.key)) return;
    if (!sel) return setSel(t);
    if (sel.key === t.key) return setSel(null);
    if (sel.cardId === t.cardId) {
      setGone((g) => new Set(g).add(sel.key).add(t.key));
      setSel(null);
    } else {
      setWrong([sel.key, t.key]); setPenalty((p) => p + 1); setSel(null);
      setTimeout(() => setWrong([]), 450);
    }
  };

  if (!started) {
    return (
      <div className="animate-rise rounded-3xl bg-card p-10 text-center shadow-card">
        <div className="text-6xl">⚡</div>
        <h2 className="mt-4 text-3xl font-extrabold">Ready to play?</h2>
        <p className="mt-2 text-muted-foreground">Match all terms with their definitions as fast as you can. Wrong matches add 1 second.</p>
        {best !== null && <p className="mt-2 font-semibold">Best: {best.toFixed(1)}s</p>}
        <Btn className="mt-6" onClick={begin}>Start game</Btn>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="animate-rise rounded-3xl bg-card p-10 text-center shadow-card">
        <Confetti />
        <div className="text-6xl font-extrabold text-primary">{elapsed.toFixed(1)}s</div>
        <p className="mt-2 text-muted-foreground">{best !== null && elapsed <= best ? "New personal best!" : `Best: ${best?.toFixed(1)}s`}</p>
        <Btn className="mt-6" onClick={begin}>Play again</Btn>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 text-center font-display text-3xl font-extrabold tabular-nums">{elapsed.toFixed(1)}s</div>
      <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => click(t)}
            className={cn("min-h-28 rounded-2xl border-2 bg-card p-3 font-semibold shadow-card transition-all duration-300",
              sel?.key === t.key && "border-primary bg-secondary -translate-y-1",
              wrong.includes(t.key) && "border-destructive bg-destructive/10 animate-shake",
              gone.has(t.key) && "pointer-events-none scale-75 opacity-0")}
          >{t.text}</button>
        ))}
      </div>
    </div>
  );
}
