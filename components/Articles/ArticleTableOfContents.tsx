import type { TableOfContentsItem } from "./articleReading";
import ReadingProgressRing from "./ReadingProgressRing";

export default function ArticleTableOfContents({
  items,
  activeId,
  progress,
  onNavigate,
}: {
  items: TableOfContentsItem[];
  activeId: string | null;
  progress: number;
  onNavigate: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 px-3">
        <h2 className="text-sm font-semibold text-foreground">目录</h2>
        <ReadingProgressRing progress={progress} />
      </div>
      {items.length > 0 ? (
        <nav aria-label="本文目录">
          <ul>
            {items.map((item) => {
              const active = item.id === activeId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    data-toc-id={item.id}
                    aria-current={active ? "location" : undefined}
                    onClick={() => onNavigate(item.id)}
                    className={`block w-full border-l-2 py-1.5 pr-2 text-left text-sm leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                      item.level === 3 ? "pl-6" : "pl-3"
                    } ${
                      active
                        ? "-ml-px border-l-link text-link"
                        : "-ml-px border-l-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
