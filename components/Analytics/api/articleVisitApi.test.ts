import { afterEach, describe, expect, it, vi } from "vitest";
import { trackArticleVisit } from "./articleVisitApi";

describe("trackArticleVisit", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts an encoded slug as a keepalive request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await trackArticleVisit("css/grid");

    expect(fetchMock).toHaveBeenCalledWith("/api/posts/css%2Fgrid/visits", {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  });

  it("swallows network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    await expect(trackArticleVisit("css-grid")).resolves.toBeUndefined();
  });
});
