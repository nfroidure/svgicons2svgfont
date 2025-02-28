import type { SVGCommand } from "svg-pathdata";

export interface Point {
  x: number;
  y: number;
}

/**
 * Type combining an SVG command with point coordinates
 * This makes it easier to track both command data and point position together
 */
export type CommandWithPoint = SVGCommand & Point;

export function isNumberValid(n: number): boolean {
  return !Number.isNaN(n) && Number.isFinite(n);
}

/**
 * Creates a vector from two points
 * @param p1 Start point
 * @param p2 End point
 * @returns Vector from p1 to p2
 */
export function createVector(p1: Point, p2: Point): Point {
  return { x: p2.x - p1.x, y: p2.y - p1.y };
}

/**
 * Calculates the magnitude (length) of a vector
 * @param v Vector as a Point object
 * @returns The magnitude of the vector
 */
export function magnitude(v: Point): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

/**
 * Normalizes a vector to unit length
 * @param v Vector as a Point object
 * @returns A unit vector in the same direction
 */
export function normalizeVector(v: Point): Point {
  const mag = magnitude(v);
  if (mag < 0.000001) return { x: 0, y: 0 };
  return { x: v.x / mag, y: v.y / mag };
}

/**
 * Calculates the dot product of two vectors
 * @param v1 First vector
 * @param v2 Second vector
 * @returns The dot product
 */
export function dotProduct(v1: Point, v2: Point): number {
  return v1.x * v2.x + v1.y * v2.y;
}

/**
 * Calculates the cross product of two vectors
 * @param v1 First vector
 * @param v2 Second vector
 * @returns The cross product (z-component)
 */
export function crossProduct(v1: Point, v2: Point): number {
  return v1.x * v2.y - v1.y * v2.x;
}

/**
 * Scales a vector by a scalar value
 * @param v Vector to scale
 * @param scale Scaling factor
 * @returns The scaled vector
 */
export function scaleVector(v: Point, scale: number): Point {
  return { x: v.x * scale, y: v.y * scale };
}

/**
 * Rotates a vector around the origin by the specified angle
 * @param v Vector to rotate
 * @param angleRadians Angle in radians
 * @returns The rotated vector
 */
export function rotateVector(v: Point, angleRadians: number): Point {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

/**
 * Creates a perpendicular vector by rotating 90 degrees around the origin
 * @param v Vector to rotate
 * @param clockwise Whether to rotate clockwise (true) or counterclockwise (false)
 * @returns Perpendicular vector
 */
export function perpendicularVector(v: Point, clockwise = false): Point {
  return clockwise ? { x: v.y, y: -v.x } : { x: -v.y, y: v.x };
}

/**
 * Calculates the rotation angle between two vectors
 * @param v1 First vector
 * @param v2 Second vector
 * @returns The angle difference in radians
 */
export function calculateRotation(v1: Point, v2: Point): number {
  const angle1 = Math.atan2(v1.y, v1.x);
  const angle2 = Math.atan2(v2.y, v2.x);
  return angle2 - angle1;
}

/**
 * Checks if two points are the same within a tolerance
 * @param p1 First point
 * @param p2 Second point
 * @param tolerance Distance tolerance (default: 0.0001)
 * @returns Whether points are considered the same
 */
export function arePointsSame(p1?: Point | null, p2?: Point | null, tolerance = 0.0001): boolean {
  if (!p1 || !p2) return false;
  if (!tolerance) return p1.x === p2.x && p1.y === p2.y;
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}
