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
  , Fs = require("fs")
  , Sax = require("sax")
  , SVGPathData = require("svg-pathdata");

function svgicons2svgfont(files, options) {
  options = options || {};
  options.fontName = options.fontName || 'iconfont';
  var Stream = require("stream").PassThrough
    , outputStream = new Stream()
    , usedCodePoints = []
    , log = (options.log || console.log.bind(console))
    , error = options.error || console.error.bind(console)
    , glyphs = files.map(function(file) {
    // Creating an object for each icon
    var matches = Path.basename(file).match(/^(?:u([0-9a-f]{4})\-)?(.*).svg$/i);
    if(matches&&matches[1]) {
      usedCodePoints.push(parseInt(matches[1], 16));
      return {
        name: matches[2],
        codepoint: matches[1],
        character: '&#x' + matches[1].toUpperCase() + ';',
        file: file,
        d: [],
        running: true
      };
    } else if(matches) {
      return {
        name: matches[2],
        codepoint: 0,
        character: '',
        file: file,
        d: [],
        running: true
      };
    }
  }).forEach(function (glyph, index, glyphs) {
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
          + 'v' + (parseFloat(tag.attributes.height, 10)*-1).toString(10)
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
          // Draw the line (rect with a weight of 1)
          + 'H' + parseFloat(tag.attributes.x2, 10).toString(10)
          + 'v-5'
          + 'H' + parseFloat(tag.attributes.x1, 10).toString(10)
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
          log('The provided icons does not have the same length it could lead'
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
            d+=' '+new SVGPathData(cD).ySymetry(fontHeight).encode();
          });
          delete glyph.d;
          delete glyph.running;
        outputStream.write('\
    <glyph glyph-name="'+glyph.name+'" unicode="'+glyph.character+'" horiz-adv-x="'+glyph.width+'" d="'+d+'" />\n');
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
    Fs.createReadStream(glyph.file).pipe(saxStream);
    // Find a free codepoint and rename the file
    if(0 === glyph.codepoint) {
      for(var i = UNICODE_PRIVATE_USE_AREA.start,
        j=UNICODE_PRIVATE_USE_AREA.end; i<j; i++) {
        if(-1 === usedCodePoints.indexOf(i)) {
          glyph.codepoint = i.toString(16);
          glyph.character = '&#x' + i.toString(16).toUpperCase() + ';';
          usedCodePoints.push(i);
          if(options.appendCodepoints) {
            Fs.rename(glyph.file, Path.dirname(glyph.file) + '/'
              + 'u' + i.toString(16).toUpperCase() + '-' + glyph.name + '.svg',
            function(err) {
              if(err) {
                error("Could not save codepoint: " + 'u'
                  + i.toString(16).toUpperCase() +' for ' + glyph.name + '.svg');
              } else {
                log("Saved codepoint: " + 'u' + i.toString(16).toUpperCase()
                  +' for ' + glyph.name + '.svg');
              }
            });
          }
          break;
        }
      }
    }
  });
  return outputStream;
}

module.exports = svgicons2svgfont;

