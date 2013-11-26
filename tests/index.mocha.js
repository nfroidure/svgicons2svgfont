var assert = require('assert')
  , svgicons2svgfont = require(__dirname + '/../src/index.js')
  , Fs = require('fs')
  , StringDecoder = require('string_decoder').StringDecoder;

// Helpers

function generateFontToFile(options, done) {
  var dest = __dirname + '/results/' + options.fontName + '.svg';
  options.callback = options.callback || function() {
    setTimeout(function() {
      assert.equal(
        Fs.readFileSync(__dirname + '/expected/' + options.fontName + '.svg',
          {encoding: 'utf8'}),
        Fs.readFileSync(dest,
          {encoding: 'utf8'})
      );
      done();
    }, 100);
  };
  var stream = svgicons2svgfont(Fs.readdirSync(__dirname + '/fixtures/' + options.fontName)
    .map(function(file) {
      return __dirname + '/fixtures/' + options.fontName + '/' + file;
    }), options);
  stream.pipe(Fs.createWriteStream(dest));
}

function generateFontToMemory(options, done) {
  var content = ''
    , decoder = new StringDecoder('utf8');
  var stream = svgicons2svgfont(Fs.readdirSync(__dirname + '/fixtures/' + options.fontName)
    .map(function(file) {
      return __dirname + '/fixtures/' + options.fontName + '/' + file;
    }), options);
  stream.on('data', function(chunk) {
    content += decoder.write(chunk);
  });
  stream.on('end', function() {
    assert.equal(
      Fs.readFileSync(__dirname + '/expected/' + options.fontName + '.svg',
        {encoding: 'utf8'}),
      content
    );
    done();
  });
}

// Tests
describe('Generating fonts to files', function() {

	it("should work for simple SVG", function(done) {
    generateFontToFile({
      fontName: 'originalicons'
    }, done);
	});

	it("should work for simple SVG", function(done) {
    generateFontToFile({
      fontName: 'cleanicons'
    }, done);
	});

	it("should work for codepoint mapped SVG icons", function(done) {
    generateFontToFile({
      fontName: 'prefixedicons'
    }, done);
	});

	it("should work with multipath SVG icons", function(done) {
    generateFontToFile({
      fontName: 'multipathicons'
    }, done);
	});

	it("should work with simple shapes SVG icons", function(done) {
    generateFontToFile({
      fontName: 'shapeicons'
    }, done);
	});

});

// Tests
describe('Generating fonts to memory', function() {

  it("should work for simple SVG", function(done) {
    generateFontToMemory({
      fontName: 'originalicons'
    }, done);
  });

  it("should work for simple SVG", function(done) {
    generateFontToMemory({
      fontName: 'cleanicons'
    }, done);
  });

  it("should work for codepoint mapped SVG icons", function(done) {
    generateFontToMemory({
      fontName: 'prefixedicons'
    }, done);
  });

  it("should work with multipath SVG icons", function(done) {
    generateFontToMemory({
      fontName: 'multipathicons'
    }, done);
  });

  it("should work with simple shapes SVG icons", function(done) {
    generateFontToMemory({
      fontName: 'shapeicons'
    }, done);
  });

});
