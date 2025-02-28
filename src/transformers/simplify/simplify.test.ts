import { test, describe } from "node:test";
import { strictEqual } from "node:assert";

import { SVGPathData } from "svg-pathdata";
import { REMOVE_COLLINEAR, REMOVE_DUPLICATES } from "./simplify.ts";

function runRemoveCollinear(path: string): string {
  const pathData = new SVGPathData(path).toAbs();
  pathData.commands = REMOVE_COLLINEAR(pathData.commands);
  return pathData.encode();
}

function runRemoveDuplicates(path: string): string {
  return new SVGPathData(path).toAbs().transform(REMOVE_DUPLICATES()).encode();
}

function runFullSimplification(path: string): string {
  const pathData = new SVGPathData(path).toAbs().transform(REMOVE_DUPLICATES());
  pathData.commands = REMOVE_COLLINEAR(pathData.commands);
  return pathData.encode();
}

function normalizePath(path: string): string {
  return new SVGPathData(path).toAbs().encode();
}

describe("Remove collinear points", () => {
  test("Horizontal line with collinear point", () => {
    const input = "M10,10 L20,10 L30,10";
    const expected = "M10 10L30 10";
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Diagonal line with collinear point", () => {
    const input = "M10,10 L20,20 L30,30";
    const expected = "M10 10L30 30";
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Vertical line with collinear point", () => {
    const input = "M10,10 L10,20 L10,30";
    const expected = "M10 10L10 30";
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Multiple collinear sections", () => {
    const input = "M10,10 L20,10 L30,10 L40,20 L50,30 L60,40 L60,50 L60,60";
    const expected = "M10 10L30 10L60 40L60 60";
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Preserves curves", () => {
    const input = "M10,10 C20,20 30,20 40,10 L50,10 L60,10";
    const expected = "M10 10C20 20 30 20 40 10L60 10";
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Preserves closed paths", () => {
    const input = "M10,10 L20,10 L30,10 L30,20 L10,20 Z";
    const expected = "M10 10L30 10L30 20L10 20z";
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Handles multiple subpaths", () => {
    const input = "M10,10 L20,10 L30,10 M40,40 L50,40 L60,40";
    const expected = "M10 10L30 10M40 40L60 40";
    strictEqual(runRemoveCollinear(input), expected);
  });
});

describe("Remove duplicate points", () => {
  test("Exact duplicate points", () => {
    const input = "M10,10 L10,10 L20,20";
    const expected = "M10 10L20 20";
    strictEqual(runRemoveDuplicates(input), expected);
  });

  test("Very close points (below tolerance)", () => {
    const input = "M10,10 L10.0000001,10.0000001 L20,20";
    const expected = "M10 10L20 20";
    strictEqual(runRemoveDuplicates(input), expected);
  });

  test("Points that should not be removed (above tolerance)", () => {
    const input = "M10,10 L10.01,10 L20,20";
    const expected = normalizePath(input);
    strictEqual(runRemoveDuplicates(input), expected);
  });

  test("Preserves curves with same endpoints", () => {
    const input = "M10,10 C20,0 30,0 10,10";
    const expected = normalizePath(input);
    strictEqual(runRemoveDuplicates(input), expected);
  });

  test("Preserves first MOVE_TO", () => {
    const input = "M10,10 M10,10 L20,20";
    const expected = "M10 10L20 20";
    strictEqual(runRemoveDuplicates(input), expected);
  });
});

describe("Combined simplification", () => {
  test("Complex path with duplicates and collinear points", () => {
    const input = `M 10,10 
                  L 10,10 
                  L 20,10 
                  L 30,10 
                  L 40,20 
                  L 50,30 
                  L 50,30.0000001 
                  L 60,40`;
    const expected = "M10 10L30 10L60 40";

    strictEqual(runFullSimplification(input), expected);
  });

  test("Preserves curves properly", () => {
    const input = `M 10,10 
                  C 20,5 30,5 40,10 
                  L 50,10 
                  L 60,10 
                  Q 70,10 70,20 
                  L 70,30 
                  L 70,40 
                  Z`;
    const expected = "M10 10C20 5 30 5 40 10L60 10Q70 10 70 20L70 40z";
    strictEqual(runFullSimplification(input), expected);
  });

  test("Handles multiple subpaths with mixed elements", () => {
    const input = `M 10,10 
                  L 30,10 
                  L 40,10 
                  C 50,10 60,20 60,30 
                  L 60,40 
                  L 60,50 
                  M 100,100 
                  L 100,110 
                  L 100,120 
                  Q 100,130 110,130 
                  L 120,130 
                  L 120,130.0000001 
                  Z`;
    const expected = "M10 10L40 10C50 10 60 20 60 30L60 50M100 100L100 120Q100 130 110 130L120 130z";
    strictEqual(runFullSimplification(input), expected);
  });
});

// A more complex test to check for potential regression
describe("Edge cases", () => {
  test("U-turns and tight angles", () => {
    const input = "M10,10 L20,20 L20,10 L10,10";
    const expected = normalizePath(input);
    strictEqual(runFullSimplification(input), expected);
  });

  test("Nearly collinear points (just outside tolerance)", () => {
    const input = "M10,10 L20,10.011 L30,10";
    const expected = normalizePath(input);
    strictEqual(runRemoveCollinear(input), expected);
  });

  test("Empty path or single point", () => {
    const input = "M10,10";
    const expected = normalizePath(input);
    strictEqual(runFullSimplification(input), expected);
  });

  test("Path with only curves", () => {
    const input = "M10,10 C20,0 30,0 40,10 C50,20 60,20 70,10";
    const expected = normalizePath(input);
    strictEqual(runFullSimplification(input), expected);
  });
});
