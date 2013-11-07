svgicons2svgfont [![Build Status](https://travis-ci.org/nfroidure/svgicons2svgfont.png?branch=master)](https://travis-ci.org/nfroidure/svgicons2svgfont)
============
svgicons2svgfont is a simple tool to merge multiple icons to a SVG font.

*This library currently only works with SVG files containing only one path.
 More wider support is coming ;).*

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

Contributing
-------------
Feel free to pull your code if you agree with publishing under the MIT license.

