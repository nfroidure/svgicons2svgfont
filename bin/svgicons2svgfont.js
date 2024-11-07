#! /usr/bin/env node

import { program } from 'commander';
import { createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { argv, exit, stdout } from 'node:process';
import { error } from 'node:console';
import { readFile } from 'node:fs/promises';
import { glob } from 'glob';
import { SVGIcons2SVGFontStream } from '../dist/index.js';
import { SVGIconsDirStream } from '../dist/iconsdir.js';

const { version } = JSON.parse((await readFile(join(import.meta.dirname, '..', 'package.json'))).toString());

program
  .storeOptionsAsProperties(true)
  .version(version)
  .usage('[options] <icons ...>')
  .option('-v, --verbose', 'tell me everything!')
  .option('-o, --output [/dev/stdout]', 'file to write output to')
  .option('-f, --fontName [value]', 'the font family name you want [iconfont]')
  .option('-i, --fontId [value]', 'the font id you want [fontName]')
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
    '-s, --startUnicode [value]',
    'the start unicode code point for' + ' unprefixed files [0xEA01]',
    parseInt
  )
  .option(
    '-u, --prependUnicode',
    'prefix files with their automatically' + ' allocated unicode code point',
    parseInt
  )
  .option('-m, --metadata', 'content of the metadata tag')
  .parse(argv);

if (!program.args.length) {
  error('No icons specified!');
  exit(1);
}

const files = program.args.flatMap((file) => glob.sync(file));
const options = program.opts();

new SVGIconsDirStream(files, {
  startUnicode: options.startUnicode,
  prependUnicode: options.prependUnicode,
})
  .pipe(
    new SVGIcons2SVGFontStream({
      fontName: options.fontName,
      fontId: options.fontId,
      fixedWidth: options.fixedwidth,
      centerHorizontally: options.centerHorizontally,
      centerVertically: options.centerVertically,
      normalize: options.normalize,
      preserveAspectRatio: options.preserveAspectRatio,
      fontHeight: options.height,
      round: options.round,
      descent: options.descent,
      ascent: options.ascent,
      metadata: options.metadata,
    })
  )
  .pipe(options.output ? createWriteStream(options.output) : stdout);
