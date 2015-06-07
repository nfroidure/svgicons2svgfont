var fs = require('fs');
var util = require('util');
var path = require('path');

var Readable = require('stream').Readable;

// Inherit of duplex stream
util.inherits(SVGIconsDirStream, Readable);

// Constructor
function SVGIconsDirStream(dir, options) {
  var getMetadata = require('../src/metadata')(options);
  var _this = this;
  var files;

  // Ensure new were used
  if(!(this instanceof SVGIconsDirStream)) {
    return new SVGIconsDirStream(dir, options);
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
      svgIconStream = fs.createReadStream(file);
      var metadata = getMetadata(file);
      svgIconStream.metadata = metadata;
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
