import { test, describe } from "node:test";
import { strictEqual } from "node:assert";

import { SVGPathData } from "svg-pathdata";

import { REVERSE_PATH } from "./reverse.ts";

function runReversal(path: string): string {
  const pathData = new SVGPathData(path).toAbs();
  pathData.commands = REVERSE_PATH(pathData.commands);
  return pathData.encode();
}

describe("Reverse paths", () => {
  test("simple line path", () => {
    const input = "M10,10 L20,20 L30,10";
    const expected = "M30 10L20 20L10 10";
    strictEqual(runReversal(input), expected);
  });

  test("horizontal and vertical lines", () => {
    const input = "M10,10 H30 V30 H10";
    const expected = "M10 30H30V10H10";
    strictEqual(runReversal(input), expected);
  });

  test("closed path (with Z command)", () => {
    const input = "M10,10 L20,20 L30,10 Z";
    // The Z command is preserved in the reversed path
    const expected = "M30 10L20 20L10 10z";
    strictEqual(runReversal(input), expected);
  });

  test("path with cubic bezier curves", () => {
    const input = "M10,10 C20,20 40,20 50,10";
    // Reversed path with flipped control points
    const expected = "M50 10C40 20 20 20 10 10";
    strictEqual(runReversal(input), expected);
  });

  test("path with quadratic bezier curve (converted to cubic)", () => {
    const input = "M10,10 Q25,25 40,10";
    // Quadratic curve is converted to cubic in the reverse process
    const expected = "M40 10C25 25 25 25 10 10";
    strictEqual(runReversal(input), expected);
  });

  test("relative commands should be converted to absolute", () => {
    const input = "m10,10 l10,10 l10,-10";
    const expected = "M30 10L20 20L10 10";
    strictEqual(runReversal(input), expected);
  });

  test("single point path", () => {
    const input = "M10,10";
    // A single point path results in just a move command
    const expected = "M10 10";
    strictEqual(runReversal(input), expected);
  });

  test("empty path", () => {
    const input = "";
    const expected = "";
    strictEqual(runReversal(input), expected);
  });

  test("path closed both explicitly and implicitly", () => {
    const input = "M10,10 L20,20 L30,10 L10,10 Z"; // Note: Last point (10,10) matches first point + Z
    // Should still reverse correctly and maintain Z
    const expected = "M10 10L30 10L20 20L10 10z";
    strictEqual(runReversal(input), expected);
  });

  test("path closed only implicitly (without Z command)", () => {
    const input = "M10,10 L20,20 L30,10 L10,10"; // Note: Last point matches first point, but no Z
    // Should still reverse correctly and maintain implicit closure
    const expected = "M10 10L30 10L20 20L10 10";
    strictEqual(runReversal(input), expected);
  });
});
