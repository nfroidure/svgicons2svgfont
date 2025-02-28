# Path Simplification

Algorithms for simplifying SVG paths by removing redundant points while preserving visual appearance.

## Overview

Our implementation provides two main transformers:

### 1. REMOVE_DUPLICATES

Removes consecutive points that are at the same location.

- Uses `minLength` threshold to determine when points are considered identical
- Preserves first MOVE_TO and all CLOSE_PATH commands
- Only processes line commands (LINE_TO, HORIZ_LINE_TO, VERT_LINE_TO)

### 2. REMOVE_COLLINEAR

Removes points that lie on a straight line between their neighbors.

- Uses cross product for precise collinearity detection
- Uses dot product to ensure segments form a continuous line
- Preserves corners, curves, and path structure
- Works on horizontal, vertical, and diagonal lines

## Special Handling

- Curves: Preserved as-is
- Corners: Maintained to preserve path shape
- Subpaths: Processed independently
- Closed paths: Structure preserved
