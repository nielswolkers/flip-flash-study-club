import { useSyncExternalStore } from "react";

export type Card = { id: string; term: string; definition: string; starred?: boolean; known?: number };
export type StudySet = { id: string; title: string; description: string; cards: Card[]; createdAt: number; lastStudied?: number };

const KEY = "flashdeck.sets.v1";
export const uid = () => Math.random().toString(36).slice(2, 10);

const SEED: StudySet[] = [
  {
    id: "seed-capitals",
    title: "European capitals",
    description: "Classic geography warm-up",
    createdAt: Date.now(),
    cards: [
      ["France", "Paris"], ["Netherlands", "Amsterdam"], ["Germany", "Berlin"], ["Spain", "Madrid"],
      ["Italy", "Rome"], ["Portugal", "Lisbon"], ["Poland", "Warsaw"], ["Sweden", "Stockholm"],
    ].map(([term, definition]) => ({ id: uid(), term, definition })),
  },
  {
    id: "seed-spanish",
    title: "Spanish basics",
    description: "Everyday words",
    createdAt: Date.now() - 1000,
    cards: [
      ["hello", "hola"], ["thank you", "gracias"], ["please", "por favor"], ["water", "agua"],
      ["house", "casa"], ["friend", "amigo"],
    ].map(([term, definition]) => ({ id: uid(), term, definition })),
  },
];

let cache: StudySet[] | null = null;
const listeners = new Set<() => void>();
const EMPTY: StudySet[] = [];

function load(): StudySet[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? JSON.parse(raw) : SEED;
    if (!raw) localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    cache = SEED;
  }
  return cache!;
}

function save(sets: StudySet[]) {
  cache = sets;
  localStorage.setItem(KEY, JSON.stringify(sets));
  listeners.forEach((l) => l());
}

export function useSets() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    load,
    () => EMPTY,
  );
}

export function useSet(id: string) {
  return useSets().find((s) => s.id === id);
}

export function upsertSet(set: StudySet) {
  const sets = load();
  const exists = sets.some((s) => s.id === set.id);
  save(exists ? sets.map((s) => (s.id === set.id ? set : s)) : [set, ...sets]);
}

export function deleteSet(id: string) {
  save(load().filter((s) => s.id !== id));
}

export function updateCard(setId: string, cardId: string, patch: Partial<Card>) {
  save(load().map((s) => s.id !== setId ? s : { ...s, cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }));
}

export function touchSet(setId: string) {
  save(load().map((s) => (s.id === setId ? { ...s, lastStudied: Date.now() } : s)));
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lenient answer check: ignores case, accents, punctuation and extra spaces. */
export function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
}
export function isCorrect(answer: string, expected: string) {
  const a = normalize(answer);
  if (!a) return false;
  return expected.split(/[,;/]/).map(normalize).some((e) => e === a) || normalize(expected) === a;
}

/** Parse "term<TAB>definition" lines (Quizlet export format), also supports " - " and "=". */
export function parseImport(text: string): { term: string; definition: string }[] {
  return text.split(/\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
    const sep = l.includes("\t") ? "\t" : l.includes(" = ") ? " = " : l.includes(" - ") ? " - " : ",";
    const i = l.indexOf(sep);
    return i < 0 ? { term: l, definition: "" } : { term: l.slice(0, i).trim(), definition: l.slice(i + sep.length).trim() };
  });
}
