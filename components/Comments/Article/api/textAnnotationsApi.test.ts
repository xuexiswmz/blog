import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NewTextAnnotation, TextAnnotation } from "../../Comment/types";
import {
  createTextAnnotation,
  requestTextAnnotations,
} from "./textAnnotationsApi";

const fetchMock = vi.fn();

const annotation: TextAnnotation = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  postSlug: "css-centering",
  paragraphId: "p-123456789abc",
  startOffset: 0,
  endOffset: 4,
  selectedText: "测试文字",
  lineStyle: "double",
  color: "amber",
  createdAt: "2026-08-27T00:00:00.000Z",
};

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("requestTextAnnotations", () => {
  it("读取指定文章的公开画线", async () => {
    const controller = new AbortController();

    fetchMock.mockResolvedValue(
      Response.json({
        annotations: [annotation],
      }),
    );

    const result = await requestTextAnnotations(
      "css-centering",
      controller.signal,
    );

    expect(result).toEqual([annotation]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/css-centering/text-annotations",
      {
        method: "GET",
        cache: "no-cache",
        signal: controller.signal,
      },
    );
  });

  it("服务端读取失败时抛出接口消息", async () => {
    fetchMock.mockResolvedValue(
      Response.json(
        {
          message: "读取文章画线失败",
        },
        {
          status: 500,
        },
      ),
    );

    await expect(
      requestTextAnnotations("css-centering"),
    ).rejects.toThrow("读取文章画线失败");
  });
});

describe("createTextAnnotation", () => {
  it("向指定文章提交最终画线范围", async () => {
    const input: NewTextAnnotation = {
      paragraphId: "p-123456789abc",
      startOffset: 0,
      endOffset: 4,
      selectedText: "测试文字",
      lineStyle: "double",
      color: "amber",
    };

    fetchMock.mockResolvedValue(
      Response.json(
        {
          annotation,
          replacedIds: ["old-annotation"],
        },
        {
          status: 201,
        },
      ),
    );

    const result = await createTextAnnotation(
      "css-centering",
      input,
    );

    expect(result).toEqual({
      annotation,
      replacedIds: ["old-annotation"],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/posts/css-centering/text-annotations",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      },
    );
  });
});
