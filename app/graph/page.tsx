import KnowledgeGraph from "@/components/Graph/KnowledgeGraph";
import { getKnowledgeGraph } from "@/lib/graph";

export default async function GraphPage() {
  const data = await getKnowledgeGraph();

  return (
    <main className="h-full min-h-0 w-full p-4 sm:p-6">
      <KnowledgeGraph data={data} />
    </main>
  );
}