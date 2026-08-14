import { describe, expect, it } from "vitest";
import { wrapText } from "../src/wrap-text.js";

const measure = {
  getTextWidth: (text: string) => text.length * 10,
};

describe("wrapText", () => {
  it("returns the full text when it fits within the width", () => {
    expect(wrapText("hello", measure, 100)).toEqual(["hello"]);
  });

  it("wraps words onto new lines when they exceed the width", () => {
    expect(wrapText("one two three", measure, 50)).toEqual(["one", "two", "three"]);
  });

  it("keeps a single word on its own line even when overflowing", () => {
    expect(wrapText("supercalifragilistic", measure, 50)).toEqual([
      "supercalifragilistic",
    ]);
  });

  it("preserves explicit newlines", () => {
    expect(wrapText("line one\nline two", measure, 500)).toEqual([
      "line one",
      "line two",
    ]);
  });

  it("does not wrap when width is unset (0/undefined)", () => {
    expect(wrapText("a b c", measure, 0)).toEqual(["a b c"]);
  });
});
