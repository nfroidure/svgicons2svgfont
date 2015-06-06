#! /usr/bin/env node

var svgicons2svgfont = require(__dirname + '/../src/index.js');
var SVGIconsDirStream = require(__dirname + '/../src/iconsdir.js');
var fs = require('fs');
var codepoint = 0xE001;

SVGIconsDirStream(process.argv[2])
  .pipe(svgicons2svgfont({
    fontName: process.argv[4] || ''
    }
  ))
  .pipe(fs.createWriteStream(process.argv[3]));
