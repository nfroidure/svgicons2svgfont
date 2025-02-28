# Path Outline Generation

Algorithm for generating outlines around SVG paths with consistent thickness.

## Path Types

- **Explicitly Closed Paths**: End with CLOSE_PATH command
- **Implicitly Closed Paths**: Have identical start/end points, but no
  CLOSE_PATH command
- **Open Paths**: Have different start and end points

## Approach

### Closed Paths

1. Remove CLOSE_PATH command (if present)
2. Apply offset to each point by specified distance
3. Re-add CLOSE_PATH command

### Open Paths

1. Create a reversed copy of the original path
2. Connect original path with reversed path
3. Apply offset with half the distance
4. Close the shape with CLOSE_PATH

## Point Offset Calculation

- **Corner Points**: Use line intersection method for mitered joins
- **Curve Endpoints**: Use tangent-based calculation
- **Special Cases**:
  - Collinear points: Use perpendicular offset
  - Identical points: Create synthetic points to form meaningful angles

## Curve Transformation

For Bézier curves:

- Offset endpoints using tangent information
- Transform control points maintaining tangent directions
- Create approximation of equidistant curve
