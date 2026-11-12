import { beforeEach, describe, expect, it, vi } from "vitest";

const fileSystem = vi.hoisted(() => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => fileSystem);

import { getKnowledgeGraph } from "./graph";

describe("knowledge graph", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fileSystem.readdir.mockResolvedValue(["a.mdx", "b.mdx", "c.mdx"]);
    fileSystem.readFile.mockImplementation(async (filePath: string) => {
      const slug = filePath.split("/").at(-1)?.replace(".mdx", "");

      if (slug === "a") {
        return `---
title: A
tags:
  - css
related:
  - b
  - missing
---

# A

See [B](/posts/b).
`;
      }

      if (slug === "b") {
        return `---
title: B
tags:
  - js
---

# B

See [A](/posts/a).
`;
      }

      return `---
title: C
---

# C
`;
    });
  });

  it("turns frontmatter related slugs and inline links into graph edges", async () => {
    const graph = await getKnowledgeGraph();

    expect(graph.nodes).toHaveLength(3);
    expect(graph.links).toEqual(
      expect.arrayContaining([
        { source: "a", target: "b" },
        { source: "b", target: "a" },
      ]),
    );
    expect(graph.links).toHaveLength(2);
    expect(graph.nodes.find((node) => node.id === "a")).toMatchObject({
      name: "A",
      group: "css",
    });
  });

  it("ignores missing related slugs and duplicate edges", async () => {
    fileSystem.readFile.mockImplementation(async (filePath: string) => {
      const slug = filePath.split("/").at(-1)?.replace(".mdx", "");

      if (slug === "a") {
        return `---
title: A
related:
  - b
  - b
  - missing
---

See [B](/posts/b).
`;
      }

      return `---
title: ${slug}
---
`;
    });

    const graph = await getKnowledgeGraph();

    expect(graph.links).toEqual([{ source: "a", target: "b" }]);
  });
});
