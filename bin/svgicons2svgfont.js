var svgicons2svgfont = require(__dirname + '/../src/index.js')
  , Fs = require('fs');
svgicons2svgfont(Fs.readdirSync(process.argv[2]).map(function(file) {
  return process.argv[2] + '/' + file;
}), process.argv[3]);
