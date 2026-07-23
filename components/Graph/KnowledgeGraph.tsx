'use client'

import { KnowledgeGraphData } from "@/lib/graph"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

const ForceGraph2D = dynamic(
    ()=>
        import("react-force-graph-2d").then(
            (module)=>module.default
        ),
        {
            ssr:false
        }
)

type KnowledgeGraphProps = {
    data: KnowledgeGraphData
}


type LabelBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function KnowledgeGraph({
    data
}: KnowledgeGraphProps) {
    
    const router = useRouter()
    const containerRef = useRef<HTMLDivElement>(null)
    
    const [size, setSize] = useState({
        width: 0,
        height: 0,
    })
    
    const [isDark, setIsDark] = useState(false)
    
    const labelBoxesRef = useRef<LabelBox[]>([]);
    
    useEffect(() => {
        function updateSize() {
            const current = containerRef.current;

            if (!current) {
            return;
            }

            setSize({
            width: current.clientWidth,
            height: current.clientHeight,
            });
        }

        const current = containerRef.current;

        if (!current) {
            return;
        }

        updateSize();

        const resizeObserver =
            new ResizeObserver(updateSize);

        resizeObserver.observe(current);

        return () => {
            resizeObserver.disconnect();
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;

        function updateTheme() {
            setIsDark(
            root.dataset.theme === "dark",
            );
        }

        // 第一次进入图谱时读取当前主题
        updateTheme();

        // 监听 data-theme 变化
        const observer = new MutationObserver(
            updateTheme,
        );

        observer.observe(root, {
            attributes: true,
            attributeFilter: ["data-theme"],
        });

        return () => {
            observer.disconnect();
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className=" h-full min-h-0 w-full overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800"
        >
            {
                size.width > 0 && size.height >0 && (
                    <ForceGraph2D
                        graphData={data}
                        width={size.width}
                        height={size.height}

                        nodeId="id"
                        nodeLabel="name"
                        nodeAutoColorBy="group"

                        linkColor={() =>
                            isDark
                            ? "rgba(148, 163, 184, 0.4)"
                            : "rgba(71, 85, 105, 0.35)"
                        }

                        backgroundColor={
                            isDark ? "#0a0a0a" : "#ffffff"
                        }

                        minZoom={0.01}
                        maxZoom={20}

                        nodeRelSize={2}
                        nodeVal={(node) =>
                            1 + Math.log2(Number(node.val ?? 1))
                        }

                        onRenderFramePre={() => {
                            labelBoxesRef.current = [];
                        }}

                        showPointerCursor={(object) =>
                            object !== undefined
                        }

                        onNodeClick={(node) => {
                            if (typeof node.id !== "string") {
                                return;
                            }

                            router.push(`/posts/${node.id}`);
                        }}


                        nodeCanvasObjectMode={() => "after"}
                        nodeCanvasObject={(
                            node,
                            context,
                            globalScale,
                        ) => {
                            if (
                            node.x === undefined ||
                            node.y === undefined
                            ) {
                            return;
                            }

                            const importance = Number(node.val ?? 1);

                            // 缩到特别小时，隐藏全部标题
                            if (globalScale < 0.25) {
                            return;
                            }

                            // 普通节点更早隐藏，只保留连接较多的节点
                            if (
                            globalScale < 0.65 &&
                            importance < 4
                            ) {
                            return;
                            }

                            const label = String(node.name ?? "");

                            // 缩小时文字跟着变小，放大时最多保持 12px
                            const screenFontSize = Math.min(
                            12,
                            10 * globalScale,
                            );

                            if (screenFontSize < 3) {
                            return;
                            }

                            const fontSize =
                            screenFontSize / globalScale;

                            context.save();

                            context.font =
                            `500 ${fontSize}px Arial`;

                            context.textBaseline = "middle";

                            const textWidth =
                            context.measureText(label).width;

                            const x = node.x + 5;
                            const y = node.y;

                            const box: LabelBox = {
                            x,
                            y: y - fontSize / 2,
                            width: textWidth,
                            height: fontSize,
                            };

                            // 检查这个标签是否与之前的标签重叠
                            const overlaps =
                            labelBoxesRef.current.some(
                                (other) =>
                                box.x < other.x + other.width &&
                                box.x + box.width > other.x &&
                                box.y < other.y + other.height &&
                                box.y + box.height > other.y,
                            );

                            if (overlaps) {
                            context.restore();
                            return;
                            }

                            labelBoxesRef.current.push(box);

                            context.globalAlpha = Math.min(
                            1,
                            globalScale,
                            );

                            context.fillStyle = isDark
                            ? "#e2e8f0"
                            : "#334155";

                            context.fillText(label, x, y);

                            context.restore();
                        }}
                    />
                ) 
            }
        </div>
    )
}