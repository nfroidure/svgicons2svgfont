import type { SVGCommand } from "svg-pathdata";
import { SVGPathData } from "svg-pathdata";
import type { Point } from "./geometry.ts";

/**
 * Debug utility to convert command type to string
 */
function typeToString(cmd: SVGCommand): string {
  switch (cmd.type) {
    case SVGPathData.CLOSE_PATH:
      return "CLOSE_PATH";
    case SVGPathData.MOVE_TO:
      return "MOVE_TO";
    case SVGPathData.HORIZ_LINE_TO:
      return "HORIZ_LINE_TO";
    case SVGPathData.VERT_LINE_TO:
      return "VERT_LINE_TO";
    case SVGPathData.LINE_TO:
      return "LINE_TO";
    case SVGPathData.CURVE_TO:
      return "CURVE_TO";
    case SVGPathData.SMOOTH_CURVE_TO:
      return "SMOOTH_CURVE_TO";
    case SVGPathData.QUAD_TO:
      return "QUAD_TO";
    case SVGPathData.SMOOTH_QUAD_TO:
      return "SMOOTH_QUAD_TO";
    case SVGPathData.ARC:
      return "ARC";
  }
}

type DebugCommand = string | number | boolean | null | undefined | SVGCommand | Point;

/**
 * Debug utility to stringify a command
 */
function debugCommand(item: DebugCommand): unknown {
  if (!item || typeof item !== "object") {
    return item;
  }
  if ("type" in item) {
    return item ? `${typeToString(item)}: ${JSON.stringify(item)}` : "null";
  }
  return JSON.stringify(item);
}

/**
 * Debug utility to log information
 * Can be conditionally disabled
 */
export function debugString(...args: (DebugCommand | DebugCommand[])[]): void {
  const pArgs = args.map((a) => {
    if (Array.isArray(a)) {
      return a.map(debugCommand);
    }
    return debugCommand(a);
  });
  // TODO: disable this conditionally
  console.debug(...pArgs);
}
