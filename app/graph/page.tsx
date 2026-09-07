import KnowledgeGraph from "@/components/Graph/KnowledgeGraph";
import { getKnowledgeGraph } from "@/lib/graph";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "知识图谱",
  description: "浏览博客文章之间的主题关联与知识结构。",
  alternates: {
    canonical: "/graph",
  },
};

export default async function GraphPage() {
  const data = await getKnowledgeGraph();

  return (
    <main className="h-full min-h-0 w-full p-4 sm:p-6">
      <KnowledgeGraph data={data} />
    </main>
  );
}
