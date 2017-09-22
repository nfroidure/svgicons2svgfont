/* eslint-disable complexity,prefer-reflect,max-len,newline-after-var */
/* eslint no-multi-str:0 */

'use strict';

const { ucs2 } = require('punycode');
const { Transform } = require('stream');
const Sax = require('sax');
const { SVGPathData } = require('svg-pathdata');
const svgShapesToPath = require('./svgshapes2svgpath');
const { Matrix } = require('transformation-matrix-js');

require('string.prototype.codepointat');

// Transform helpers (will move elsewhere later)
function parseTransforms(value) {
  return value.match(
    /(rotate|translate|scale|skewX|skewY|matrix)\s*\(([^)]*)\)\s*/g
  ).map(transform => transform.match(/[\w.-]+/g));
}
function matrixFromTransformAttribute(transformAttributeString) {
  const transformations = {
    matrix: (result, ...args) => result.transform(...args),
    translate: (result, x, y = 0) => result.translate(x, y),
    scale: (result, x, y = x) => result.scale(x, y),
    rotate: (result, a, x = 0, y = 0) => {
      if(0 === x && 0 === y) {
        result.rotateDeg(a);
      } else {
        result
          .translate(x, y)
          .rotateDeg(a)
          .translate(-x, -y);
      }
    },
    skewX: (result, a) => result.skewX((a * Math.PI) / 180),
    skewY: (result, a) => result.skewY((a * Math.PI) / 180),
  };

  const result = new Matrix();
  for(const transform of parseTransforms(transformAttributeString)) {
    transformations[transform[0]](result, ...transform.slice(1).map(parseFloat));
  }
  return result;
}

// Rendering
function tagShouldRender(curTag, parents) {
  let values;

  return !parents.some((tag) => {
    if('undefined' !== typeof tag.attributes.display &&
      'none' === tag.attributes.display.toLowerCase()) {
      return true;
    }
    if('undefined' !== typeof tag.attributes.width &&
      0 === parseFloat(tag.attributes.width)) {
      return true;
    }
    if('undefined' !== typeof tag.attributes.height &&
      0 === parseFloat(tag.attributes.height)) {
      return true;
    }
    if('undefined' !== typeof tag.attributes.viewBox) {
      values = tag.attributes.viewBox.split(/\s*,*\s|\s,*\s*|,/);
      if(0 === parseFloat(values[2]) || 0 === parseFloat(values[3])) {
        return true;
      }
    }
    return false;
  });
}

// According to the document (http://www.w3.org/TR/SVG/painting.html#FillProperties)
// fill <paint> none|currentColor|inherit|<color>
//     [<icccolor>]|<funciri> (not support yet)
function getTagColor(currTag, parents) {
  const defaultColor = 'black';
  const fillVal = currTag.attributes.fill;
  let color;
  const parentsLength = parents.length;

  if('none' === fillVal) {
    return color;
  }
  if('currentColor' === fillVal) {
    return defaultColor;
  }
  if('inherit' === fillVal) {
    if(0 === parentsLength) {
      return defaultColor;
    }
    return getTagColor(
      parents[parentsLength - 1],
      parents.slice(0, parentsLength - 1)
    );
    // this might be null.
    // For example: <svg ><path fill="inherit" /> </svg>
    // in this case getTagColor should return null
    // recursive call, the bottom element should be svg,
    // and svg didn't fill color, so just return null
  }

  return fillVal;
}

class SVGIcons2SVGFontStream extends Transform {

  constructor(options) {
    super({ objectMode: true });

    // Setting objectMode separately
    this._writableState.objectMode = true;
    this._readableState.objectMode = false;

    this.glyphs = [];

    this._options = options || {};
    this._options.fontName = this._options.fontName || 'iconfont';
    this._options.fontId = this._options.fontId || this._options.fontName;
    this._options.fixedWidth = this._options.fixedWidth || false;
    this._options.descent = this._options.descent || 0;
    this._options.round = this._options.round || 10e12;
    this._options.metadata = this._options.metadata || '';

    this.log = this._options.log || console.log.bind(console); // eslint-disable-line
  }

  _transform(svgIconStream, _unused, svgIconStreamCallback) {
    // Parsing each icons asynchronously
    const saxStream = Sax.createStream(true);
    const parents = [];
    const transformStack = [new Matrix()];
    function applyTransform(d) {
      return new SVGPathData(d).matrix(...transformStack[transformStack.length - 1].toArray());
    }
    const glyph = svgIconStream.metadata || {};

    glyph.paths = [];
    this.glyphs.push(glyph);

    if('string' !== typeof glyph.name) {
      this.emit('error', new Error(
        `Please provide a name for the glyph at index ${this.glyphs.length - 1}`));
    }
    if(this.glyphs.some(
        anotherGlyph => (anotherGlyph !== glyph && anotherGlyph.name === glyph.name))) {
      this.emit('error', new Error(`The glyph name "${glyph.name}" must be unique.`));
    }
    if(glyph.unicode && glyph.unicode instanceof Array && glyph.unicode.length) {
      if(glyph.unicode.some(
          (unicodeA, i) => glyph.unicode.some((unicodeB, j) => i !== j && unicodeA === unicodeB))) {
        this.emit('error', new Error(
          `Given codepoints for the glyph "${glyph.name}" contain duplicates.`));
      }
    } else if('string' !== typeof glyph.unicode) {
      this.emit('error', new Error(`Please provide a codepoint for the glyph "${glyph.name}"`));
    }

    if(this.glyphs.some(
        anotherGlyph => (anotherGlyph !== glyph && anotherGlyph.unicode === glyph.unicode))) {
      this.emit('error', new Error(
        `The glyph "${glyph.name}" codepoint seems to be used already elsewhere.`));
    }

    saxStream.on('opentag', (tag) => {
      let values;
      let color;

      parents.push(tag);
      try {
        const currentTransform = transformStack[transformStack.length - 1];

        if('undefined' !== typeof tag.attributes.transform) {
          const transform = matrixFromTransformAttribute(tag.attributes.transform);
          transformStack.push(currentTransform.clone().multiply(transform));
        } else {
          transformStack.push(currentTransform);
        }
        // Checking if any parent rendering is disabled and exit if so
        if(!tagShouldRender(tag, parents)) {
          return;
        }

        // Save the view size
        if('svg' === tag.name) {
          glyph.dX = 0;
          glyph.dY = 0;
          glyph.scaleX = 1;
          glyph.scaleY = 1;
          if('viewBox' in tag.attributes) {
            values = tag.attributes.viewBox.split(/\s*,*\s|\s,*\s*|,/);
            glyph.dX = parseFloat(values[0]);
            glyph.dY = parseFloat(values[1]);
            glyph.width = parseFloat(values[2]);
            glyph.height = parseFloat(values[3]);
            if('width' in tag.attributes) {
              glyph.scaleX = glyph.width /
                parseFloat(tag.attributes.width);
              glyph.width = parseFloat(tag.attributes.width);
            }
            if('height' in tag.attributes) {
              glyph.scaleY = glyph.height /
                parseFloat(tag.attributes.height);
              glyph.height = parseFloat(tag.attributes.height);
            }
          } else {
            if('width' in tag.attributes) {
              glyph.width = parseFloat(tag.attributes.width);
            }
            if('height' in tag.attributes) {
              glyph.height = parseFloat(tag.attributes.height);
            }
          }
          if((!glyph.width) || !glyph.height) {
            this.log(`Glyph "${glyph.name}" has no size attribute on which to get the gylph dimensions (height and width or viewBox attributes)`);
            glyph.width = 150;
            glyph.height = 150;
          }
          // Clipping path unsupported
        } else if('clipPath' === tag.name) {
          this.log(`Found a clipPath element in the icon "${glyph.name}" the result may be different than expected.`);
        } else if('rect' === tag.name && 'none' !== tag.attributes.fill) {
          glyph.paths.push(applyTransform(svgShapesToPath.rectToPath(tag.attributes)));
        } else if('line' === tag.name && 'none' !== tag.attributes.fill) {
          this.log(`Found a line element in the icon "${glyph.name}" the result could be different than expected.`);
          glyph.paths.push(applyTransform(svgShapesToPath.lineToPath(tag.attributes)));
        } else if('polyline' === tag.name && 'none' !== tag.attributes.fill) {
          this.log(`Found a polyline element in the icon "${glyph.name}" the result could be different than expected.`);
          glyph.paths.push(applyTransform(svgShapesToPath.polylineToPath(tag.attributes)));
        } else if('polygon' === tag.name && 'none' !== tag.attributes.fill) {
          glyph.paths.push(applyTransform(svgShapesToPath.polygonToPath(tag.attributes)));
        } else if(
          ['circle', 'ellipse'].includes(tag.name) &&
          'none' !== tag.attributes.fill
        ) {
          glyph.paths.push(applyTransform(svgShapesToPath.circleToPath(tag.attributes)));
        } else if('path' === tag.name && tag.attributes.d &&
          'none' !== tag.attributes.fill) {
          glyph.paths.push(applyTransform(tag.attributes.d));
        }

        // According to http://www.w3.org/TR/SVG/painting.html#SpecifyingPaint
        // Map attribute fill to color property
        if('none' !== tag.attributes.fill) {
          color = getTagColor(tag, parents);
          if('undefined' !== typeof color) {
            glyph.color = color;
          }
        }
      } catch (err) {
        this.emit('error', new Error(
          `Got an error parsing the glyph "${glyph.name}": ${err.message}.`));
      }
    });

    saxStream.on('error', (err) => {
      this.emit('error', err);
    });

    saxStream.on('closetag', (tagName) => {
      transformStack.pop();
      parents.pop();
    });

    saxStream.on('end', () => {
      svgIconStreamCallback();
    });

    svgIconStream.pipe(saxStream);
  }

  _flush(svgFontFlushCallback) {
    const fontWidth = (
      1 < this.glyphs.length ?
        this.glyphs.reduce((curMax, glyph) => Math.max(curMax, glyph.width), 0) :
        this.glyphs[0].width);
    const fontHeight = this._options.fontHeight || (
      1 < this.glyphs.length ?
        this.glyphs.reduce((curMax, glyph) => Math.max(curMax, glyph.height), 0) :
        this.glyphs[0].height);

    this._options.ascent = 'undefined' !== typeof this._options.ascent ?
      this._options.ascent :
      fontHeight - this._options.descent;

    if(
      (!this._options.normalize) &&
        fontHeight > (1 < this.glyphs.length ?
          this.glyphs.reduce((curMin, glyph) => Math.min(curMin, glyph.height), Infinity) :
          this.glyphs[0].height
      )
    ) {
      this.log('The provided icons does not have the same height it could lead' +
        ' to unexpected results. Using the normalize option could' +
        ' solve the problem.');
    }
    if(1000 > fontHeight) {
      this.log('The fontHeight should larger than 1000 or it will be converted ' +
        'into the wrong shape. Using the "normalize" and "fontHeight"' +
        ' options can solve the problem.');
    }

    // Output the SVG file
    // (find a SAX parser that allows modifying SVG on the fly)
    /* eslint-disable prefer-template */
    this.push(
      '<?xml version="1.0" standalone="no"?>\n' +
      '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >\n' +
      '<svg xmlns="http://www.w3.org/2000/svg">\n' +
      (this._options.metadata ? '<metadata>' + this._options.metadata + '</metadata>\n' : '') +
      '<defs>\n' +
      '  <font id="' + this._options.fontId + '" horiz-adv-x="' + fontWidth + '">\n' +
      '    <font-face font-family="' + this._options.fontName + '"\n' +
      '      units-per-em="' + fontHeight + '" ascent="' + this._options.ascent + '"\n' +
      '      descent="' + this._options.descent + '"' +
      (this._options.fontWeight ? '\n      font-weight="' + this._options.fontWeight + '"' : '') +
      (this._options.fontStyle ? '\n      font-style="' + this._options.fontStyle + '"' : '') + ' />\n' +
      '    <missing-glyph horiz-adv-x="0" />\n');

    this.glyphs.forEach((glyph) => {
      const ratio = fontHeight / glyph.height;
      const glyphPath = new SVGPathData('');

      if(this._options.fixedWidth) {
        glyph.width = fontWidth;
      }
      if(this._options.normalize) {
        glyph.height = fontHeight;
        if(!this._options.fixedWidth) {
          glyph.width *= ratio;
        }
      }
      const yOffset = glyph.height - this._options.descent;
      const glyphPathTransform = new Matrix()
        .transform(1, 0, 0, -1, 0, yOffset) // ySymmetry
        .scale(
          (this._options.normalize ? ratio : 1) * glyph.scaleX,
          (this._options.normalize ? ratio : 1) * glyph.scaleY)
        .translate(-glyph.dX, -glyph.dY);
      glyph.paths.forEach((path) => {
        glyphPath.commands.push(...path
          .toAbs()
          .matrix(...glyphPathTransform.toArray()).commands);
      });
      if(this._options.centerHorizontally) {
        const bounds = glyphPath.getBounds();

        glyphPath.translate(((glyph.width - (bounds.maxX - bounds.minX)) / 2) - bounds.minX);
      }
      delete glyph.paths;
      glyph.unicode.forEach((unicode, i) => {
        const unicodeStr = ucs2.decode(unicode)
          .map(point => '&#x' + point.toString(16).toUpperCase() + ';')
          .join('');
        const d = glyphPath.round(this._options.round).encode();

        this.push(
          '    <glyph glyph-name="' + glyph.name + (0 === i ? '' : '-' + i) + '"\n' +
          '      unicode="' + unicodeStr + '"\n' +
          '      horiz-adv-x="' + glyph.width + '" d="' + d + '" />\n');
      });
    });
    this.push(
      '  </font>\n' +
      '</defs>\n' +
      '</svg>\n');
    this.log('Font created');
    if('function' === (typeof this._options.callback)) {
      this._options.callback(this.glyphs);
    }
    svgFontFlushCallback();
  }
}

module.exports = SVGIcons2SVGFontStream;
