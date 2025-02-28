import { test, describe } from "node:test";
import { strictEqual } from "node:assert";

import { SVGPathData } from "svg-pathdata";

import { OUTLINE } from "./outline.ts";

function runOutline(path: string, distance: number): string {
  const pathData = new SVGPathData(path).toAbs();
  pathData.commands = OUTLINE(distance, pathData.commands);
  return pathData.round(1000).encode();
}

/**
 * Helper to normalize the path string by removing extra spaces
 * and normalizing path command formatting
 */
function normalizePath(path: string): string {
  // Use the direct round method with 1000 as the factor (3 decimal places)
  return new SVGPathData(path).toAbs().round(1000).encode();
}

describe("Outline generation", () => {
  describe("Closed paths", () => {
    describe("Rectangles", () => {
      test("Rectangle with distance = 1", () => {
        const input = "M20,10 L150,10 L150,40 L20,40 Z";
        const expected = "M19.5 9.5L150.5 9.5L150.5 40.5L19.5 40.5M20.5 39.5L149.5 39.5L149.5 10.5L20.5 10.5z";
        strictEqual(runOutline(input, 1), expected);
      });

      test("Rectangle with distance = 3", () => {
        const input = "M20,50 L150,50 L150,80 L20,80 Z";
        const expected = "M18.5 48.5L151.5 48.5L151.5 81.5L18.5 81.5M21.5 78.5L148.5 78.5L148.5 51.5L21.5 51.5z";
        strictEqual(runOutline(input, 3), expected);
      });

      test("Rectangle with distance = 10", () => {
        const input = "M20,100 L150,100 L150,130 L20,130 Z";
        const expected = "M15 95L155 95L155 135L15 135M25 125L145 125L145 105L25 105z";
        strictEqual(runOutline(input, 10), expected);
      });

      test("Implicitly closed rectangle", () => {
        const input = "M20,20 L60,20 L60,60 L20,60 L20,20";
        const expected = "M19 19L61 19L61 61L19 61L19 19M21 21L21 59L59 59L59 21L21 21z";
        strictEqual(runOutline(input, 2), normalizePath(expected));
      });
    });

    describe("Triangles", () => {
      test("Triangle with distance = 1", () => {
        const input = "M75 120L120 70L30 70z";
        const expected = "M75 119.253L118.877 70.5L31.123 70.5M28.877 69.5L121.123 69.5L75 120.747z";
        strictEqual(runOutline(input, 1), expected);
      });

      test("Triangle with distance = 2", () => {
        const input = "M75 240L120 190L30 190z";
        const expected = "M75 238.505L117.755 191L32.245 191M27.755 189L122.245 189L75 241.495z";
        strictEqual(runOutline(input, 2), expected);
      });

      test("Triangle with distance = 10", () => {
        const input = "M75 300L120 250L30 250z";
        const expected = "M75 292.526L108.773 255L41.227 255M18.773 245L131.227 245L75 307.474z";
        strictEqual(runOutline(input, 10), expected);
      });
    });

    describe("Circles", () => {
      test("Circle with distance = 1", () => {
        const input =
          "M8 5C8 6.656854249493 6.656854249493 8 5 8C3.343145750507 8 2 6.656854249493 2 5C2 3.343145750507 3.343145750507 2 5 2C6.656854249493 2 8 3.343145750507 8 5z";
        const expected =
          "M8.5 5C8.5 6.933 6.933 8.5 5 8.5C3.067 8.5 1.5 6.933 1.5 5C1.5 3.067 3.067 1.5 5 1.5C6.933 1.5 8.5 3.067 8.5 5M7.5 5C7.5 3.619 6.381 2.5 5 2.5C3.619 2.5 2.5 3.619 2.5 5C2.5 6.381 3.619 7.5 5 7.5C6.381 7.5 7.5 6.381 7.5 5z";
        strictEqual(runOutline(input, 1), normalizePath(expected));
      });

      test("Circle with distance = 3", () => {
        const input =
          "M18 5C18 6.656854249493 16.656854249493 8 15 8C13.343145750507 8 12 6.656854249493 12 5C12 3.343145750507 13.343145750507 2 15 2C16.656854249493 2 18 3.343145750507 18 5z";
        const expected =
          "M19.5 5C19.5 7.485 17.485 9.5 15 9.5C12.515 9.5 10.5 7.485 10.5 5C10.5 2.515 12.515 0.5 15 0.5C17.485 0.5 19.5 2.515 19.5 5M16.5 5C16.5 4.172 15.828 3.5 15 3.5C14.172 3.5 13.5 4.172 13.5 5C13.5 5.828 14.172 6.5 15 6.5C15.828 6.5 16.5 5.828 16.5 5z";
        strictEqual(runOutline(input, 3), normalizePath(expected));
      });

      test("Circle with distance = 5", () => {
        const input =
          "M28 5C28 6.656854249493 26.656854249493 8 25 8C23.343145750507 8 22 6.656854249493 22 5C22 3.343145750507 23.343145750507 2 25 2C26.656854249493 2 28 3.343145750507 28 5z";
        const expected =
          "M30.5 5C30.5 8.038 28.038 10.5 25 10.5C21.962 10.5 19.5 8.038 19.5 5C19.5 1.962 21.962 -0.5 25 -0.5C28.038 -0.5 30.5 1.962 30.5 5M25.5 5C25.5 4.724 25.276 4.5 25 4.5C24.724 4.5 24.5 4.724 24.5 5C24.5 5.276 24.724 5.5 25 5.5C25.276 5.5 25.5 5.276 25.5 5z";
        strictEqual(runOutline(input, 5), normalizePath(expected));
      });
    });

    describe("Ellipses", () => {
      test("Ellipse with distance = 1", () => {
        const input =
          "M7 5C7 6.6568542494927 6.1045694996616 8 5 8C3.8954305003384 8 3 6.6568542494927 3 5C3 3.3431457505073 3.8954305003384 2 5 2C6.1045694996616 2 7 3.3431457505073 7 5z";
        const expected =
          "M7.5 5C7.436 6.975 6.317 8.542 5 8.5C3.683 8.542 2.564 6.975 2.5 5C2.564 3.025 3.683 1.458 5 1.5C6.317 1.458 7.436 3.025 7.5 5M6.5 5C6.564 3.662 5.892 2.542 5 2.5C4.108 2.542 3.436 3.662 3.5 5C3.436 6.338 4.108 7.458 5 7.5C5.892 7.458 6.564 6.338 6.5 5z";
        strictEqual(runOutline(input, 1), normalizePath(expected));
      });

      test("Ellipse with distance = 3", () => {
        const input =
          "M17 5C17 6.6568542494927 16.104569499662 8 15 8C13.895430500338 8 13 6.6568542494927 13 5C13 3.3431457505073 13.895430500338 2 15 2C16.104569499662 2 17 3.3431457505073 17 5z";
        const expected =
          "M18.5 5C18.309 7.613 16.742 9.627 15 9.5C13.258 9.627 11.691 7.613 11.5 5C11.691 2.387 13.258 0.373 15 0.5C16.742 0.373 18.309 2.387 18.5 5M15.5 5C15.691 4.299 15.467 3.627 15 3.5C14.533 3.627 14.309 4.299 14.5 5C14.309 5.701 14.533 6.373 15 6.5C15.467 6.373 15.691 5.701 15.5 5z";
        strictEqual(runOutline(input, 3), normalizePath(expected));
      });

      test("Ellipse with distance = 5", () => {
        const input =
          "M27 5C27 6.6568542494927 26.104569499662 8 25 8C23.895430500338 8 23 6.6568542494927 23 5C23 3.3431457505073 23.895430500338 2 25 2C26.104569499662 2 27 3.3431457505073 27 5z";
        const expected =
          "M29.5 5C29.181 8.25 27.167 10.712 25 10.5C22.833 10.712 20.819 8.25 20.5 5C20.819 1.75 22.833 -0.712 25 -0.5C27.167 -0.712 29.181 1.75 29.5 5M24.5 5C24.819 4.936 25.042 4.712 25 4.5C24.958 4.712 25.181 4.936 25.5 5C25.181 5.064 24.958 5.288 25 5.5C25.042 5.288 24.819 5.064 24.5 5z";
        strictEqual(runOutline(input, 5), normalizePath(expected));
      });
    });

    describe("Curved paths", () => {
      test("Bezier curve path with distance = 1", () => {
        const input = "M10,10 C30,30 60,30 80,10 Z";
        const expected =
          "M11.207 10.5C30.517 29.81 59.483 29.81 78.793 10.5M81.207 9.5C60.517 30.19 29.483 30.19 8.793 9.5z";
        strictEqual(runOutline(input, 1), normalizePath(expected));
      });
    });
  });

  describe("Open paths", () => {
    describe("Simple lines", () => {
      test("Diagonal line with distance = 1", () => {
        const input = "M2 2L7 8";
        const expected = "M2.384 1.68L7.384 7.68L6.616 8.32L1.616 2.32L2.384 1.68z";
        strictEqual(runOutline(input, 1), normalizePath(expected));
      });

      test("Angled line with distance = 3", () => {
        const input = "M15 2L13 8";
        const expected = "M16.423 2.474L14.423 8.474L11.577 7.526L13.577 1.526L16.423 2.474z";
        strictEqual(runOutline(input, 3), normalizePath(expected));
      });

      test("Diagonal line with distance = 2", () => {
        const input = "M22 2L26 8";
        const expected = "M22.832 1.445L26.832 7.445L25.168 8.555L21.168 2.555L22.832 1.445z";
        strictEqual(runOutline(input, 2), normalizePath(expected));
      });
    });

    describe("Multi-segment paths", () => {
      test("Open polyline with distance = 1", () => {
        const input = "M50,50 L100,50 L100,100";
        const expected = "M50 49.5L100.5 49.5L100.5 100L99.5 100L99.5 50.5L50 50.5L50 49.5z";
        strictEqual(runOutline(input, 1), expected);
      });

      test("Polyline with distance = 3", () => {
        const input = "M10 30L10 90L140 90L140 30";
        const expected = "M11.5 30L11.5 88.5L138.5 88.5L138.5 30L141.5 30L141.5 91.5L8.5 91.5L8.5 30L11.5 30z";
        strictEqual(runOutline(input, 3), expected);
      });
    });

    describe("Complex open paths", () => {
      test("Zigzag polyline with distance = 7", () => {
        const input = "M10 280L40 250L70 280L100 250L130 280";
        const expected =
          "M7.525 277.525L40 245.05L70 275.05L100 245.05L132.475 277.525L127.525 282.475L100 254.95L70 284.95L40 254.95L12.475 282.475L7.525 277.525z";
        strictEqual(runOutline(input, 7), normalizePath(expected));
      });

      test("Zigzag polyline with distance = 3", () => {
        const input = "M10 320L40 290L70 320L100 290L130 320";
        const expected =
          "M8.939 318.939L40 287.879L70 317.879L100 287.879L131.061 318.939L128.939 321.061L100 292.121L70 322.121L40 292.121L11.061 321.061L8.939 318.939z";
        strictEqual(runOutline(input, 3), normalizePath(expected));
      });
    });
  });

  describe("Additional shapes", () => {
    describe("Pentagon", () => {
      test("Regular pentagon with distance = 2", () => {
        const input = "M200 250L250 280L230 320L170 320L150 280z";
        const expected =
          "M200 248.834L251.309 279.619L230.618 321L169.382 321L148.691 279.619M151.309 280.381L170.618 319L229.382 319L248.691 280.381L200 251.166z";
        strictEqual(runOutline(input, 2), normalizePath(expected));
      });
    });

    describe("Mixed circles and ellipses", () => {
      test("Horizontal ellipse with distance = 3", () => {
        const input =
          "M80 360C80 371.04569499662 66.56854249493 380 50 380C33.43145750507 380 20 371.04569499662 20 360C20 348.95430500338 33.43145750507 340 50 340C66.56854249493 340 80 348.95430500338 80 360z";
        const expected =
          "M81.5 360C81.627 371.683 67.524 381.309 50 381.5C32.476 381.309 18.373 371.683 18.5 360C18.373 348.317 32.476 338.691 50 338.5C67.524 338.691 81.627 348.317 81.5 360M78.5 360C78.373 349.592 65.613 341.309 50 341.5C34.387 341.309 21.627 349.592 21.5 360C21.627 370.408 34.387 378.691 50 378.5C65.613 378.691 78.373 370.408 78.5 360z";
        strictEqual(runOutline(input, 3), normalizePath(expected));
      });

      test("Perfect circle with stroke = 1", () => {
        const input =
          "M240 360C240 371.04569499662 226.56854249493 380 210 380C193.43145750507 380 180 371.04569499662 180 360C180 348.95430500338 193.43145750507 340 210 340C226.56854249493 340 240 348.95430500338 240 360z";
        const expected =
          "M240.5 360C240.542 371.258 226.887 380.436 210 380.5C193.113 380.436 179.458 371.258 179.5 360C179.458 348.742 193.113 339.564 210 339.5C226.887 339.564 240.542 348.742 240.5 360M239.5 360C239.458 349.167 226.25 340.436 210 340.5C193.75 340.436 180.542 349.167 180.5 360C180.542 370.833 193.75 379.564 210 379.5C226.25 379.564 239.458 370.833 239.5 360z";
        strictEqual(runOutline(input, 1), normalizePath(expected));
      });
    });

    describe("Special cases", () => {
      test("Reversed stroke scaled triangular path", () => {
        const input = "M200 80H240L220 120z";
        const expected = "M198.382 79H241.618L220 122.236M220 117.764L238.382 80H201.618z";
        strictEqual(runOutline(input, 2), normalizePath(expected));
      });

      test("Straight line with stroke = 2", () => {
        const input = "M200 100L280 140";
        const expected = "M200.447 99.106L280.447 139.106L279.553 140.894L199.553 100.894L200.447 99.106z";
        strictEqual(runOutline(input, 2), normalizePath(expected));
      });
    });
  });

  describe("Complex curve patterns", () => {
    test("Simple curved outline", () => {
      const input = "M10 10C20 20 40 20 50 10";
      const expected =
        "M10.354 9.646C20.177 19.47 39.823 19.47 49.646 9.646L50.354 10.354C40.177 20.53 19.823 20.53 9.646 10.354L10.354 9.646z";
      strictEqual(runOutline(input, 1), normalizePath(expected));
    });

    test("Straight line with curved ends", () => {
      const input = "M70 10C70 20 110 20 110 10";
      const expected = "M70.5 10C70.5 19.75 109.5 19.75 109.5 10L110.5 10C110.5 20.25 69.5 20.25 69.5 10L70.5 10z";
      strictEqual(runOutline(input, 1), normalizePath(expected));
    });

    test("Irregular curve with varying control points", () => {
      const input = "M130 10C120 20 180 20 170 10";
      const expected =
        "M130.354 10.354C120.53 20.177 179.47 20.177 169.646 10.354L170.354 9.646C180.53 19.823 119.47 19.823 129.646 9.646L130.354 10.354z";
      strictEqual(runOutline(input, 1), normalizePath(expected));
    });

    test("Deep curve with larger distance", () => {
      const input = "M130 110C120 140 180 140 170 110";
      const expected =
        "M132.372 110.791C123.558 137.233 176.442 137.233 167.628 110.791L172.372 109.209C183.558 142.767 116.442 142.767 127.628 109.209L132.372 110.791z";
      strictEqual(runOutline(input, 5), normalizePath(expected));
    });
  });

  describe("Special path cases", () => {
    test.skip("Partial circular arc (needs investigation)", () => {
      // This test currently doesn't work correctly and needs further investigation
      const input = "M80 80C80 104.853 100.147 125 125 125L125 80z";
      const expected = "M85 85C85 104.33 100.67 120 120 120L120 85M130 75L130 130C99.624 130 75 105.376 75 75z";

      // TODO: Fix issue with partial arc outlines
      strictEqual(runOutline(input, 10), expected);
    });

    test("Triangle path outline with explicit horizontal command", () => {
      const input = "M200 80H240L220 120z";
      const expected = "M195.955 77.5H244.045L220 125.59M220 114.41L235.955 80H204.045z";
      strictEqual(runOutline(input, 5), expected);
    });
  });
});
