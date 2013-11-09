svgicons2svgfont [![Build Status](https://travis-ci.org/nfroidure/svgicons2svgfont.png?branch=master)](https://travis-ci.org/nfroidure/svgicons2svgfont)
============
svgicons2svgfont is a simple tool to merge multiple icons to an SVG font.

'rect', 'line', 'circle', 'ellipsis', 'polyline' and 'polygon' shapes will be
 converted to pathes. Multiple pathes will be merged.

Transform attributes either on 'g' element or path/shapes elements are
 currently unsupported.

Usage
-------------
NodeJS module :
```js
var svgicons2svgfont = require('svgicons2svgfont');
svgicons2svgfont([
    'icons/directory/icon1.svg',
    'icons/directory/icon2.svg'
  ],
  'font/destination/file.svg',
  options);
```
CLI (install the module globally) :
```sh
svgicons2svgfont icons/directory font/destination/file.svg
```

[Grunt plugin](https://github.com/nfroidure/grunt-svgicons2svgfont) :
̀``sh
npm install grunt-svgicons2svgfont
```

Contributing
-------------
Feel free to pull your code if you agree with publishing under the MIT license.

