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
};

// Required modules
var Path = require("path")
  , Fs = require("fs")
  , Sax = require("sax")
  , SVGPathData = require("svg-pathdata");

function svgicons2svgfont(files, dest, options) {
  options = options || {};
  options.fontName = options.fontName || 'iconfont';
  var outputFont = Fs.createWriteStream(dest)
    , usedCodePoints = []
    , log = (options.log || console.log.bind(console))
    , error = options.error || console.error.bind(console)
    , glyphs = files.map(function(file) {
    // Creating object for each icon
    var matches = Path.basename(file).match(/^(?:u([0-9a-f]{4})\-)?(.*).svg$/i);
    if(matches&&matches[1]) {
      usedCodePoints.push(parseInt(matches[1], 16));
      return {
        name: matches[2],
        codepoint: matches[1],
        character: '&#x' + matches[1].toUpperCase() + ';',
        file: file,
        d: ''
      };
    } else if(matches) {
      return {
        name: matches[2],
        codepoint: 0,
        character: '',
        file: file,
        d: ''
      };
    }
  }).forEach(function (glyph, index, glyphs) {
    // Parsing each icons asynchronously
    var saxStream = Sax.createStream(true);
    saxStream.onattribute = function(attr) {
      if('width' === attr.name && 'svg' === saxStream._parser.tag.name) {
        glyph.width = parseInt(attr.value, 10);
      } else if('height' === attr.name && 'svg' === saxStream._parser.tag.name) {
        glyph.height = parseInt(attr.value, 10);
      } else if('d' === attr.name) {
        if(!attr.value) {
          throw Error('File "' + file + '" contains no PathData.');
        }
        glyph.d = attr.value;
        if(glyphs.every(function(glyph) {
          return glyph.d !== '';
        })) {
          var fontHeight = glyphs.reduce(function (gA, gB) {
            return Math.max(gA.height || gA, gB.height || gB);
          });
          // Output the SVG file
          // (find a SAX parser the allows modifying SVG on the fly)
          outputFont.write('<?xml version="1.0" standalone="no"?> \n\
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >\n\
<svg xmlns="http://www.w3.org/2000/svg">\n\
  <defs>\n\
    <font id="' + options.fontName + '" horiz-adv-x="' + fontHeight + '">\n\
      <font-face units-per-em="' + fontHeight + '" ascent="' + fontHeight + '" descent="0" />\n\
      <missing-glyph horiz-adv-x="0" />\n');
      glyphs.forEach(function(glyph) {
          outputFont.write('\
      <glyph glyph-name="'+glyph.name+'" unicode="'+glyph.character+'" horiz-adv-x="'+glyph.width+'" d="'+glyph.d+'" />\n');
      });
          outputFont.write('\
    </font>\n\
  </defs>\n\
</svg>\n');
        log("Font saved to " + dest);
        'function' === (typeof options.callback) && (options.callback)();
        }
      }
    };
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
}

module.exports = svgicons2svgfont;

