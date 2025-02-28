import type { CommandM, SVGCommand } from "svg-pathdata";
import { SVGPathData, SVGPathDataTransformer } from "svg-pathdata";
import { calculateStandardCornerOffset, calculateCurveEndpointOffset, transformControlPoints } from "./math.ts";
import type { Point, CommandWithPoint } from "../utils/geometry.ts";
import { arePointsSame } from "../utils/geometry.ts";
import { REVERSE_PATH } from "../reverse/reverse.ts";

/**
 * Creates a complete outline for any path (closed or open)
 * @param distance Offset distance (thickness) of the outline
 * @param commands SVG path commands to outline
 * @returns New SVG commands forming the outline
 */
export function OUTLINE(distance: number, commands: SVGCommand[]): SVGCommand[] {
  if (commands.length < 2) {
    throw new Error("Paths must have at least 2 commands");
  }

  const toABS = SVGPathDataTransformer.TO_ABS();

  const pathCommands: CommandWithPoint[] = commands.map(toABS).map(
    // Extract points to check if the path is implicitly closed
    SVGPathDataTransformer.INFO((command, px, py) => ({
      ...command,
      x: command.x ?? px,
      y: command.y ?? py,
    })),
  );

  // Check if path is explicitly closed with a CLOSE_PATH command or implicitly closed
  // (first and last points are the same)
  const isExplicitlyClosed = pathCommands.at(-1)?.type === SVGPathData.CLOSE_PATH;

  // Handle closed paths (explicit or implicit)
  if (isExplicitlyClosed || arePointsSame(pathCommands[0], pathCommands[pathCommands.length - 1])) {
    // Prepare path commands - only remove CLOSE_PATH if explicitly closed
    if (isExplicitlyClosed) {
      pathCommands.pop(); // Remove the last CLOSE_PATH
    }

    // Create inner offset path
    const innerPath = processPathWithOffset(pathCommands, -distance / 2);

    // Create outer offset path
    const outerPath = processPathWithOffset(pathCommands, distance / 2);

    // Reverse the inner path to create a counterclockwise path
    // This ensures proper path joining
    const reversedInnerPath = REVERSE_PATH(innerPath);

    // Combine outer path + reversed inner path to form complete outline
    return [
      // Add the outer path
      ...outerPath,
      // Add the reversed inner path
      ...reversedInnerPath,
      // Close the path
      { type: SVGPathData.CLOSE_PATH },
    ];
  }

  // For open paths, continue with the existing approach
  // Handle all non-closed paths by converting them to closed paths
  const reversedCommands = REVERSE_PATH(pathCommands);

  // Connect the original path with the reversed path
  const combinedPath = connectPaths(pathCommands, reversedCommands);

  // Process as a closed path with half the distance
  const transformedResult = processPathWithOffset(combinedPath, distance / 2);
  transformedResult.push({ type: SVGPathData.CLOSE_PATH });
  return transformedResult;
}

/**
 * Connects two paths together, ensuring proper command types and smooth transitions
 * @param pathA First path (original path)
 * @param pathB Second path (reversed pathA)
 * @returns A combined path with appropriate connections
 */
function connectPaths(pathA: SVGCommand[], pathB: SVGCommand[]): SVGCommand[] {
  if (pathA.length < 2 || pathB.length < 2) {
    throw new Error("Paths must have at least 2 commands");
  }

  // Create a copy of the first path
  const result = [...pathA];

  // Always add a LINE_TO connecting pathA to pathB
  // Convert the first MOVE_TO of pathB to a LINE_TO
  result.push({ ...(pathB[0] as CommandM), type: SVGPathData.LINE_TO });

  // Add all remaining commands from pathB (skip the first MOVE_TO)
  result.push(...pathB.slice(1));

  // Always add a LINE_TO back to the start point to ensure proper closure
  // This is critical for the offset calculation
  result.push({ ...(pathA[0] as CommandM), type: SVGPathData.LINE_TO });
  return result;
}

/**
 * Processes a path with the given offset for closed paths only
 * @param commands Path commands to offset
 * @param distance Offset distance from the original path
 * @returns New SVG commands forming the offset path
 */
function processPathWithOffset(commands: SVGCommand[], distance: number): SVGCommand[] {
  if (commands.length < 2) return commands;

  // Final result array
  const transformedResult: SVGCommand[] = [];

  // Extract commands with point coordinates in a single array using the transformer
  const commandsWithPoints: CommandWithPoint[] = commands.map(
    SVGPathDataTransformer.INFO((command, px, py) => ({
      ...command,
      x: command.x ?? px,
      y: command.y ?? py,
    })),
  );

  // Check if first and last points are the same (implicitly closed path)
  const isImplicitlyClosed = arePointsSame(commandsWithPoints[0], commandsWithPoints[commandsWithPoints.length - 1]);

  // If path is implicitly closed, prepare to handle the first MOVE_TO specially
  if (isImplicitlyClosed) {
    commandsWithPoints.shift(); // Remove the first command
  }

  const lastIndex = commandsWithPoints.length - 1;
  const firstIndex = 0;

  // Calculate new points with offset - directly calculating the offset and applying it
  const offsetPoints: Point[] = commandsWithPoints.map((currentCmd, i) => {
    // Get previous point, wrap around for first point
    const prevCmd = commandsWithPoints[i > 0 ? i - 1 : lastIndex];
    // Get next point, wrap around for last point
    const nextCmd = commandsWithPoints[i < lastIndex ? i + 1 : firstIndex];

    let offsetVector: Point;

    // Check for curve endpoints
    if (currentCmd.type === SVGPathData.CURVE_TO || nextCmd.type === SVGPathData.CURVE_TO) {
      // Get incoming control point (from current command if it's a curve)
      let cp2: Point | null = null;
      if (currentCmd.type === SVGPathData.CURVE_TO) {
        cp2 = { x: currentCmd.x2, y: currentCmd.y2 };
      } else if (prevCmd && !arePointsSame(prevCmd, currentCmd)) {
        // If no control point, use the previous point as direction
        cp2 = prevCmd;
      }

      // Get outgoing control point (from next command if it's a curve)
      let cp1: Point | null = null;
      if (nextCmd.type === SVGPathData.CURVE_TO) {
        cp1 = { x: nextCmd.x1, y: nextCmd.y1 };
      } else if (nextCmd && !arePointsSame(nextCmd, currentCmd)) {
        // If no control point, use the next point as direction
        cp1 = nextCmd;
      }

      // Calculate offset using available control points
      offsetVector = calculateCurveEndpointOffset(currentCmd, cp2, cp1, distance);
    } else {
      // Standard corner offset for non-curve points
      offsetVector = calculateStandardCornerOffset(prevCmd, currentCmd, nextCmd, distance);
    }

    // Apply the offset vector
    return {
      x: currentCmd.x + offsetVector.x,
      y: currentCmd.y + offsetVector.y,
    };
  });

  // Process each command in a single pass - iterate directly over commandsWithPoints
  for (let i = 0; i < commandsWithPoints.length; ++i) {
    const cmd = commandsWithPoints[i]; // This already has x,y coordinates

    // Get adjacent points for offset calculation
    // Get previous point, wrap around for first point
    const prevPoint = commandsWithPoints[i > 0 ? i - 1 : lastIndex];
    // Calculate the new offset point
    const offsetPoint = offsetPoints[i];
    // Get the last new point
    const prevOffsetPoint = offsetPoints[i > 0 ? i - 1 : lastIndex];

    // Add the appropriate command to the result
    switch (cmd.type) {
      case SVGPathData.MOVE_TO:
        transformedResult.push({ ...cmd, x: offsetPoint.x, y: offsetPoint.y });
        break;

      case SVGPathData.CURVE_TO: {
        // Calculate new control points directly without intermediate variables
        const { controlPoint1, controlPoint2 } = transformControlPoints(
          prevPoint, // originalStartPoint
          { x: cmd.x1, y: cmd.y1 }, // originalControlPoint1
          { x: cmd.x2, y: cmd.y2 }, // originalControlPoint2
          cmd, // originalEndPoint
          prevOffsetPoint, // newStartPoint
          offsetPoint, // newEndPoint
        );

        // Create new curve command
        transformedResult.push({
          ...cmd,
          x: offsetPoint.x,
          y: offsetPoint.y,
          x1: controlPoint1.x,
          y1: controlPoint1.y,
          x2: controlPoint2.x,
          y2: controlPoint2.y,
        });
        break;
      }

      case SVGPathData.HORIZ_LINE_TO:
        transformedResult.push({ ...cmd, x: offsetPoint.x });
        break;

      case SVGPathData.VERT_LINE_TO:
        transformedResult.push({ ...cmd, y: offsetPoint.y });
        break;

      case SVGPathData.LINE_TO:
        transformedResult.push({ ...cmd, x: offsetPoint.x, y: offsetPoint.y });
        break;
    }
  }

  // Add the MOVE_TO at the beginning if the path was implicitly closed
  if (isImplicitlyClosed && offsetPoints.length > 0) {
    // Use the offset point for the last point as the new MOVE_TO point
    transformedResult.unshift({
      type: SVGPathData.MOVE_TO,
      relative: false,
      x: offsetPoints[lastIndex].x,
      y: offsetPoints[lastIndex].y,
    });
  }

  return transformedResult;
}
