/*
 * svgicons2svgfont
 * https://github.com/nfroidure/svgicons2svgfont
 *
 * Copyright (c) 2013 Nicolas Froidure, Cameron Hunter
 * Licensed under the MIT license.
 */
"use strict";

// http://en.wikipedia.org/wiki/Private_Use_(Unicode)
var UNICODE_PRIVATE_USE_AREA = {
    start: 0xE001,
    end: 0xF8FF
  }
// http://www.whizkidtech.redprince.net/bezier/circle/
  , KAPPA = ((Math.sqrt(2)-1)/3)*4;

// Required modules
var Path = require("path")
  , Stream = require("stream").PassThrough
  , Fs = require("fs")
  , Sax = require("sax")
  , SVGPathData = require("svg-pathdata");

function svgicons2svgfont(glyphs, options) {
  options = options || {};
  options.fontName = options.fontName || 'iconfont';
  var outputStream = new Stream()
    , log = (options.log || console.log.bind(console))
    , error = options.error || console.error.bind(console);
  glyphs = glyphs.forEach(function (glyph, index, glyphs) {
    // Parsing each icons asynchronously
    var saxStream = Sax.createStream(true);
    saxStream.on('opentag', function(tag) {
      // Change rect elements to the corresponding path
      if('rect' === tag.name) {
        glyph.d.push(
          // Move to the left corner
          'M' + parseFloat(tag.attributes.x,10).toString(10)
          + ' ' + parseFloat(tag.attributes.y,10).toString(10)
          // Draw the rectangle
          + 'h' + parseFloat(tag.attributes.width, 10).toString(10)
          + 'v' + (parseFloat(tag.attributes.height, 10)).toString(10)
          + 'h' + (parseFloat(tag.attributes.width, 10)*-1).toString(10)
          + 'z'
        );
      } else if('line' === tag.name) {
        log('Found a line element in the icon "' + glyph.name + '" the result'
          +' could be different than expected.');
        glyph.d.push(
          // Move to the line start
          'M' + parseFloat(tag.attributes.x1,10).toString(10)
          + ' ' + parseFloat(tag.attributes.y1,10).toString(10)
          + ' ' + (parseFloat(tag.attributes.x1,10)+1).toString(10)
          + ' ' + (parseFloat(tag.attributes.y1,10)+1).toString(10)
          + ' ' + (parseFloat(tag.attributes.x2,10)+1).toString(10)
          + ' ' + (parseFloat(tag.attributes.y2,10)+1).toString(10)
          + ' ' + parseFloat(tag.attributes.x2,10).toString(10)
          + ' ' + parseFloat(tag.attributes.y2,10).toString(10)
          + 'Z'
        );
      } else if('polyline' === tag.name) {
        log('Found a polyline element in the icon "' + glyph.name + '" the'
          +' result could be different than expected.');
        glyph.d.push(
          'M' + tag.attributes.points
        );
      } else if('polygon' === tag.name) {
        glyph.d.push(
          'M' + tag.attributes.points + 'Z'
        );
      } else if('circle' === tag.name || 'ellipse' === tag.name) {
        var cx = parseFloat(tag.attributes.cx,10)
          , cy = parseFloat(tag.attributes.cy,10)
          , rx = 'undefined' !== typeof tag.attributes.rx ?
              parseFloat(tag.attributes.rx,10) : parseFloat(tag.attributes.r,10)
          , ry = 'undefined' !== typeof tag.attributes.ry ?
              parseFloat(tag.attributes.ry,10) : parseFloat(tag.attributes.r,10);
        glyph.d.push(
          'M' + (cx - rx) + ',' + cy
          + 'C' + (cx - rx) + ',' + (cy + ry*KAPPA)
          + ' ' + (cx - rx*KAPPA) + ',' + (cy + ry)
          + ' ' + cx + ',' + (cy + ry)
          + 'C' + (cx + rx*KAPPA) + ',' + (cy+ry)
          + ' ' + (cx + rx) + ',' + (cy + ry*KAPPA)
          + ' ' + (cx + rx) + ',' + cy
          + 'C' + (cx + rx) + ',' + (cy - ry*KAPPA)
          + ' ' + (cx + rx*KAPPA) + ',' + (cy - ry)
          + ' ' + cx + ',' + (cy - ry)
          + 'C' + (cx - rx*KAPPA) + ',' + (cy - ry)
          + ' ' + (cx - rx) + ',' + (cy - ry*KAPPA)
          + ' ' + (cx - rx) + ',' + cy
          + 'Z'
        );
      }
    });
    saxStream.on('attribute', function(attr) {
      if('width' === attr.name && 'svg' === saxStream._parser.tag.name) {
        glyph.width = parseFloat(attr.value, 10);
      } else if('height' === attr.name && 'svg' === saxStream._parser.tag.name) {
        glyph.height = parseFloat(attr.value, 10);
      } else if('d' === attr.name && 'path' === saxStream._parser.tag.name) {
        if(attr.value) {
          glyph.d.push(attr.value);
        }
      }
    });
    saxStream.on('end', function() {
      glyph.running = false;
      if(glyphs.every(function(glyph) {
        return !glyph.running;
      })) {
        var fontHeight = (glyphs.length > 1 ? glyphs.reduce(function (gA, gB) {
          return Math.max(gA.height || gA, gB.height || gB);
        }) : glyphs[0].height);
        if(fontHeight>(glyphs.length > 1 ? glyphs.reduce(function (gA, gB) {
          return Math.min(gA.height || gA, gB.height || gB);
        }) : glyphs[0].height)) {
          log('The provided icons does not have the same height it could lead'
            +' to unexpected results.');
        }
        // Output the SVG file
        // (find a SAX parser that allows modifying SVG on the fly)
        outputStream.write('<?xml version="1.0" standalone="no"?> \n\
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >\n\
<svg xmlns="http://www.w3.org/2000/svg">\n\
<defs>\n\
  <font id="' + options.fontName + '" horiz-adv-x="' + fontHeight + '">\n\
    <font-face units-per-em="' + fontHeight + '" ascent="' + fontHeight + '" descent="0" />\n\
    <missing-glyph horiz-adv-x="0" />\n');
        glyphs.forEach(function(glyph) {
          var d = '';
          glyph.d.forEach(function(cD) {
            d+=' '+new SVGPathData(cD).ySymetry(glyph.height).encode();
          });
          delete glyph.d;
          delete glyph.running;
          outputStream.write('\
    <glyph glyph-name="' + glyph.name + '"\n\
      unicode="&#x' + (glyph.codepoint.toString(16)).toUpperCase() + ';"\n\
      horiz-adv-x="' + glyph.width + '" d="' + d +'" />\n');
        });
        outputStream.write('\
  </font>\n\
</defs>\n\
</svg>\n');
        outputStream.on('finish', function() {
          log("Font created");
          'function' === (typeof options.callback) && (options.callback)(glyphs);
        });
        outputStream.end();
      }
    });
    if('string' !== typeof glyph.name) {
      throw Error('Please provide a name for the glyph at index ' + index);
    }
    if(glyphs.some(function(g) {
      return (g !== glyph && g.name === glyph.name);
    })) {
      throw Error('The glyph name "' + glyph.name + '" must be unique.');
    }
    if('number' !== typeof glyph.codepoint) {
      throw Error('Please provide a codepoint for the glyph "' + glyph.name + '"');
    }
    if(glyphs.some(function(g) {
      return (g !== glyph && g.codepoint === glyph.codepoint);
    })) {
      throw Error('The glyph "' + glyph.name
        + '" codepoint seems to be used already elsewhere.');
    }
    glyph.running = true;
    glyph.d = [];
    glyph.stream.pipe(saxStream);
  });
  return outputStream;
}

module.exports = svgicons2svgfont;

