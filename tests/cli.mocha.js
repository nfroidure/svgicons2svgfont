var svgicons2svgfont = require(__dirname + '/../src/index.js');
var fs = require('fs');
var assert = require('assert');

describe('Testing CLI', function() {

  it("should work for simple SVG", function(done) {
    (require('child_process').exec)(
      'node ' + __dirname + '/../bin/svgicons2svgfont.js' +
      ' -o ' + __dirname + '/results/originalicons-cli.svg' +
      ' -s 0xE001' +
      ' ' + __dirname + '/fixtures/originalicons/*.svg ',
      function(err) {
        if(err) {
          throw err;
        }
        assert.equal(
          fs.readFileSync(__dirname + '/expected/originalicons-cli.svg',
            {encoding: 'utf8'}),
          fs.readFileSync(__dirname + '/results/originalicons-cli.svg',
            {encoding: 'utf8'})
        );
        done();
      }
    );
  });

});
