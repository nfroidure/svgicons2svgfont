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
          fs.readFileSync(__dirname + '/results/originalicons-cli.svg',
            {encoding: 'utf8'}),
          fs.readFileSync(__dirname + '/expected/originalicons-cli.svg',
            {encoding: 'utf8'})
        );
        done();
      }
    );
  });

  it("should work for more than 32 SVG icons", function(done) {
    (require('child_process').exec)(
      'node ' + __dirname + '/../bin/svgicons2svgfont.js' +
      ' -o ' + __dirname + '/results/lotoficons-cli.svg' +
      ' -s 0xE001' +
      ' ' + __dirname + '/fixtures/cleanicons/*.svg ' +
      ' ' + __dirname + '/fixtures/hiddenpathesicons/*.svg ' +
      ' ' + __dirname + '/fixtures/multipathicons/kikoolol.svg ' +
      ' ' + __dirname + '/fixtures/originalicons/*.svg ' +
      ' ' + __dirname + '/fixtures/realicons/*.svg ' +
      ' ' + __dirname + '/fixtures/roundedcorners/*.svg ' +
      ' ' + __dirname + '/fixtures/shapeicons/*.svg ' +
      ' ' + __dirname + '/fixtures/tocentericons/*.svg ',
      function(err) {
        if(err) {
          throw err;
        }
        assert.equal(
          fs.readFileSync(__dirname + '/results/lotoficons-cli.svg',
            {encoding: 'utf8'}),
          fs.readFileSync(__dirname + '/expected/lotoficons-cli.svg',
            {encoding: 'utf8'})
        );
        done();
      }
    );
  });

  describe("with nested icons", function(done) {

    it("should work", function(done) {

      (require('child_process').exec)(
        'node ' + __dirname + '/../bin/svgicons2svgfont.js' +
        ' -o ' + __dirname + '/results/nestedicons-cli.svg' +
        ' ' + __dirname + '/fixtures/nestedicons/*.svg ',
        function(err) {
          if(err) {
            throw err;
          }
          assert.equal(
            fs.readFileSync(__dirname + '/results/nestedicons-cli.svg',
              {encoding: 'utf8'}),
            fs.readFileSync(__dirname + '/expected/nestedicons-cli.svg',
              {encoding: 'utf8'})
          );
          done();
        }
      );
    });

  });

});
