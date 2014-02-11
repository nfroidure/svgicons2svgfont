# svgicons2svgfont
> svgicons2svgfont is a simple tool to merge multiple icons to an SVG font.

[![NPM version](https://badge.fury.io/js/svgicons2svgfont.png)](https://npmjs.org/package/svgicons2svgfont) [![Build status](https://secure.travis-ci.org/nfroidure/svgicons2svgfont.png)](https://travis-ci.org/nfroidure/svgicons2svgfont) [![Dependency Status](https://david-dm.org/nfroidure/svgicons2svgfont.png)](https://david-dm.org/nfroidure/svgicons2svgfont) [![devDependency Status](https://david-dm.org/nfroidure/svgicons2svgfont/dev-status.png)](https://david-dm.org/nfroidure/svgicons2svgfont#info=devDependencies) [![Coverage Status](https://coveralls.io/repos/nfroidure/svgicons2svgfont/badge.png?branch=master)](https://coveralls.io/r/nfroidure/svgicons2svgfont?branch=master)

'rect', 'line', 'circle', 'ellipsis', 'polyline' and 'polygon' shapes will be
 converted to pathes. Multiple pathes will be merged.

Transform attributes either on 'g' element or path/shapes elements are
 currently unsupported.

## Usage
NodeJS module:
```js
var svgicons2svgfont = require('svgicons2svgfont')
  , fs = require('fs');
  , fontStream = svgicons2svgfont([
    'icons/directory/icon1.svg',
    'icons/directory/icon2.svg'
  ], options);

// Saving in a file
fontStream.pipe(fs.createWriteStream('font/destination/file.svg'))
  .on('finish',function() {
    console.log('Font written !')
  });
```

CLI (install the module globally):
```sh
svgicons2svgfont icons/directory font/destination/file.svg
```

## Options (not plugged to CLI yet)

### fontName : String
The font family name you want (defaults to 'iconfont').

### fixedWidth : Boolean
Creates a monospace font of the width of the largest input icon (defaults to
 false).

### fontHeight : Boolean
The ouputted font height  (defaults to the height of the highest input icon).

### descent : Number
The font descent (defaults to 0). It is usefull to fix the font baseline yourself.

The ascent formula is : ascent = fontHeight - descent.


# [Grunt plugin](https://github.com/nfroidure/grunt-svgicons2svgfont):
```sh
npm install grunt-svgicons2svgfont
```

## Contributing
Feel free to pull your code if you agree with publishing under the MIT license.

