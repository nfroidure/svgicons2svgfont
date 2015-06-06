var fs = require('fs');
var util = require("util");
var path = require("path");

var Readable = require('stream').Readable;

// Inherit of duplex stream
util.inherits(SVGIconsDirStream, Readable);

// Constructor
function SVGIconsDirStream(dir) {
  var _this = this;
  var code = 0xE001;
  var files;

  // Ensure new were used
  if(!(this instanceof SVGIconsDirStream)) {
    return new SVGIconsDirStream(dir);
  }

  if(dir instanceof Array) {
    files = dir;
    dir = '';
  }

  function _pushSVGIcons() {
    var file;
    var matches;
    var svgIconStream;

    while(files.length) {
      file = files.shift();
      matches = path.basename(file).match(/^(?:u([0-9a-f]{4})\-)?(.*).svg$/i);
      svgIconStream = fs.createReadStream(file);
      svgIconStream.metadata = {
        unicode: String.fromCharCode(matches[1] ? parseInt(matches[1], 16) : code++),
        name: matches[2]
      };
      if(!_this.push(svgIconStream)) {
        return;
      }
    }
    _this.push(null);
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
      dir,
      function(err, theFiles) {
        if(err) {
          _this.emit('error', err);
        }
        files = theFiles.map(function(file) {
          return dir + '/' + file;
        });
        _pushSVGIcons();
      }
    );

  };

}

module.exports = SVGIconsDirStream;
