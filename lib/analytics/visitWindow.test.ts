import { describe, expect, it } from "vitest";
import { getVisitWindowStart } from "./visitWindow";

describe("getVisitWindowStart", () => {
  it("rounds down to the current UTC half-hour", () => {
    expect(
      getVisitWindowStart(new Date("2026-09-05T08:29:59.999Z")),
    ).toEqual(new Date("2026-09-05T08:00:00.000Z"));
    expect(
      getVisitWindowStart(new Date("2026-09-05T08:30:00.000Z")),
    ).toEqual(new Date("2026-09-05T08:30:00.000Z"));
  });
});
