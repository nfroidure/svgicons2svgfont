var assert = require('assert');
var fs = require('fs');

var SVGIcons2SVGFontStream = require(__dirname + '/../src/index.js');
var StringDecoder = require('string_decoder').StringDecoder;
var SVGIconsDirStream = require(__dirname + '/../src/iconsdir');

// Helpers
function generateFontToFile(options, done, fileSuffix) {
  var dest = __dirname + '/results/' + options.fontName +
    (fileSuffix || '') + '.svg';
  var svgFontStream = SVGIcons2SVGFontStream(options);

  svgFontStream.pipe(fs.createWriteStream(dest)).on('finish', function() {
    assert.equal(
      fs.readFileSync(__dirname + '/expected/' + options.fontName +
        (fileSuffix || '') + '.svg',
        {encoding: 'utf8'}),
      fs.readFileSync(dest,
        {encoding: 'utf8'})
    );
    done();
  });

  SVGIconsDirStream(__dirname + '/fixtures/' + options.fontName, {
    startUnicode: 0xE001
  })
    .pipe(svgFontStream);
}

function generateFontToMemory(options, done) {
  var content = '';
  var decoder = new StringDecoder('utf8');
  var svgFontStream = SVGIcons2SVGFontStream(options);

  svgFontStream.on('data', function(chunk) {
    content += decoder.write(chunk);
  });

  svgFontStream.on('finish', function() {
    assert.equal(
      fs.readFileSync(__dirname + '/expected/' + options.fontName + '.svg',
        {encoding: 'utf8'}),
      content
    );
    done();
  });

  SVGIconsDirStream(__dirname + '/fixtures/' + options.fontName, {
    startUnicode: 0xE001
  })
    .pipe(svgFontStream);

}

// Tests
describe('Generating fonts to files', function() {

  it("should work for simple SVG", function(done) {
    generateFontToFile({
      fontName: 'originalicons'
    }, done);
  });

  it("should work for simple fixedWidth and normalize option", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      fixedWidth: true,
      normalize: true
    }, done, 'n');
  });

  it("should work for simple SVG", function(done) {
    generateFontToFile({
      fontName: 'cleanicons'
    }, done);
  });

  it("should work for codepoint mapped SVG icons", function(done) {
    generateFontToFile({
      fontName: 'prefixedicons',
      callback: function(){}
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

  it("should work with variable height icons and the normalize option", function(done) {
    generateFontToFile({
      fontName: 'variableheighticons',
      normalize: true
    }, done, 'n');
  });

  it("should work with variable width icons", function(done) {
    generateFontToFile({
      fontName: 'variablewidthicons'
    }, done);
  });

  it("should work with centered variable width icons and the fixed width option", function(done) {
    generateFontToFile({
      fontName: 'variablewidthicons',
      fixedWidth: true,
      centerHorizontally: true
    }, done, 'n');
  });

  it("should not display hidden pathes", function(done) {
    generateFontToFile({
      fontName: 'hiddenpathesicons'
    }, done);
  });

  it("should work with real world icons", function(done) {
    generateFontToFile({
      fontName: 'realicons'
    }, done);
  });

  it("should work with rendering test SVG icons", function(done) {
    generateFontToFile({
      fontName: 'rendricons'
    }, done);
  });

  it("should work with a single SVG icon", function(done) {
    generateFontToFile({
      fontName: 'singleicon'
    }, done);
  });

  it("should work with transformed SVG icons", function(done) {
    generateFontToFile({
      fontName: 'transformedicons'
    }, done);
  });

  it("should work when horizontally centering SVG icons", function(done) {
    generateFontToFile({
      fontName: 'tocentericons',
      centerHorizontally: true
    }, done);
  });

  it("should work with a icons with path with fill none", function(done) {
    generateFontToFile({
      fontName: 'pathfillnone'
    }, done);
  });

  it("should work with shapes with rounded corners", function(done) {
    generateFontToFile({
      fontName: 'roundedcorners'
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

describe('Using options', function() {

  it("should work with fixedWidth option set to true", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      fixedWidth: true
    }, done, '2');
  });

  it("should work with custom fontHeight option", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      fontHeight: 800
    }, done, '3');
  });

  it("should work with custom descent option", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      descent: 200
    }, done, '4');
  });

  it("should work with fixedWidth set to true and with custom fontHeight option", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      fontHeight: 800,
      fixedWidth: true
    }, done, '5');
  });

  it("should work with fixedWidth and centerHorizontally set to true and with custom fontHeight option", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      fontHeight: 800,
      fixedWidth: true,
      centerHorizontally: true
    }, done, '6');
  });

  it("should work with fixedWidth, normalize and centerHorizontally set to true and with custom fontHeight option", function(done) {
    generateFontToFile({
      fontName: 'originalicons',
      fontHeight: 800,
      normalize: true,
      fixedWidth: true,
      centerHorizontally: true
    }, done, '7');
  });

});

describe('Using multiple unicode values for a single icon', function() {

  it("should work", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
      name: 'account',
      unicode: ['\uE001', '\uE002']
    };

    var svgFontStream = SVGIcons2SVGFontStream();
    var content = '';
    var decoder = new StringDecoder('utf8');

    svgFontStream.on('data', function(chunk) {
      content += decoder.write(chunk);
    });

    svgFontStream.on('finish', function() {
      assert.equal(
        fs.readFileSync(__dirname + '/expected/cleanicons-multi.svg',
          {encoding: 'utf8'}),
        content
      );
      done();
    });
    svgFontStream.write(svgIconStream);
    svgFontStream.end();
  });

});

describe('Using ligatures', function() {

  it("should work", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
      name: 'account',
      unicode: ['\uE001\uE002']
    };

    var svgFontStream = SVGIcons2SVGFontStream();
    var content = '';
    var decoder = new StringDecoder('utf8');

    svgFontStream.on('data', function(chunk) {
      content += decoder.write(chunk);
    });

    svgFontStream.on('finish', function() {
      assert.equal(
        fs.readFileSync(__dirname + '/expected/cleanicons-lig.svg',
          {encoding: 'utf8'}),
        content
      );
      done();
    });
    svgFontStream.write(svgIconStream);
    svgFontStream.end();
  });

});

describe('Providing bad glyphs', function() {

  it("should fail when not providing glyph name", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
      unicode: '\uE001'
    };
    SVGIcons2SVGFontStream().on('error', function(err) {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'Please provide a name for the glyph at index 0');
      done();
    }).write(svgIconStream);
  });

  it("should fail when not providing codepoints", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
        name: 'test'
    };
    SVGIcons2SVGFontStream().on('error', function(err) {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'Please provide a codepoint for the glyph "test"');
      done();
    }).write(svgIconStream);
  });

  it("should fail when providing unicode value with duplicates", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
        name: 'test',
        unicode: ['\uE002','\uE002']
    };
    SVGIcons2SVGFontStream().on('error', function(err) {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'Given codepoints for the glyph "test" contain duplicates.');
      done();
    }).write(svgIconStream);
  });

  it("should fail when providing the same codepoint twice", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
        name: 'test',
        unicode: '\uE002'
    };
    var svgIconStream2 = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream2.metadata = {
        name: 'test2',
        unicode: '\uE002'
    };
    var svgFontStream = SVGIcons2SVGFontStream();
    svgFontStream.on('error', function(err) {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'The glyph "test2" codepoint seems to be used already elsewhere.');
      done();
    });
    svgFontStream.write(svgIconStream);
    svgFontStream.write(svgIconStream2);
  });

  it("should fail when providing the same name twice", function(done) {
    var svgIconStream = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream.metadata = {
        name: 'test',
        unicode: '\uE001'
    };
    var svgIconStream2 = fs.createReadStream(__dirname + '/fixtures/cleanicons/account.svg');
    svgIconStream2.metadata = {
        name: 'test',
        unicode: '\uE002'
    };
    var svgFontStream = SVGIcons2SVGFontStream();
    svgFontStream.on('error', function(err) {
      assert.equal(err instanceof Error, true);
      assert.equal(err.message, 'The glyph name "test" must be unique.');
      done();
    });
    svgFontStream.write(svgIconStream);
    svgFontStream.write(svgIconStream2);
  });

});
