var svgicons2svgfont = require(__dirname + '/../src/index.js');
var fs = require('fs');
var assert = require('assert');

describe('Testing CLI', function() {

  it("should work for simple SVG", function(done) {
    (require('child_process').exec)(
      'node ' + __dirname + '/../bin/svgicons2svgfont.js ' +
      __dirname + '/fixtures/originalicons ' +
      __dirname + '/results/originalicons-cli.svg',
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
