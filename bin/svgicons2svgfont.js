#! /usr/bin/env node
/* eslint-disable prefer-reflect */

'use strict';

const program = require('commander');
const fs = require('fs');
const glob = require('glob');

const SVGIcons2SVGFontStream = require('../src/index.js');
const SVGIconsDirStream = require('../src/iconsdir.js');

program
  .storeOptionsAsProperties(true)
  .version(require('../package').version)
  .usage('[options] <icons ...>')
  .option('-v, --verbose', 'tell me everything!')
  .option('-o, --output [/dev/stdout]', 'file to write output to')
  .option('-f, --fontname [value]', 'the font family name you want [iconfont]')
  .option('-i, --fontId [value]', 'the font id you want [fontname]')
  .option('-st, --style [value]', 'the font style you want')
  .option('-we, --weight [value]', 'the font weight you want')
  .option(
    '-w, --fixedWidth',
    'creates a monospace font of the width of the largest input icon'
  )
  .option(
    '-c, --centerHorizontally',
    'calculate the bounds of a glyph and center it horizontally'
  )
  .option(
    '-y, --centerVertically',
    'centers the glyphs vertically in the generated font.'
  )
  .option(
    '-n, --normalize',
    'normalize icons by scaling them to the height of the highest icon'
  )
  .option(
    '-p, --preserveAspectRatio',
    'used with normalize to scale down glyph if the SVG width is greater than the height'
  )
  .option(
    '-h, --height [value]',
    'the output font height [MAX(icons.height)] (icons will be scaled so the highest has this height)',
    parseInt
  )
  .option(
    '-r, --round [value]',
    'setup the SVG path rounding [10e12]',
    parseFloat
  )
  .option('-d, --descent [value]', 'the font descent [0]', parseInt)
  .option(
    '-a, --ascent [value]',
    'the font ascent [height - descent]',
    parseInt
  )
  .option(
    '-s, --startunicode [value]',
    'the start unicode codepoint for' + ' unprefixed files [0xEA01]',
    parseInt
  )
  .option(
    '-a, --prependUnicode',
    'prefix files with their automatically' + ' allocated unicode code point',
    parseInt
  )
  .option('-m, --metadata', 'content of the metadata tag')
  .parse(process.argv);

if (!program.args.length) {
  console.error('No icons specified!'); // eslint-disable-line
  process.exit(1);
}

const files = program.args.flatMap((file) => glob.sync(file));
const options = program.opts();

new SVGIconsDirStream(files, {
  startUnicode: options.startunicode,
  prependUnicode: options.prependUnicode,
  log: options.v ? console.log : function () {}, // eslint-disable-line
})
  .pipe(
    new SVGIcons2SVGFontStream({
      fontName: options.fontname,
      fontId: options.fontId,
      fixedWidth: options.fixedwidth,
      centerHorizontally: options.centerHorizontally,
      centerVertically: options.centerVertically,
      normalize: options.normalize,
      preserveAspectRatio: options.preserveAspectRatio,
      fontHeight: options.height,
      fontWeight: options.weight,
      round: options.round,
      descent: options.descent,
      ascent: options.ascent,
      metadata: options.metadata,
      log: options.v ? console.log : function () {}, // eslint-disable-line
    })
  )
  .pipe(options.output ? fs.createWriteStream(options.output) : process.stdout);
