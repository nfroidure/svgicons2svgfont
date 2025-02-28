import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";
import type { SVGCommand } from "svg-pathdata";
import { arePointsSame, dotProduct, createVector, crossProduct } from "../utils/geometry.ts";
import type { CommandWithPoint, Point } from "../utils/geometry.ts";

/**
 * Transformer that removes duplicate points
 * @param minLength Distance threshold below which points are considered identical
 * @returns A transformer function that removes duplicate points
 */
export function REMOVE_DUPLICATES(minLength = 1e-6) {
  let isFirstMove = true;
  let prevPoint: Point | null = null;

  return SVGPathDataTransformer.INFO((cmd, px, py) => {
    // Get the current command's absolute coordinates
    const currentPoint = { x: cmd.x ?? px, y: cmd.y ?? py };

    switch (cmd.type) {
      // Always keep CLOSE_PATH
      case SVGPathData.CLOSE_PATH:
        prevPoint = null;
        return cmd;

      // Always keep first MOVE_TO
      case SVGPathData.MOVE_TO: {
        if (isFirstMove) {
          isFirstMove = false;
          break;
        }
        // Check for duplicate points
        if (prevPoint && arePointsSame(currentPoint, prevPoint, minLength)) {
          return [];
        }
        break;
      }

      // Only check these line commands for duplicates
      case SVGPathData.LINE_TO:
      case SVGPathData.HORIZ_LINE_TO:
      case SVGPathData.VERT_LINE_TO:
        // Check for duplicate points
        if (prevPoint && arePointsSame(currentPoint, prevPoint, minLength)) {
          return [];
        }
        break;
    }

    // Update previous point for next command
    prevPoint = currentPoint;
    return cmd;
  });
}

/**
 * Determines if three points are collinear and the middle point is removable
 * Uses a mathematically precise cross product approach
 *
 * @param p1 First point
 * @param p2 Middle point that might be removed
 * @param p3 Last point
 * @returns true if the points are collinear and p2 can be removed
 */
function arePointsCollinear(p1: Point, p2: Point, p3: Point): boolean {
  // Create vectors using utility function
  const v1 = createVector(p1, p2);
  const v2 = createVector(p2, p3);

  // Cross product: if it's zero (or very close), the points are collinear
  // Using the imported crossProduct function from geometry.ts
  const cross = crossProduct(v1, v2);
  const isCollinear = Math.abs(cross) < 1e-10;

  // Dot product using utility function
  const dot = dotProduct(v1, v2);
  const sameDirection = dot > 0;

  // Points are collinear and middle point can be removed if:
  // 1. They form a straight line (cross product ≈ 0)
  // 2. The segments point in same direction (not a sharp corner)
  return isCollinear && sameDirection;
}

/**
 * Process a single subpath and remove collinear points
 * This is a batch processor that takes an array of commands for a single subpath (no additional MOVE_TO commands)
 * @param commands Array of SVG path commands to process (must be absolute)
 * @returns New array with collinear points removed
 */
export function REMOVE_COLLINEAR(commands: SVGCommand[]) {
  if (commands.length <= 2) return commands;

  // Extract commands with point coordinates
  const commandsWithPoints: CommandWithPoint[] = commands.map(
    SVGPathDataTransformer.INFO((command, previousX, previousY) => ({
      ...command,
      x: command.x ?? previousX,
      y: command.y ?? previousY,
    })),
  );

  // Create result array and keep the first command
  const result: CommandWithPoint[] = [commandsWithPoints[0]];
  let close: CommandWithPoint | undefined = undefined;
  if (commandsWithPoints[commandsWithPoints.length - 1].type === SVGPathData.CLOSE_PATH) {
    close = commandsWithPoints.pop();
  }

  let prevCmd = result[0];

  // Check triplets of points for collinearity
  for (let i = 1; i < commandsWithPoints.length - 1; ++i) {
    const cmd = commandsWithPoints[i];
    const nextCmd = commandsWithPoints[i + 1];

    if (
      nextCmd &&
      nextCmd.type !== SVGPathData.CLOSE_PATH &&
      (cmd.type === SVGPathData.LINE_TO ||
        cmd.type === SVGPathData.HORIZ_LINE_TO ||
        cmd.type === SVGPathData.VERT_LINE_TO)
    ) {
      if (arePointsCollinear(prevCmd, cmd, nextCmd)) {
        // Skip this command - don't add to result
        continue;
      }
    }
    // Add the current command to the result
    result.push(cmd);
    prevCmd = cmd;
  }

  result.push(commandsWithPoints[commandsWithPoints.length - 1]);
  if (close) {
    result.push(close);
  }

  return result;
}
