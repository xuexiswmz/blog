import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ReadingProgressRing from "./ReadingProgressRing";

describe("ReadingProgressRing", () => {
  it("renders accessible progress with a gray track and blue arc", () => {
    const markup = renderToStaticMarkup(<ReadingProgressRing progress={42} />);

    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-label="阅读进度"');
    expect(markup).toContain('aria-valuenow="42"');
    expect(markup).toContain('data-ring-part="track"');
    expect(markup).toContain("text-slate-200");
    expect(markup).toContain('data-ring-part="progress"');
    expect(markup).toContain("text-blue-500");
  });

  it("clamps progress before calculating the stroke offset", () => {
    const full = renderToStaticMarkup(<ReadingProgressRing progress={180} />);
    const empty = renderToStaticMarkup(<ReadingProgressRing progress={-20} />);

    expect(full).toContain('aria-valuenow="100"');
    expect(full).toContain('stroke-dashoffset="0"');
    expect(empty).toContain('aria-valuenow="0"');
    expect(empty).not.toContain('stroke-dashoffset="0"');
  });
});
