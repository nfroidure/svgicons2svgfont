#! /usr/bin/env node
/* eslint-disable prefer-reflect */

'use strict';

const program = require('commander');
const fs = require('fs');
const glob = require('glob');

const SVGIcons2SVGFont = require('../src/index.js');
const SVGIconsDirStream = require('../src/iconsdir.js');

program
  .version('9.0.1')
  .usage('[options] <icons ...>')
  .option('-v, --verbose', 'tell me everything!')
  .option('-o, --output [/dev/stdout]', 'Output file.')
  .option('-f, --fontname [value]', 'the font family name you want [iconfont].')
  .option('-i, --fontId [value]', 'the font id you want [fontname].')
  .option('-st, --style [value]', 'the font style you want.')
  .option('-we, --weight [value]', 'the font weight you want.')
  .option(
    '-w, --fixedWidth',
    'creates a monospace font of the width of the largest input icon.'
  )
  .option(
    '-c, --centerhorizontally',
    'calculate the bounds of a glyph and center it horizontally.'
  )
  .option(
    '-n, --normalize',
    'normalize icons by scaling them to the height of the highest icon.'
  )
  .option(
    '-h, --height [value]',
    'the output font height [MAX(icons.height)]. Icons will be scaled so the highest has this height.',
    parseInt
  )
  .option(
    '-r, --round [value]',
    'setup the SVG path rounding [10e12].',
    parseFloat
  )
  .option('-d, --descent [value]', 'the font descent [0].', parseInt)
  .option(
    '-a, --ascent [value]',
    'the font ascent [height - ascent].',
    parseInt
  )
  .option(
    '-s, --startunicode [value]',
    'the start unicode codepoint for' + ' unprefixed files [0xEA01].',
    parseInt
  )
  .option(
    '-a, --prependUnicode',
    'prefix files with their automatically' + ' allocated unicode codepoint.',
    parseInt
  )
  .option('-m, --metadata', 'content of the metadata tag.')
  .parse(process.argv);

if (!program.args.length) {
  console.error('No icons specified!'); // eslint-disable-line
  process.exit(1);
}

const files = [].concat(...program.args.map(file => glob.sync(file)));

new SVGIconsDirStream(files, {
  startUnicode: program.startunicode,
  prependUnicode: program.prependUnicode,
  log: program.v ? console.log : function() {}, // eslint-disable-line
})
  .pipe(
    new SVGIcons2SVGFont({
      fontName: program.fontname,
      fontId: program.fontId,
      fixedWidth: program.fixedwidth,
      centerHorizontally: program.centerHorizontally,
      normalize: program.normalize,
      fontHeight: program.height,
      round: program.round,
      descent: program.descent,
      ascent: program.ascent,
      metadata: program.metadata,
      log: program.v ? console.log : function() {}, // eslint-disable-line
    })
  )
  .pipe(program.output ? fs.createWriteStream(program.output) : process.stdout);
