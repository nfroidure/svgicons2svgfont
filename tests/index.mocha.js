var assert = require('assert')
  , svgicons2svgfont = require(__dirname + '/../src/index.js')
  , Fs = require('fs');

// Helper
function generateFont(options, done) {
  options.callback = options.callback || function() {
    assert.equal(
      Fs.readFileSync(__dirname + '/expected/' + options.fontName + '.svg',
        {encoding: 'utf8'}),
      Fs.readFileSync(__dirname + '/results/' + options.fontName + '.svg',
        {encoding: 'utf8'})
    );
    done();
  };
  svgicons2svgfont(Fs.readdirSync(__dirname + '/fixtures/' + options.fontName)
    .map(function(file) {
      return __dirname + '/fixtures/' + options.fontName + '/' + file;
    }), __dirname + '/results/' + options.fontName + '.svg', options);
}

// Tests
describe('Generating fonts', function() {

	it("should work for simple SVG", function(done) {
    generateFont({
      fontName: 'originalicons'
    }, done);
	});

	it("should work for simple SVG", function(done) {
    generateFont({
      fontName: 'cleanicons'
    }, done);
	});

	it("should work for codepoint mapped SVG icons", function(done) {
    generateFont({
      fontName: 'prefixedicons'
    }, done);
	});

	it("should work with multipath SVG icons", function(done) {
    generateFont({
      fontName: 'multipathicons'
    }, done);
	});

	it("should work with simple shapes SVG icons", function(done) {
    generateFont({
      fontName: 'shapeicons'
    }, done);
	});

});
