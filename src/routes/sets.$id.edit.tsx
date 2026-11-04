import { createFileRoute } from "@tanstack/react-router";
import { SetEditor } from "@/components/SetEditor";
import { Shell } from "@/components/ui-kit";
import { useSet } from "@/lib/store";

export const Route = createFileRoute("/sets/$id/edit")({
  head: () => ({
    meta: [
      { title: "Edit set — Flashdeck" },
      { name: "description", content: "Edit the terms and definitions in your study set." },
      { property: "og:title", content: "Edit set — Flashdeck" },
      { property: "og:description", content: "Edit the terms and definitions in your study set." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Edit,
});

function Edit() {
  const { id } = Route.useParams();
  const set = useSet(id);
  return <Shell>{set ? <SetEditor key={set.id} initial={set} /> : <p className="text-muted-foreground">Loading…</p>}</Shell>;
}
