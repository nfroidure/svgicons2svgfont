var assert = require('assert')
  , svgicons2svgfont = require(__dirname + '/../src/index.js')
  , Fs = require('fs')
  , StringDecoder = require('string_decoder').StringDecoder
  , Path = require("path");

// Helpers
function generateFontToFile(options, done) {
  var codepoint = 0xE001
    , dest = __dirname + '/results/' + options.fontName + '.svg'
    , stream = svgicons2svgfont(Fs.readdirSync(__dirname + '/fixtures/' + options.fontName)
      .map(function(file) {
        var matches = file.match(/^(?:u([0-9a-f]{4})\-)?(.*).svg$/i);
        return {
          codepoint: (matches[1] ? parseInt(matches[1], 16) : codepoint++),
          name: matches[2],
          stream: Fs.createReadStream(__dirname + '/fixtures/' + options.fontName + '/' + file)
        };
      }), options);
  stream.pipe(Fs.createWriteStream(dest)).on('finish', function() {
    assert.equal(
      Fs.readFileSync(__dirname + '/expected/' + options.fontName + '.svg',
        {encoding: 'utf8'}),
      Fs.readFileSync(dest,
        {encoding: 'utf8'})
    );
    done();
  });
}

function generateFontToMemory(options, done) {
  var content = ''
    , decoder = new StringDecoder('utf8')
    , codepoint = 0xE001
    , stream = svgicons2svgfont(Fs.readdirSync(__dirname + '/fixtures/' + options.fontName)
      .map(function(file) {
        var matches = file.match(/^(?:u([0-9a-f]{4})\-)?(.*).svg$/i);
        return {
          codepoint: (matches[1] ? parseInt(matches[1], 16) : codepoint++),
          name: matches[2],
          stream: Fs.createReadStream(__dirname + '/fixtures/' + options.fontName + '/' + file)
        };
      }), options);
  stream.on('data', function(chunk) {
    content += decoder.write(chunk);
  });
  stream.on('finish', function() {
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

	it("should work with variable height icons", function(done) {
    generateFontToFile({
      fontName: 'variableheighticons'
    }, done);
	});

});

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

describe('Testing CLI', function() {

  it("should work for simple SVG", function(done) {
    (require('child_process').exec)(
      'node '+__dirname+'../bin/svgicons2svgfont.js '
      + __dirname + '/expected/originalicons.svg '
      + __dirname + '/results/originalicons.svg',
      function() {
        assert.equal(
          Fs.readFileSync(__dirname + '/expected/originalicons.svg',
            {encoding: 'utf8'}),
          Fs.readFileSync(__dirname + '/results/originalicons.svg',
            {encoding: 'utf8'})
        );
        done();
      }
    );
  });

});
