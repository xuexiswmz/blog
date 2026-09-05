import { describe, expect, it } from "vitest";
import {
  formatShanghaiDate,
  parseAnalyticsPagination,
  parseAnalyticsRange,
} from "./range";

describe("parseAnalyticsRange", () => {
  const now = new Date("2026-09-05T08:30:00.000Z");

  it("defaults to the last 30 Shanghai calendar days", () => {
    expect(parseAnalyticsRange(null, now)).toEqual({
      key: "30d",
      start: new Date("2026-08-06T16:00:00.000Z"),
      end: now,
      timezone: "Asia/Shanghai",
    });
  });

  it("supports all without a start boundary", () => {
    expect(parseAnalyticsRange("all", now)).toEqual({
      key: "all",
      start: null,
      end: now,
      timezone: "Asia/Shanghai",
    });
  });

  it("rejects an unsupported range", () => {
    expect(parseAnalyticsRange("365d", now)).toBeNull();
  });
});

describe("parseAnalyticsPagination", () => {
  it("applies defaults and caps page size", () => {
    expect(parseAnalyticsPagination(null, null)).toEqual({ page: 1, pageSize: 20 });
    expect(parseAnalyticsPagination("2", "200")).toEqual({ page: 2, pageSize: 100 });
  });

  it("rejects invalid page numbers", () => {
    expect(parseAnalyticsPagination("0", "20")).toBeNull();
    expect(parseAnalyticsPagination("abc", "20")).toBeNull();
  });
});

it("formats dates using the Shanghai calendar day", () => {
  expect(formatShanghaiDate(new Date("2026-09-04T16:30:00.000Z"))).toBe(
    "2026-09-05",
  );
});
