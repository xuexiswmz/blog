import { afterEach, describe, expect, it, vi } from "vitest";
import { trackArticleVisit } from "./articleVisitApi";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });
  return { promise, resolve };
}

function createSerialLockManager() {
  let tail: Promise<unknown> = Promise.resolve();

  return {
    request<T>(
      _name: string,
      callback: () => T | PromiseLike<T>,
    ): Promise<T> {
      const result = tail.then(callback, callback);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}

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

  it("serializes a duplicate invocation while the first request is unresolved", async () => {
    const firstResponse = createDeferred<Response>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse.promise)
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { locks: createSerialLockManager() });

    const firstVisit = trackArticleVisit("css-grid");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    const duplicateVisit = trackArticleVisit("css-grid");
    await Promise.resolve();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    firstResponse.resolve(new Response(null, { status: 204 }));
    await Promise.all([firstVisit, duplicateVisit]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("queues rather than drops a concurrent visit to another article", async () => {
    const firstResponse = createDeferred<Response>();
    const fetchMock = vi
      .fn()
      .mockReturnValueOnce(firstResponse.promise)
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("navigator", { locks: createSerialLockManager() });

    const firstVisit = trackArticleVisit("css-grid");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const secondVisit = trackArticleVisit("react-effects");

    firstResponse.resolve(new Response(null, { status: 204 }));
    await Promise.all([firstVisit, secondVisit]);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/posts/react-effects/visits",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
