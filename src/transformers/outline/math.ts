import type { Point } from "../utils/geometry.ts";
import {
  arePointsSame,
  magnitude,
  rotateVector,
  perpendicularVector,
  normalizeVector,
  dotProduct,
  createVector,
  calculateRotation,
  isNumberValid,
  crossProduct,
  scaleVector,
} from "../utils/geometry.ts";

/**
 * Calculates the offset vector for standard corner points (non-curve endpoints)
 * @param p1 Previous point
 * @param p2 Current point (corner)
 * @param p3 Next point
 * @param distance Offset distance
 * @returns The offset vector from the corner point
 */
export function calculateStandardCornerOffset(p1: Point, p2: Point, p3: Point, distance: number): Point {
  // Handle identical points cases - if the point we're offsetting is identical to both neighbors
  if (arePointsSame(p1, p2) && arePointsSame(p2, p3)) {
    return { x: 0, y: 0 };
  }

  // Handle case where current point is identical to previous point
  if (arePointsSame(p1, p2)) {
    // For duplicate points, try to find another point in the path for better offset
    // If P1=P2, then we need to create a synthetic previous point by reflecting P3
    // This creates a virtual corner that will give a better offset direction
    const syntheticP1 = { x: 2 * p2.x - p3.x, y: 2 * p2.y - p3.y };

    // Now use this synthetic point with regular line intersection logic
    return calculateCornerOffsetInternal(syntheticP1, p2, p3, distance);
  }

  // Handle case where current point is identical to next point
  if (arePointsSame(p2, p3)) {
    // For duplicate points, try to find another point in the path for better offset
    // If P2=P3, then we need to create a synthetic next point by reflecting P1
    // This creates a virtual corner that will give a better offset direction
    const syntheticP3 = { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y };

    // Now use this synthetic point with regular line intersection logic
    return calculateCornerOffsetInternal(p1, p2, syntheticP3, distance);
  }

  // Standard case - no identical points
  return calculateCornerOffsetInternal(p1, p2, p3, distance);
}

/**
 * Calculates offset vector specifically for curve endpoints using tangent information
 * @param point The curve endpoint
 * @param cp2 Incoming control point (can be null)
 * @param cp1 Outgoing control point (can be null)
 * @param distance Offset distance
 * @returns The offset vector from the curve endpoint
 */
export function calculateCurveEndpointOffset(
  point: Point,
  cp2: Point | null,
  cp1: Point | null,
  distance: number,
): Point {
  // For a curve endpoint, use the curve's tangent direction instead of segment direction
  let incomingDirection: Point | null = null;
  let outgoingDirection: Point | null = null;

  // Get the incoming direction (based on control point)
  if (cp2 && !arePointsSame(cp2, point)) {
    incomingDirection = normalizeVector(createVector(cp2, point));
  }

  // Get the outgoing direction (based on control point)
  if (cp1 && !arePointsSame(cp1, point)) {
    outgoingDirection = normalizeVector(createVector(point, cp1));
  }

  // If we have both directions, calculate offset using the intersections of perpendiculars
  if (incomingDirection && outgoingDirection) {
    const incomingPerp = perpendicularVector(incomingDirection, true);
    const outgoingPerp = perpendicularVector(outgoingDirection, true);
    return calculateCornerOffsetWithDirections(point, incomingPerp, outgoingPerp, distance);
  }

  // If we only have an incoming direction, use its perpendicular vector for the offset
  if (incomingDirection) {
    const perpVector = perpendicularVector(incomingDirection, true);
    return scaleVector(perpVector, distance);
  }

  // If we only have an outgoing direction, use its perpendicular vector for the offset
  if (outgoingDirection) {
    const perpVector = perpendicularVector(outgoingDirection, true);
    return scaleVector(perpVector, distance);
  }

  // Fallback if we don't have any tangent information
  return { x: 0, y: 0 };
}

/**
 * Internal function for corner offset calculation once we've handled special cases
 */
function calculateCornerOffsetInternal(p1: Point, p2: Point, p3: Point, distance: number): Point {
  // Calculate direction normalized direction vectors between points
  const vpNorm = normalizeVector(createVector(p1, p2)); // Previous segment
  const vnNorm = normalizeVector(createVector(p2, p3)); // Next segment

  // Calculate perpendicular normal vectors (pointing outward)
  const npNorm = perpendicularVector(vpNorm, true);
  const nnNorm = perpendicularVector(vnNorm, true);

  // Special case: collinear segments with same direction (straight line)
  const dotDirections = dotProduct(vpNorm, vnNorm);
  if (Math.abs(dotDirections - 1) < 0.0001) {
    return scaleVector(npNorm, distance);
  }

  // Special case: collinear segments with opposite direction (U-turn)
  if (Math.abs(dotDirections + 1) < 0.0001) {
    // Use perpendicular to one of the segments
    return scaleVector(npNorm, distance);
  }

  // Calculate offset points
  const offsetPoint1 = {
    x: p2.x + distance * npNorm.x,
    y: p2.y + distance * npNorm.y,
  };

  const offsetPoint2 = {
    x: p2.x + distance * nnNorm.x,
    y: p2.y + distance * nnNorm.y,
  };

  // Define lines using OFFSET points and ORIGINAL segment directions
  // Line 1: Through offsetPoint1 in vpNorm direction
  // Line 2: Through offsetPoint2 in vnNorm direction

  // Line equations in parametric form:
  // P1(t) = offsetPoint1 + t * vpNorm
  // P2(s) = offsetPoint2 + s * vnNorm

  // At intersection: P1(t) = P2(s)
  // offsetPoint1 + t * vpNorm = offsetPoint2 + s * vnNorm

  // This gives us:
  // offsetPoint1.x + t * vpNorm.x = offsetPoint2.x + s * vnNorm.x
  // offsetPoint1.y + t * vpNorm.y = offsetPoint2.y + s * vnNorm.y

  // Cross-multiply to eliminate s:
  const det = crossProduct(vpNorm, vnNorm);

  // Check for parallel lines
  if (Math.abs(det) < 0.0001) {
    return {
      x: (offsetPoint1.x + offsetPoint2.x) / 2 - p2.x,
      y: (offsetPoint1.y + offsetPoint2.y) / 2 - p2.y,
    };
  }

  // Solve for t
  const dx = offsetPoint2.x - offsetPoint1.x;
  const dy = offsetPoint2.y - offsetPoint1.y;

  const t = (dx * vnNorm.y - dy * vnNorm.x) / det;

  // Calculate intersection point
  const intersection = {
    x: offsetPoint1.x + t * vpNorm.x,
    y: offsetPoint1.y + t * vpNorm.y,
  };

  // Calculate offset vector from original point to intersection
  const offsetVector = createVector(p2, intersection);

  // Safety check for invalid results
  if (!isNumberValid(offsetVector.x) || !isNumberValid(offsetVector.y)) {
    return {
      x: (offsetPoint1.x + offsetPoint2.x) / 2 - p2.x,
      y: (offsetPoint1.y + offsetPoint2.y) / 2 - p2.y,
    };
  }

  return offsetVector;
}

/**
 * Calculate corner offset using specific direction vectors instead of points
 * @param p Point to offset
 * @param incomingPerp Perpendicular vector to incoming direction
 * @param outgoingPerp Perpendicular vector to outgoing direction
 * @param distance Offset distance
 * @returns The offset vector
 */
function calculateCornerOffsetWithDirections(
  p: Point,
  incomingPerp: Point,
  outgoingPerp: Point,
  distance: number,
): Point {
  // Calculate offset points along the perpendicular vectors
  const scaledIncoming = scaleVector(incomingPerp, distance);
  const scaledOutgoing = scaleVector(outgoingPerp, distance);

  const offsetPoint1 = {
    x: p.x + scaledIncoming.x,
    y: p.y + scaledIncoming.y,
  };

  const offsetPoint2 = {
    x: p.x + scaledOutgoing.x,
    y: p.y + scaledOutgoing.y,
  };

  // Create artificial direction vectors for the line intersection calculation
  // (perpendicular to the perpendicular = original direction)
  const dir1 = perpendicularVector(incomingPerp, true);
  const dir2 = perpendicularVector(outgoingPerp, true);

  // Check for parallel directions
  const det = crossProduct(dir1, dir2);
  if (Math.abs(det) < 0.0001) {
    return {
      x: (offsetPoint1.x + offsetPoint2.x) / 2 - p.x,
      y: (offsetPoint1.y + offsetPoint2.y) / 2 - p.y,
    };
  }

  // Calculate intersection of offset lines
  const dx = offsetPoint2.x - offsetPoint1.x;
  const dy = offsetPoint2.y - offsetPoint1.y;
  const t = (dx * dir2.y - dy * dir2.x) / det;

  // Calculate intersection point and resulting offset vector
  const intersection = {
    x: offsetPoint1.x + t * dir1.x,
    y: offsetPoint1.y + t * dir1.y,
  };

  const offsetVector = createVector(p, intersection);

  return offsetVector;
}

/**
 * Transforms Bézier curve control points to maintain curve appearance when endpoints are moved
 * Uses vector-based transformation to preserve geometric relationships
 *
 * @param originalStartPoint Original curve start point
 * @param originalControlPoint1 Original first control point
 * @param originalControlPoint2 Original second control point
 * @param originalEndPoint Original curve end point
 * @param newStartPoint New curve start point
 * @param newEndPoint New curve end point
 * @returns The transformed control points
 */
export function transformControlPoints(
  originalStartPoint: Point,
  originalControlPoint1: Point,
  originalControlPoint2: Point,
  originalEndPoint: Point,
  newStartPoint: Point,
  newEndPoint: Point,
): { controlPoint1: Point; controlPoint2: Point } {
  // Vectors from endpoints to control points and baseline vectors
  const origVec1 = createVector(originalStartPoint, originalControlPoint1);
  const origVec2 = createVector(originalEndPoint, originalControlPoint2);
  const origBaseline = createVector(originalStartPoint, originalEndPoint);
  const newBaseline = createVector(newStartPoint, newEndPoint);

  // Calculate rotation angle between original and new baseline
  const rotation = calculateRotation(origBaseline, newBaseline);

  // Calculate scale change
  const origLength = magnitude(origBaseline);
  const scale = origLength === 0 ? 1 : magnitude(newBaseline) / origLength;

  // Transform control points using rotation and scaling
  const rotatedVec1 = rotateVector(origVec1, rotation);
  const rotatedVec2 = rotateVector(origVec2, rotation);

  const scaledRotatedVec1 = scaleVector(rotatedVec1, scale);
  const scaledRotatedVec2 = scaleVector(rotatedVec2, scale);

  return {
    controlPoint1: {
      x: newStartPoint.x + scaledRotatedVec1.x,
      y: newStartPoint.y + scaledRotatedVec1.y,
    },
    controlPoint2: {
      x: newEndPoint.x + scaledRotatedVec2.x,
      y: newEndPoint.y + scaledRotatedVec2.y,
    },
  };
}
