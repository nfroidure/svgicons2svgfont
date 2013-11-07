var assert = require('assert')
  , svgicons2svgfont = require(__dirname + '/../src/index.js')
  , Fs = require('fs');

// Helper
function generateFont(options, done) {
  options.callback = options.callback || function() {
    assert.deepEqual(
      Fs.readFileSync(__dirname + '/expected/' + options.fontName + '.svg'),
      Fs.readFileSync(__dirname + '/results/' + options.fontName + '.svg')
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

});
