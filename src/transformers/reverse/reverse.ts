import { SVGPathData, type SVGCommand, SVGPathDataTransformer } from "svg-pathdata";

/**
 * Reverses the order of path commands to go from end to start
 * IMPORTANT: This function expects absolute commands as input.
 * It doesn't convert relative to absolute - use SVGPathDataTransformer.TO_ABS() first if needed.
 * @param commands SVG path commands in absolute form to reverse
 * @returns New SVG commands in reverse order with absolute coordinates
 */
export function REVERSE_PATH(commands: SVGCommand[]): SVGCommand[] {
  if (commands.length < 2) return commands;

  // Extract absolute points using the transformer to track current position
  const points = commands.map(
    SVGPathDataTransformer.INFO((command, px, py) => ({
      ...command,
      x: command.x ?? px,
      y: command.y ?? py,
    })),
  );

  // Check if path is explicitly closed (ends with CLOSE_PATH)
  const isExplicitlyClosed = commands.at(-1)?.type === SVGPathData.CLOSE_PATH;

  // Start with a move to the last explicit point
  // (if path ends with Z, use the point before Z)
  const startPointIndex = isExplicitlyClosed ? points.length - 2 : points.length - 1;
  const reversed: SVGCommand[] = [
    {
      type: SVGPathData.MOVE_TO,
      relative: false,
      x: points[startPointIndex].x,
      y: points[startPointIndex].y,
    },
  ];

  // Process each segment in reverse order
  for (let i = startPointIndex; i > 0; i--) {
    const curCmd = points[i];
    const prevPoint = points[i - 1];

    // Handle the current command type
    switch (curCmd.type) {
      case SVGPathData.HORIZ_LINE_TO:
        // Add a line to the previous point
        reversed.push({ type: SVGPathData.HORIZ_LINE_TO, relative: false, x: prevPoint.x });
        break;
      case SVGPathData.VERT_LINE_TO:
        // Add a line to the previous point
        reversed.push({ type: SVGPathData.VERT_LINE_TO, relative: false, y: prevPoint.y });
        break;

      case SVGPathData.LINE_TO:
      case SVGPathData.MOVE_TO:
        // Add a line to the previous point
        reversed.push({ type: SVGPathData.LINE_TO, relative: false, x: prevPoint.x, y: prevPoint.y });
        break;

      case SVGPathData.CURVE_TO:
        // Reverse curve control points
        reversed.push({
          type: SVGPathData.CURVE_TO,
          relative: false,
          x: prevPoint.x,
          y: prevPoint.y,
          x1: curCmd.x2,
          y1: curCmd.y2,
          x2: curCmd.x1,
          y2: curCmd.y1,
        });
        break;

      // For completeness, handle quadratic curves too
      case SVGPathData.QUAD_TO:
        // Convert to cubic with equivalent control points
        reversed.push({
          type: SVGPathData.CURVE_TO,
          relative: false,
          x: prevPoint.x,
          y: prevPoint.y,
          // For quadratic to cubic conversion:
          x1: curCmd.x1,
          y1: curCmd.y1,
          x2: curCmd.x1,
          y2: curCmd.y1,
        });
        break;

      // Skip close path - we'll add it at the end if needed
      case SVGPathData.CLOSE_PATH:
        break;

      default:
        console.debug("Skipping unsupported command type:", curCmd.type);
    }
  }

  // If the original path was explicitly closed, preserve the Z command
  if (isExplicitlyClosed) {
    reversed.push({ type: SVGPathData.CLOSE_PATH });
  }

  return reversed;
}
