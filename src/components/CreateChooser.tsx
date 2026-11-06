import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Btn } from "@/components/ui-kit";
import { SetEditor } from "@/components/SetEditor";
import { aiExtractCards } from "@/lib/ai-import.functions";
import { ACCEPT, extractFile } from "@/lib/extract";
import { parseImport } from "@/lib/store";

type Draft = { title: string; description?: string; cards: { term: string; definition: string }[] };
type Step = "choose" | "file" | "other" | "edit";

export function CreateChooser() {
  const [step, setStep] = useState<Step>("choose");
  const [draft, setDraft] = useState<Draft | undefined>();
  const done = (d: Draft) => { setDraft(d); setStep("edit"); };

  if (step === "edit") return <SetEditor key={draft ? "d" : "n"} draft={draft} />;
  if (step === "file") return <FileImport back={() => setStep("choose")} done={done} />;
  if (step === "other") return <OtherImport back={() => setStep("choose")} done={done} />;

  const opts = [
    { icon: "✨", title: "Import from file", text: "AI scans your PDF, Word, PowerPoint or photo of your notes and makes the cards.", go: () => setStep("file") },
    { icon: "✏️", title: "Create a new set", text: "Start from scratch and type your own terms and definitions.", go: () => { setDraft(undefined); setStep("edit"); } },
    { icon: "⇪", title: "Import other", text: "Bring over a set from Quizlet, StudyGo, or any pasted list.", go: () => setStep("other") },
  ];
  return (
    <div className="animate-rise">
      <h1 className="mb-6 text-3xl font-extrabold">How do you want to start?</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {opts.map((o) => (
          <button key={o.title} onClick={o.go} className="group rounded-2xl border-2 border-transparent bg-card p-6 text-left shadow-card transition hover:-translate-y-1 hover:border-primary">
            <div className="mb-3 text-4xl transition group-hover:scale-110">{o.icon}</div>
            <div className="mb-1 text-lg font-bold">{o.title}</div>
            <p className="text-sm text-muted-foreground">{o.text}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

function Header({ title, back }: { title: string; back: () => void }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <Btn variant="outline" onClick={back}>← Back</Btn>
      <h1 className="text-3xl font-extrabold">{title}</h1>
    </div>
  );
}

function FileImport({ back, done }: { back: () => void; done: (d: Draft) => void }) {
  const scan = useServerFn(aiExtractCards);
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [drag, setDrag] = useState(false);

  const handle = async (files: FileList | null) => {
    if (!files?.length) return;
    setErr("");
    try {
      let text = "";
      const images: string[] = [];
      for (const f of Array.from(files).slice(0, 8)) {
        setBusy(`Reading ${f.name}…`);
        const r = await extractFile(f);
        text += r.text ? `\n--- ${f.name} ---\n${r.text}` : "";
        images.push(...r.images);
      }
      setBusy("AI is creating your flashcards…");
      const res = await scan({ data: { text, images: images.slice(0, 8) } });
      if (res.error) throw new Error(res.error);
      done({ title: res.title || files[0]!.name.replace(/\.[^.]+$/, ""), cards: res.cards });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="animate-rise">
      <Header title="Import from file" back={back} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); void handle(e.dataTransfer.files); }}
        onClick={() => !busy && ref.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed bg-card p-12 text-center transition ${drag ? "scale-[1.02] border-primary" : "hover:border-accent"}`}
      >
        <input ref={ref} type="file" multiple accept={ACCEPT} hidden onChange={(e) => { void handle(e.target.files); e.target.value = ""; }} />
        {busy ? (
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="font-semibold">{busy}</p>
          </div>
        ) : (
          <>
            <div className="mb-3 text-5xl">📄</div>
            <p className="text-lg font-bold">Drop files here or click to choose</p>
            <p className="mt-1 text-sm text-muted-foreground">PDF, Word (.docx), PowerPoint (.pptx), JPG, PNG — up to 8 files</p>
          </>
        )}
      </div>
      {err && <p className="mt-4 rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{err}</p>}
      <p className="mt-4 text-sm text-muted-foreground">You can review and edit every card before saving.</p>
    </div>
  );
}

function OtherImport({ back, done }: { back: () => void; done: (d: Draft) => void }) {
  const scan = useServerFn(aiExtractCards);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const looksLikeUrl = /^https?:\/\//i.test(url.trim());
  const simple = parseImport(text).filter((c) => c.definition);
  const isList = text.trim() && simple.length >= Math.max(1, text.trim().split("\n").length * 0.6);

  const fromLink = async () => {
    setBusy(true); setMsg("");
    const res = await scan({ data: { url: url.trim(), hint: "This is a Quizlet or StudyGo set page. Extract every term/definition pair of the set." } });
    setBusy(false);
    if (res.error === "blocked" || res.error) {
      setMsg("That site blocked automatic loading. No problem: open the set, press Ctrl+A (⌘A on Mac) then Ctrl+C, and paste it in the box below.");
      return;
    }
    done({ title: res.title, cards: res.cards });
  };

  const fromText = async () => {
    if (isList) return done({ title: "", cards: simple });
    setBusy(true); setMsg("");
    const res = await scan({ data: { text, hint: "This text was copied from a Quizlet or StudyGo set page (or is a word list). Extract every term/definition pair of the set." } });
    setBusy(false);
    if (res.error) return setMsg(res.error);
    done({ title: res.title, cards: res.cards });
  };

  return (
    <div className="animate-rise space-y-6">
      <Header title="Import from Quizlet or StudyGo" back={back} />

      <section className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-1 font-bold">1. Paste a link</h2>
        <p className="mb-3 text-sm text-muted-foreground">e.g. https://quizlet.com/123456/… or https://studygo.com/…/lists/…</p>
        <div className="flex gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://quizlet.com/…" className="flex-1 rounded-xl border-2 bg-background px-4 py-2 outline-none focus:border-primary" />
          <Btn onClick={fromLink} disabled={!looksLikeUrl || busy}>{busy ? "Loading…" : "Import"}</Btn>
        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-card">
        <h2 className="mb-1 font-bold">2. Or paste the set</h2>
        <ul className="mb-3 list-disc pl-5 text-sm text-muted-foreground">
          <li><b>Easiest:</b> open the set in Quizlet/StudyGo, press Ctrl+A then Ctrl+C, and paste here. AI picks out the cards.</li>
          <li><b>Quizlet export:</b> ⋯ menu → Export → Copy text, then paste.</li>
          <li>Any list like <code>word - meaning</code> or <code>word, meaning</code> also works.</li>
        </ul>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste here…" className="w-full rounded-xl border-2 bg-background p-3 font-mono text-sm outline-none focus:border-primary" />
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{text.trim() ? (isList ? `${simple.length} cards detected` : "AI will find the cards") : ""}</span>
          <Btn onClick={fromText} disabled={!text.trim() || busy}>{busy ? "Working…" : "Import"}</Btn>
        </div>
      </section>
      {msg && <p className="rounded-xl bg-secondary p-3 text-sm font-semibold">{msg}</p>}
    </div>
  );
}
