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
  , 
  SVGPathData = require("svg-pathdata");

function svgicons2svgfont(files, dest, options) {
  options = options || {};
  options.fontName = options.fontName || 'iconfont';
  var outputFont = Fs.createWriteStream(dest)
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
          'M' + parseInt(tag.attributes.x,10).toString(10)
          + ' ' + parseInt(tag.attributes.y,10).toString(10)
          // Draw the rectangle
          + 'h' + parseInt(tag.attributes.width, 10).toString(10)
          + 'v' + (parseInt(tag.attributes.height, 10)*-1).toString(10)
          + 'h' + (parseInt(tag.attributes.width, 10)*-1).toString(10)
          + 'z'
        );
      } else if('line' === tag.name) {
        log('Found a line on the icon "' + glyph.name + '" the result could be'
          +' different than expected.')
        glyph.d.push(
          // Move to the line start
          'M' + parseInt(tag.attributes.x1,10).toString(10)
          + ' ' + parseInt(tag.attributes.y1,10).toString(10)
          // Draw the line (rect with a weight of 1)
          + 'H' + parseInt(tag.attributes.x2, 10).toString(10)
          + 'v-5'
          + 'H' + parseInt(tag.attributes.x1, 10).toString(10)
          + 'Z'
        );
      } else if('circle' === tag.name) {
        glyph.d.push(
          // Move to the point leftest point of the circle
          'M' + (parseInt(tag.attributes.cx,10)-parseInt(tag.attributes.r,10)).toString(10)
          + ' ' + parseInt(tag.attributes.cy,10).toString(10)
          // Draw an arc to left rightest point
          + 'A ' + (parseInt(tag.attributes.r,10)).toString(10) + ' '
          + (parseInt(tag.attributes.r,10)).toString(10)+' 0 0 0 '
          + (parseInt(tag.attributes.cx,10)+parseInt(tag.attributes.r,10)).toString(10)
          + ' ' + parseInt(tag.attributes.cy,10).toString(10)
          // Draw an inverted arc to the leftest point
          + 'A ' + (parseInt(tag.attributes.r,10)).toString(10) + ' '
          + (parseInt(tag.attributes.r,10)).toString(10)+' 180 0 0 '
          + (parseInt(tag.attributes.cx,10)-parseInt(tag.attributes.r,10)).toString(10)
          + ' ' + parseInt(tag.attributes.cy,10).toString(10)
          + 'Z'
        );
      console.log((
          // Move to the point leftest point of the circle
          'M' + (parseInt(tag.attributes.cx,10)-parseInt(tag.attributes.r,10)).toString(10)
          + ' ' + parseInt(tag.attributes.cy,10).toString(10)
          // Draw an arc to left rightest point
          + 'A ' + (parseInt(tag.attributes.r,10)).toString(10) + ' '
          + (parseInt(tag.attributes.r,10)).toString(10)+' 0 0 0 '
          + (parseInt(tag.attributes.cx,10)+parseInt(tag.attributes.r,10)).toString(10)
          + ' ' + parseInt(tag.attributes.cy,10).toString(10)
          // Draw an inverted arc to the leftest point
          + 'A ' + (parseInt(tag.attributes.r,10)).toString(10) + ' '
          + (parseInt(tag.attributes.r,10)).toString(10)+' 180 0 0 '
          + (parseInt(tag.attributes.cx,10)-parseInt(tag.attributes.r,10)).toString(10)
          + ' ' + parseInt(tag.attributes.cy,10).toString(10)
          + 'Z'
        ))
      }
    });
    saxStream.on('attribute', function(attr) {
      if('width' === attr.name && 'svg' === saxStream._parser.tag.name) {
        glyph.width = parseInt(attr.value, 10);
      } else if('height' === attr.name && 'svg' === saxStream._parser.tag.name) {
        glyph.height = parseInt(attr.value, 10);
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
        // Output the SVG file
        // (find a SAX parser that allows modifying SVG on the fly)
        outputFont.write('<?xml version="1.0" standalone="no"?> \n\
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" >\n\
<svg xmlns="http://www.w3.org/2000/svg">\n\
<defs>\n\
  <font id="' + options.fontName + '" horiz-adv-x="' + fontHeight + '">\n\
    <font-face units-per-em="' + fontHeight + '" ascent="' + fontHeight + '" descent="0" />\n\
    <missing-glyph horiz-adv-x="0" />\n');
        glyphs.forEach(function(glyph) {
          var d = '', encoder = new SVGPathData.Encoder(function(chunk){
            d += ' ' + chunk;
          });
          if(!glyph.d.length) {
            throw Error('The icon named "' + file + '" has no content or content'
              + ' couldn\'t be extracted.');
          }
          glyph.d.forEach(function(d) {
            var notFirst = false
              , parser = new SVGPathData.Parser(function(command) {
              if('undefined' !== command.y && command.y !== 0) {
                if(notFirst && command.relative) {
                  command.y = -command.y;
                } else {
                  command.y = fontHeight - command.y;
                }
              }
              if('undefined' !== command.y1 && command.y1 !== 0) {
                if(notFirst && command.relative) {
                  command.y1 = -command.y1;
                } else {
                  command.y1 = fontHeight - command.y1;
                }
              }
              if('undefined' !== command.y2 && command.y2 !== 0) {
                if(notFirst && command.relative) {
                  command.y2 = -command.y2;
                } else {
                  command.y2 = fontHeight - command.y2;
                }
              }
              notFirst = true;
              encoder.write(command);
            });
          parser.read(d).end();
          });
          outputFont.write('\
    <glyph glyph-name="'+glyph.name+'" unicode="'+glyph.character+'" horiz-adv-x="'+glyph.width+'" d="'+d+'" />\n');
        });
        outputFont.write('\
  </font>\n\
</defs>\n\
</svg>\n');
        outputFont.on('finish', function() {
          log("Font saved to " + dest);
          'function' === (typeof options.callback) && (options.callback)();
        });
        outputFont.end();
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
}

module.exports = svgicons2svgfont;

