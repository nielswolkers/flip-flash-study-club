import { createServerFn } from "@tanstack/react-start";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";

type Input = { text?: string; images?: string[]; url?: string; hint?: string };
export type AiCard = { term: string; definition: string };
export type AiResult = { title: string; cards: AiCard[]; error?: string };

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n\s*\n+/g, "\n")
    .slice(0, 150_000);
}

export const aiExtractCards = createServerFn({ method: "POST" })
  .inputValidator((d: Input) => {
    if (d.text && d.text.length > 400_000) throw new Error("Text too long");
    if (d.images && d.images.length > 8) throw new Error("Too many images");
    return d;
  })
  .handler(async ({ data }): Promise<AiResult> => {
    let text = data.text ?? "";
    if (data.url) {
      try {
        const res = await fetch(data.url, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", Accept: "text/html" } });
        if (!res.ok) return { title: "", cards: [], error: "blocked" };
        text = stripHtml(await res.text());
      } catch {
        return { title: "", cards: [], error: "blocked" };
      }
    }
    if (!text.trim() && !data.images?.length) return { title: "", cards: [], error: "Nothing to read in that file." };

    const content: ({ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "auto" })[] = [
      { type: "input_text", text: `${data.hint ?? "Create flashcards from this study material."}\n\n${text ? `CONTENT:\n${text.slice(0, 150_000)}` : "See images."}` },
      ...(data.images ?? []).map((u) => ({ type: "input_image" as const, image_url: u, detail: "auto" as const })),
    ];
    try {
      const r = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          'You turn study material into flashcards. If the material is already a list of term/definition pairs (e.g. a Quizlet or StudyGo word list, vocab list, or exported set), reproduce EVERY pair exactly as given, in order, without inventing new ones. Otherwise, create clear concise flashcards covering the key facts and concepts (up to 60). Ignore website navigation, ads, buttons and UI text. Reply ONLY with JSON: {"title": string, "cards": [{"term": string, "definition": string}]}.',
        input: [{ role: "user", content }],
        text: { format: { type: "json_object" } },
      });
      let out = "";
      for (const o of r.output ?? []) {
        if (o.type !== "message") continue;
        for (const c of o.content) if (c.type === "output_text") out += c.text;
      }
      const m = out.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(m ? m[0] : out) as { title?: string; cards?: AiCard[] };
      const cards = (parsed.cards ?? [])
        .filter((c) => c && typeof c.term === "string" && typeof c.definition === "string" && c.term.trim())
        .map((c) => ({ term: c.term.trim(), definition: c.definition.trim() }));
      return { title: parsed.title ?? "", cards, error: cards.length ? undefined : "No cards could be found." };
    } catch (e) {
      console.error("aiExtractCards", e, e instanceof GatewayError ? JSON.stringify(e.remote) : "");
      if (e instanceof GatewayError && e.httpStatus === 402) return { title: "", cards: [], error: "AI credits have run out." };
      if (e instanceof GatewayError && e.httpStatus === 429) return { title: "", cards: [], error: "Too many requests — try again in a minute." };
      return { title: "", cards: [], error: "The AI scan failed. Please try again." };
    }
  });
