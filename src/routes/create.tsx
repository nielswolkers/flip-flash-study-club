import { createFileRoute } from "@tanstack/react-router";
import { CreateChooser } from "@/components/CreateChooser";
import { Shell } from "@/components/ui-kit";

export const Route = createFileRoute("/create")({
  head: () => ({
    meta: [
      { title: "Create a study set — Flashdeck" },
      { name: "description", content: "Build a new flashcard set or import from a list." },
      { property: "og:title", content: "Create a study set — Flashdeck" },
      { property: "og:description", content: "Build a new flashcard set or import from a list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Shell><CreateChooser /></Shell>,
});
