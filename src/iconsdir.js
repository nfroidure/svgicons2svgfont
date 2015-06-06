var fs = require('fs');
var util = require("util");
var Readable = require('stream').Readable;


// Inherit of duplex stream
util.inherits(SVGIconsDirStream, Readable);

// Constructor
function SVGIconsDirStream(path) {
  var _this = this;
  var codepoint = 0xE001;
  var files;

  function _pushSVGIcons() {
    var file;
    var matches;
    var svgIconStream;

    while(files.length) {
      file = files.shift();
      matches = file.match(/^(?:u([0-9a-f]{4})\-)?(.*).svg$/i);
      svgIconStream = fs.createReadStream(path + '/' + file);
      svgIconStream.metadata = {
        codepoint: (matches[1] ? parseInt(matches[1], 16) : codepoint++),
        name: matches[2]
      };
      if(!_this.push(svgIconStream)) {
        return;
      }
    }
    _this.push(null);
  }

  // Ensure new were used
  if(!(this instanceof SVGIconsDirStream)) {
    return new SVGIconsDirStream(path);
  }

  // Parent constructor
  Readable.call(this, {
    objectMode: true
  });

  this._read = function() {
    if(files) {
      _pushSVGIcons();
      return;
    }
    fs.readdir(
      path,
      function(err, theFiles) {
        files = theFiles;
        _pushSVGIcons();
      }
    );

  };

}

module.exports = SVGIconsDirStream;
