import { Transform } from 'stream';
import Sax, { type Tag } from 'sax';
import {
  SVGPathData,
  SVGPathDataTransformer,
  SVGShapes,
  type SVGCommand,
} from 'svg-pathdata';
import {
  type Matrix,
  scale,
  translate,
  compose,
  fromDefinition,
  fromTransformAttribute,
} from 'transformation-matrix';

import { YError } from 'yerror';
import debug from 'debug';
import { SVGIconStream } from './iconsdir.js';

const warn = debug('svgicons2svgfont');

export { fileSorter } from './filesorter.js';
export * from './iconsdir.js';
export * from './metadata.js';

function matrixFromTransformAttribute(
  transformAttributeString: string,
): Matrix {
  return compose(
    fromDefinition(fromTransformAttribute(transformAttributeString)),
  );
}

// Rendering
function tagShouldRender(curTag: Tag, parents: Tag[]) {
  let values;

  return !parents.some((tag) => {
    if (
      'undefined' !== typeof tag.attributes.display &&
      'none' === tag.attributes.display.toLowerCase()
    ) {
      return true;
    }
    if (
      'undefined' !== typeof tag.attributes.width &&
      0 === parseFloat(tag.attributes.width)
    ) {
      return true;
    }
    if (
      'undefined' !== typeof tag.attributes.height &&
      0 === parseFloat(tag.attributes.height)
    ) {
      return true;
    }
    if ('undefined' !== typeof tag.attributes.viewBox) {
      values = tag.attributes.viewBox.split(/\s*,*\s|\s,*\s*|,/);
      if (0 === parseFloat(values[2]) || 0 === parseFloat(values[3])) {
        return true;
      }
    }
    return false;
  });
}

// According to the document (http://www.w3.org/TR/SVG/painting.html#FillProperties)
// fill <paint> none|currentColor|inherit|<color>
//     [<icccolor>]|<funciri> (not support yet)
function getTagColor(currTag: Tag, parents: Tag[]) {
  const defaultColor = 'black';
  const fillVal = currTag.attributes.fill;
  const parentsLength = parents.length;

  if ('none' === fillVal) {
    return 'none';
  }
  if ('currentColor' === fillVal) {
    return defaultColor;
  }
  if ('inherit' === fillVal) {
    if (0 === parentsLength) {
      return defaultColor;
    }
    return getTagColor(
      parents[parentsLength - 1],
      parents.slice(0, parentsLength - 1),
    );
    // this might be null.
    // For example: <svg ><path fill="inherit" /> </svg>
    // in this case getTagColor should return null
    // recursive call, the bottom element should be svg,
    // and svg didn't fill color, so just return null
  }

  return fillVal;
}

// https://www.w3.org/TR/css-style-attr/
const STYLE_COMMENT = /\/\*.*?\*\//gs;
const STYLE_DECLARATION = /^\s*([a-z-]+)\s*:\s*(.*?)\s*(!\s*important\s*)?$/is;

// The last valid declaration wins, an important one over any other
// https://www.w3.org/TR/css-cascade/#cascade-sort
function getStyleDeclaration<T>(
  style: string,
  property: string,
  parseValue: (value: string) => T | undefined,
): T | undefined {
  let declared: T | undefined;
  let important = false;

  for (const declaration of style.replace(STYLE_COMMENT, '').split(';')) {
    const [, name = '', value = '', priority] =
      STYLE_DECLARATION.exec(declaration) ?? [];
    const parsed =
      property === name.toLowerCase() ? parseValue(value) : undefined;

    if (undefined !== parsed && (priority || !important)) {
      declared = parsed;
      important = Boolean(priority);
    }
  }
  return declared;
}

// https://www.w3.org/TR/css-cascade-5/#defaulting-keywords
type CSSWideKeyword =
  | 'initial'
  | 'inherit'
  | 'unset'
  | 'revert'
  | 'revert-layer';

const CSS_WIDE_KEYWORDS: readonly CSSWideKeyword[] = [
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
];

function parseCSSWideKeyword(value: string): CSSWideKeyword | undefined {
  const keyword = value.trim().toLowerCase();

  return CSS_WIDE_KEYWORDS.find((candidate) => candidate === keyword);
}

// A style declaration wins over the presentation attribute, except that
// revert-layer rolls back to it
// https://www.w3.org/TR/SVG2/styling.html#PresentationAttributes
// https://www.w3.org/TR/css-cascade-5/#revert-layer
function getTagDeclaration<T>(
  tag: Tag,
  property: string,
  parseValue: (value: string) => T | undefined,
): T | CSSWideKeyword | undefined {
  const { style, [property]: attribute } = tag.attributes;
  const parse = (value: string) =>
    parseCSSWideKeyword(value) ?? parseValue(value);
  const declared =
    'string' === typeof style
      ? getStyleDeclaration(style, property, parse)
      : undefined;

  if (undefined !== declared && 'revert-layer' !== declared) {
    return declared;
  }
  return 'string' === typeof attribute ? parse(attribute) : undefined;
}

// fill-rule is inherited, so every CSS-wide keyword but initial takes the
// parent's rule
// https://www.w3.org/TR/SVG2/painting.html#FillRuleProperty
type FillRule = 'nonzero' | 'evenodd';

function parseFillRule(value: string): FillRule | undefined {
  const rule = value.trim().toLowerCase();

  return 'nonzero' === rule || 'evenodd' === rule ? rule : undefined;
}

function getTagFillRule(parents: readonly Tag[]): FillRule {
  for (let index = parents.length - 1; 0 <= index; index--) {
    const rule = getTagDeclaration(parents[index], 'fill-rule', parseFillRule);

    if ('initial' === rule) {
      return 'nonzero';
    }
    if ('nonzero' === rule || 'evenodd' === rule) {
      return rule;
    }
  }
  return 'nonzero';
}

const CURVE_STEPS = 8;
const CONTAINMENT_PROBES = 16;

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

type PointLocation = 'inside' | 'outside' | 'outline';

function splitContours(commands: readonly SVGCommand[]): SVGCommand[][] {
  const contours: SVGCommand[][] = [];
  let contour: SVGCommand[] = [];
  let start: Point = { x: 0, y: 0 };
  let closed = false;

  for (const command of commands) {
    if (SVGPathData.MOVE_TO === command.type) {
      if (contour.length) {
        contours.push(contour);
      }
      contour = [command];
      start = { x: command.x, y: command.y };
      closed = false;
      continue;
    }
    if (closed) {
      contours.push(contour);
      contour = [
        { type: SVGPathData.MOVE_TO, relative: false, x: start.x, y: start.y },
      ];
    }
    contour.push(command);
    closed = SVGPathData.CLOSE_PATH === command.type;
  }
  if (contour.length) {
    contours.push(contour);
  }
  return contours;
}

function flattenContour(contour: readonly SVGCommand[]): Point[] {
  const points: Point[] = [];
  let x = 0;
  let y = 0;

  for (const command of contour) {
    if (
      SVGPathData.MOVE_TO === command.type ||
      SVGPathData.LINE_TO === command.type
    ) {
      x = command.x;
      y = command.y;
      points.push({ x, y });
    } else if (SVGPathData.HORIZ_LINE_TO === command.type) {
      x = command.x;
      points.push({ x, y });
    } else if (SVGPathData.VERT_LINE_TO === command.type) {
      y = command.y;
      points.push({ x, y });
    } else if (SVGPathData.CURVE_TO === command.type) {
      for (let step = 1; step <= CURVE_STEPS; step++) {
        const t = step / CURVE_STEPS;
        const u = 1 - t;

        points.push({
          x:
            u * u * u * x +
            3 * u * u * t * command.x1 +
            3 * u * t * t * command.x2 +
            t * t * t * command.x,
          y:
            u * u * u * y +
            3 * u * u * t * command.y1 +
            3 * u * t * t * command.y2 +
            t * t * t * command.y,
        });
      }
      x = command.x;
      y = command.y;
    }
  }
  return points;
}

function signedArea(points: readonly Point[]): number {
  let area = 0;

  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    const next = points[(index + 1) % points.length];

    area += point.x * next.y - next.x * point.y;
  }
  return area / 2;
}

function getBounds(points: readonly Point[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const { x, y } of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function boundsOverlap(first: Bounds, second: Bounds): boolean {
  return (
    first.minX <= second.maxX &&
    second.minX <= first.maxX &&
    first.minY <= second.maxY &&
    second.minY <= first.maxY
  );
}

function locatePoint(outline: readonly Point[], probe: Point): PointLocation {
  let inside = false;

  for (
    let index = 0, previous = outline.length - 1;
    index < outline.length;
    previous = index++
  ) {
    const current = outline[index];
    const prior = outline[previous];

    if (
      (current.x - prior.x) * (probe.y - prior.y) ===
        (current.y - prior.y) * (probe.x - prior.x) &&
      Math.min(prior.x, current.x) <= probe.x &&
      probe.x <= Math.max(prior.x, current.x) &&
      Math.min(prior.y, current.y) <= probe.y &&
      probe.y <= Math.max(prior.y, current.y)
    ) {
      return 'outline';
    }
    if (
      current.y > probe.y !== prior.y > probe.y &&
      probe.x <
        ((prior.x - current.x) * (probe.y - current.y)) /
          (prior.y - current.y) +
          current.x
    ) {
      inside = !inside;
    }
  }
  return inside ? 'inside' : 'outside';
}

// Contours of equal area nest in drawing order, so a contour repeated point for point cancels out
function canEnclose(
  areas: readonly number[],
  candidate: number,
  index: number,
): boolean {
  const candidateArea = Math.abs(areas[candidate]);
  const ownArea = Math.abs(areas[index]);

  return (
    candidateArea > ownArea || (candidateArea === ownArea && candidate < index)
  );
}

function findEnclosingContour(
  outlines: readonly (readonly Point[])[],
  bounds: readonly Bounds[],
  areas: readonly number[],
  index: number,
): number {
  const outline = outlines[index];
  const stride = Math.max(1, Math.floor(outline.length / CONTAINMENT_PROBES));
  const probes = outline.filter(
    (_point, pointIndex) => 0 === pointIndex % stride,
  );
  const probeBounds = getBounds(probes);
  let enclosing = -1;

  for (let candidate = 0; candidate < outlines.length; candidate++) {
    if (
      !canEnclose(areas, candidate, index) ||
      (-1 !== enclosing && canEnclose(areas, candidate, enclosing)) ||
      !boundsOverlap(bounds[candidate], probeBounds)
    ) {
      continue;
    }

    const locations = probes.map((probe) =>
      locatePoint(outlines[candidate], probe),
    );
    const inside = locations.filter((location) => 'inside' === location);
    const outside = locations.filter((location) => 'outside' === location);

    // A point on the candidate's outline tells neither way
    if (inside.length > outside.length || 0 === outside.length) {
      enclosing = candidate;
    }
  }
  return enclosing;
}

// Fonts fill by the nonzero rule: an evenodd hole must wind against its outline
function windEvenOddAsNonZero(pathData: SVGPathData): SVGPathData {
  const contours = splitContours(
    new SVGPathData(pathData.commands.map(SVGPathDataTransformer.CLONE()))
      .toAbs()
      .normalizeST()
      .qtToC()
      .aToC().commands,
  );

  if (2 > contours.length) {
    return pathData;
  }

  const outlines = contours.map(flattenContour);
  const bounds = outlines.map(getBounds);
  const areas = outlines.map(signedArea);
  const enclosures = outlines.map((_outline, index) =>
    0 === areas[index]
      ? -1
      : findEnclosingContour(outlines, bounds, areas, index),
  );
  const windings: number[] = [];
  const resolveWinding = (index: number): number => {
    if ('undefined' === typeof windings[index]) {
      windings[index] =
        -1 === enclosures[index]
          ? Math.sign(areas[index])
          : -resolveWinding(enclosures[index]);
    }
    return windings[index];
  };
  const reversed = contours.map(
    (_contour, index) =>
      0 !== areas[index] && Math.sign(areas[index]) !== resolveWinding(index),
  );

  if (!reversed.includes(true)) {
    return pathData;
  }

  return new SVGPathData(
    contours.flatMap((contour, index) =>
      reversed[index] ? new SVGPathData(contour).reverse().commands : contour,
    ),
  );
}

export interface SVGIcons2SVGFontStreamOptions {
  fontName: string;
  fontId: string;
  fixedWidth: boolean;
  descent: number;
  ascent?: number;
  round: number;
  metadata: string;
  usePathBounds: boolean;
  normalize?: boolean;
  preserveAspectRatio?: boolean;
  centerHorizontally?: boolean;
  centerVertically?: boolean;
  fontWeight?: number | string;
  fontHeight?: number;
  fontStyle?: string;
  callback?: (glyphs: Glyph[]) => void;
}

export interface Glyph {
  name: string;
  color?: string;
  width: number;
  height: number;
  defaultHeight?: number | boolean;
  defaultWidth?: number | boolean;
  unicode: string[];
  paths?: SVGPathData[];
}

export class SVGIcons2SVGFontStream extends Transform {
  private _options: SVGIcons2SVGFontStreamOptions;
  glyphs: Glyph[];

  constructor(options: Partial<SVGIcons2SVGFontStreamOptions>) {
    super({ objectMode: true });

    this.glyphs = [];

    this._options = {
      ...options,
      fontName: options.fontName || 'iconfont',
      fontId: options.fontId || options.fontName || 'iconfont',
      fixedWidth: options.fixedWidth || false,
      descent: options.descent || 0,
      round: options.round || 10e12,
      metadata: options.metadata || '',
      usePathBounds: options.usePathBounds || false,
    };
  }

  _transform(
    svgIconStream: SVGIconStream,
    _unused: unknown,
    svgIconStreamCallback: () => undefined,
  ) {
    // Parsing each icons asynchronously
    const saxStream = Sax.createStream(true);
    const parents: (Sax.Tag | Sax.QualifiedTag)[] = [];
    const transformStack: Matrix[] = [];

    function applyTransform(d: string) {
      const last = transformStack[transformStack.length - 1];
      if (!last) return new SVGPathData(d);
      return new SVGPathData(d).matrix(
        last.a,
        last.b,
        last.c,
        last.d,
        last.e,
        last.f,
      );
    }

    const glyph: Glyph = (svgIconStream.metadata || {}) as Glyph;

    // init width and height os they aren't undefined if <svg> isn't renderable
    glyph.width = 0;
    glyph.height = 1;

    glyph.paths = [];
    this.glyphs.push(glyph);

    if ('string' !== typeof glyph.name) {
      this.emit(
        'error',
        new Error(
          `Please provide a name for the glyph at index ${
            this.glyphs.length - 1
          }`,
        ),
      );
    }
    if (
      this.glyphs.some(
        (anotherGlyph) =>
          anotherGlyph !== glyph && anotherGlyph.name === glyph.name,
      )
    ) {
      this.emit(
        'error',
        new Error(`The glyph name "${glyph.name}" must be unique.`),
      );
    }
    if (
      glyph.unicode &&
      glyph.unicode instanceof Array &&
      glyph.unicode.length
    ) {
      if (
        glyph.unicode.some((unicodeA, i) =>
          glyph.unicode.some((unicodeB, j) => i !== j && unicodeA === unicodeB),
        )
      ) {
        this.emit(
          'error',
          new Error(
            `Given codepoints for the glyph "${glyph.name}" contain duplicates.`,
          ),
        );
      }
    } else if ('string' !== typeof glyph.unicode) {
      this.emit(
        'error',
        new Error(`Please provide a codepoint for the glyph "${glyph.name}"`),
      );
    }

    if (
      this.glyphs.some(
        (anotherGlyph) =>
          anotherGlyph !== glyph && anotherGlyph.unicode === glyph.unicode,
      )
    ) {
      this.emit(
        'error',
        new Error(
          `The glyph "${glyph.name}" codepoint seems to be used already elsewhere.`,
        ),
      );
    }

    saxStream.on('opentag', (tag) => {
      let values;
      let color;

      parents.push(tag);

      try {
        const currentTransform = transformStack[transformStack.length - 1];

        if ('undefined' !== typeof tag.attributes.transform) {
          const transform = matrixFromTransformAttribute(
            tag.attributes.transform as string,
          );
          transformStack.push(
            compose([currentTransform, transform].filter(Boolean)),
          );
        } else {
          transformStack.push(currentTransform);
        }
        // Checking if any parent rendering is disabled and exit if so
        if (!tagShouldRender(tag as Tag, parents as Tag[])) {
          return;
        }

        // Save the view size
        if ('svg' === tag.name) {
          if ('viewBox' in tag.attributes) {
            values = (tag.attributes.viewBox as string).split(
              /\s*,*\s|\s,*\s*|,/,
            );
            const dX = parseFloat(values[0]);
            const dY = parseFloat(values[1]);
            const width = parseFloat(values[2]);
            const height = parseFloat(values[3]);

            // use the viewBox width/height if not specified explictly
            glyph.width =
              'width' in tag.attributes
                ? parseFloat(tag.attributes.width as string)
                : width;
            glyph.height =
              'height' in tag.attributes
                ? parseFloat(tag.attributes.height as string)
                : height;

            transformStack[transformStack.length - 1] = compose(
              [
                transformStack[transformStack.length - 1],
                translate(-dX, -dY),
                scale(glyph.width / width, glyph.height / height),
              ].filter(Boolean),
            );
          } else {
            if ('width' in tag.attributes) {
              glyph.width = parseFloat(tag.attributes.width as string);
            } else {
              warn(
                `⚠️ - Glyph "${glyph.name}" has no width attribute, using current glyph horizontal bounds.`,
              );
              glyph.defaultWidth = true;
            }
            if ('height' in tag.attributes) {
              glyph.height = parseFloat(tag.attributes.height as string);
            } else {
              warn(
                `⚠️ - Glyph "${glyph.name}" has no height attribute, using current glyph vertical bounds.`,
              );
              glyph.defaultHeight = true;
            }
          }
        } else if ('clipPath' === tag.name) {
          // Clipping path unsupported
          warn(
            `🤷 - Found a clipPath element in the icon "${glyph.name}" the result may be different than expected.`,
          );
        } else if ('rect' === tag.name && 'none' !== tag.attributes.fill) {
          glyph.paths?.push(
            applyTransform(
              SVGShapes.createRect(
                tag.attributes.x ? parseFloat(tag.attributes.x as string) : 0,
                tag.attributes.y ? parseFloat(tag.attributes.y as string) : 0,
                tag.attributes.width
                  ? parseFloat(tag.attributes.width as string)
                  : 0,
                tag.attributes.height
                  ? parseFloat(tag.attributes.height as string)
                  : 0,
                tag.attributes.rx
                  ? parseFloat(tag.attributes.rx as string)
                  : tag.attributes.ry
                    ? parseFloat(tag.attributes.ry as string)
                    : 0,
                tag.attributes.ry
                  ? parseFloat(tag.attributes.ry as string)
                  : tag.attributes.rx
                    ? parseFloat(tag.attributes.rx as string)
                    : 0,
              ).encode(),
            ),
          );
        } else if ('line' === tag.name && 'none' !== tag.attributes.fill) {
          warn(
            `🤷 - Found a line element in the icon "${glyph.name}" the result could be different than expected.`,
          );
          glyph.paths?.push(
            applyTransform(
              SVGShapes.createPolyline([
                tag.attributes.x1 ? parseFloat(tag.attributes.x1 as string) : 0,
                tag.attributes.y1 ? parseFloat(tag.attributes.y1 as string) : 0,
                tag.attributes.x2 ? parseFloat(tag.attributes.x2 as string) : 0,
                tag.attributes.y2 ? parseFloat(tag.attributes.y2 as string) : 0,
              ]).encode(),
            ),
          );
        } else if ('polyline' === tag.name && 'none' !== tag.attributes.fill) {
          warn(
            `🤷 - Found a polyline element in the icon "${glyph.name}" the result could be different than expected.`,
          );
          glyph.paths?.push(
            applyTransform(
              SVGShapes.createPolyline(
                ((tag.attributes.points as string) || '')
                  .split(/\s/gm)
                  .map((coord) => coord.split(',').map((n) => parseFloat(n)))
                  .flat(),
              ).encode(),
            ),
          );
        } else if ('polygon' === tag.name && 'none' !== tag.attributes.fill) {
          glyph.paths?.push(
            applyTransform(
              SVGShapes.createPolygon(
                ((tag.attributes.points as string) || '')
                  .split(/\s/gm)
                  .map((coord) => coord.split(',').map((n) => parseFloat(n)))
                  .flat(),
              ).encode(),
            ),
          );
        } else if (
          ['circle', 'ellipse'].includes(tag.name) &&
          'none' !== tag.attributes.fill
        ) {
          glyph.paths?.push(
            applyTransform(
              SVGShapes.createEllipse(
                tag.attributes.rx
                  ? parseFloat(tag.attributes.rx as string)
                  : tag.attributes.r
                    ? parseFloat(tag.attributes.r as string)
                    : 0,
                tag.attributes.ry
                  ? parseFloat(tag.attributes.ry as string)
                  : tag.attributes.r
                    ? parseFloat(tag.attributes.r as string)
                    : 0,
                tag.attributes.cx ? parseFloat(tag.attributes.cx as string) : 0,
                tag.attributes.cy ? parseFloat(tag.attributes.cy as string) : 0,
              ).encode(),
            ),
          );
        } else if (
          'path' === tag.name &&
          tag.attributes.d &&
          'none' !== tag.attributes.fill
        ) {
          const pathData = applyTransform(tag.attributes.d as string);

          glyph.paths?.push(
            'evenodd' === getTagFillRule(parents as Tag[])
              ? windEvenOddAsNonZero(pathData)
              : pathData,
          );
        }

        // According to http://www.w3.org/TR/SVG/painting.html#SpecifyingPaint
        // Map attribute fill to color property
        if ('none' !== tag.attributes.fill) {
          color = getTagColor(tag as Tag, parents as Tag[]);
          if ('undefined' !== typeof color) {
            glyph.color = color;
          }
        }
      } catch (err) {
        this.emit(
          'error',
          new Error(
            `Got an error parsing the glyph "${glyph.name}": ${(err as Error)?.message}.`,
          ),
        );
      }
    });

    saxStream.on('error', (err) => {
      this.emit('error', err);
    });

    saxStream.on('closetag', () => {
      transformStack.pop();
      parents.pop();
    });

    saxStream.on('end', () => {
      svgIconStreamCallback();
    });

    svgIconStream.pipe(saxStream);
  }

  _flush(svgFontFlushCallback: () => void) {
    this.glyphs.forEach((glyph) => {
      if (
        glyph.defaultHeight ||
        glyph.defaultWidth ||
        this._options.usePathBounds
      ) {
        const glyphPath = new SVGPathData('');
        (glyph.paths || []).forEach((path) => {
          glyphPath.commands.push(...path.commands);
        });
        const bounds = glyphPath.getBounds();

        if (glyph.defaultHeight || this._options.usePathBounds) {
          glyph.height = bounds.maxY - bounds.minY;
        }
        if (glyph.defaultWidth || this._options.usePathBounds) {
          glyph.width = bounds.maxX - bounds.minX;
        }
      }
    });

    const maxGlyphHeight = this.glyphs.reduce(
      (curMax, glyph) => Math.max(curMax, glyph.height),
      0,
    );
    const maxGlyphWidth = this.glyphs.reduce(
      (curMax, glyph) => Math.max(curMax, glyph.width),
      0,
    );
    const fontHeight = this._options.fontHeight || maxGlyphHeight;
    let fontWidth = maxGlyphWidth;

    if (this._options.normalize) {
      fontWidth = this.glyphs.reduce(
        (curMax, glyph) =>
          Math.max(curMax, (fontHeight / glyph.height) * glyph.width),
        0,
      );
    } else if (this._options.fontHeight) {
      // even if normalize is off, we need to scale the fontWidth if we have a custom fontHeight
      fontWidth *= fontHeight / maxGlyphHeight;
    }

    this._options.ascent =
      'undefined' !== typeof this._options.ascent
        ? this._options.ascent
        : fontHeight - this._options.descent;

    if (
      !this._options.normalize &&
      fontHeight >
        (1 < this.glyphs.length
          ? this.glyphs.reduce(
              (curMin, glyph) => Math.min(curMin, glyph.height),
              Infinity,
            )
          : this.glyphs[0].height)
    ) {
      warn(
        '🤷 - The provided icons do not have the same heights. This could lead' +
          ' to unexpected results. Using the normalize option may help.',
      );
    }
    if (1000 > fontHeight) {
      warn(
        '🤷 - A fontHeight of at least than 1000 is recommended, otherwise ' +
          'further steps (rounding in svg2ttf) could lead to ugly results.' +
          ' Use the fontHeight option to scale icons.',
      );
    }

    // Output the SVG file
    // (find a SAX parser that allows modifying SVG on the fly)
    this.push(
      '<?xml version="1.0" standalone="no"?>\n' +
        '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >\n' +
        '<svg xmlns="http://www.w3.org/2000/svg">\n' +
        (this._options.metadata
          ? '<metadata>' + this._options.metadata + '</metadata>\n'
          : '') +
        '<defs>\n' +
        '  <font id="' +
        this._options.fontId +
        '" horiz-adv-x="' +
        fontWidth +
        '">\n' +
        '    <font-face font-family="' +
        this._options.fontName +
        '"\n' +
        '      units-per-em="' +
        fontHeight +
        '" ascent="' +
        this._options.ascent +
        '"\n' +
        '      descent="' +
        this._options.descent +
        '"' +
        (this._options.fontWeight
          ? '\n      font-weight="' + this._options.fontWeight + '"'
          : '') +
        (this._options.fontStyle
          ? '\n      font-style="' + this._options.fontStyle + '"'
          : '') +
        ' />\n' +
        '    <missing-glyph horiz-adv-x="0" />\n',
    );

    this.glyphs.forEach((glyph) => {
      const ratio = this._options.normalize
        ? fontHeight /
          (this._options.preserveAspectRatio && glyph.width > glyph.height
            ? glyph.width
            : glyph.height)
        : fontHeight / maxGlyphHeight;

      if (!isFinite(ratio)) {
        throw new YError('E_BAD_COMPUTED_RATIO', [ratio]);
      }

      glyph.width *= ratio;
      glyph.height *= ratio;
      const glyphPath = new SVGPathData('');

      if (this._options.fixedWidth) {
        glyph.width = fontWidth;
      }
      const yOffset = glyph.height - this._options.descent;
      let glyphPathTransform: Matrix = {
        a: 1,
        b: 0,
        c: 0,
        d: -1,
        e: 0,
        f: yOffset,
      }; // ySymmetry
      if (1 !== ratio) {
        glyphPathTransform = compose(glyphPathTransform, scale(ratio, ratio));
      }
      (glyph.paths || []).forEach((path) => {
        glyphPath.commands.push(
          ...path
            .toAbs()
            .matrix(
              glyphPathTransform.a,
              glyphPathTransform.b,
              glyphPathTransform.c,
              glyphPathTransform.d,
              glyphPathTransform.e,
              glyphPathTransform.f,
            ).commands,
        );
      });
      const bounds =
        (this._options.centerHorizontally || this._options.centerVertically) &&
        glyphPath.getBounds();
      if (this._options.centerHorizontally && bounds && 'maxX' in bounds) {
        glyphPath.translate(
          (glyph.width - (bounds.maxX - bounds.minX)) / 2 - bounds.minX,
        );
      }
      if (this._options.centerVertically && bounds && 'maxX' in bounds) {
        glyphPath.translate(
          0,
          (fontHeight - (bounds.maxY - bounds.minY)) / 2 -
            bounds.minY -
            this._options.descent,
        );
      }
      delete glyph.paths;
      const d = glyphPath.round(this._options.round).encode();
      glyph.unicode.forEach((unicode, i) => {
        const unicodeStr = [...unicode]
          .map(
            (char) =>
              '&#x' + char.codePointAt(0)?.toString(16).toUpperCase() + ';',
          )
          .join('');

        this.push(
          '    <glyph glyph-name="' +
            glyph.name +
            (0 === i ? '' : '-' + i) +
            '"\n' +
            '      unicode="' +
            unicodeStr +
            '"\n' +
            '      horiz-adv-x="' +
            glyph.width +
            '" d="' +
            d +
            '" />\n',
        );
      });
    });
    this.push('  </font>\n' + '</defs>\n' + '</svg>\n');
    warn('✅ - Font created');
    if ('function' === typeof this._options.callback) {
      this._options.callback(this.glyphs);
    }
    svgFontFlushCallback();
  }
}
