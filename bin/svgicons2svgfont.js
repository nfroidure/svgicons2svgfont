#! /usr/bin/env node

var fs = require('fs');

var SVGIcons2SVGFontStream = require(__dirname + '/../src/index.js');
var SVGIconsDirStream = require(__dirname + '/../src/iconsdir.js');

SVGIconsDirStream(process.argv[2])
  .pipe(SVGIcons2SVGFontStream({
    fontName: process.argv[4] || ''
    }
  ))
  .pipe(fs.createWriteStream(process.argv[3]));
