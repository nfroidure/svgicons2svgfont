import { Transform } from 'stream';
import Sax, { type Tag } from 'sax';
import { SVGPathData, SVGShapes } from 'svg-pathdata';
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
// SVG 2's never-rendered elements except defs and symbol, whose content drawn in
// place is the only way a sprite icon draws, since <use> is never resolved here
// https://www.w3.org/TR/SVG2/render.html#TermNeverRenderedElement
const NEVER_RENDERED_ELEMENTS = [
  'clipPath',
  'desc',
  'linearGradient',
  'marker',
  'mask',
  'metadata',
  'pattern',
  'radialGradient',
  'script',
  'style',
  'title',
];

function tagShouldRender(curTag: Tag, parents: Tag[]) {
  let values;

  return !parents.some((tag) => {
    if (NEVER_RENDERED_ELEMENTS.includes(tag.name)) {
      return true;
    }
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
        // Clipping and masking unsupported, however an element references them
        if ('clipPath' === tag.name || 'mask' === tag.name) {
          warn(
            `🤷 - Found a ${tag.name} element in the icon "${glyph.name}" the result may be different than expected.`,
          );
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
          glyph.paths?.push(applyTransform(tag.attributes.d as string));
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
