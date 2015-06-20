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
  var filesInfos;

  // Ensure new were used
  if(!(this instanceof SVGIconsDirStream)) {
    return new SVGIconsDirStream(dir, options);
  }

  if(dir instanceof Array) {
    var dirCopy = dir;
    dir = '';
    _getFilesInfos(dirCopy);
  }

  function _getFilesInfos(files) {
    var filesProcessed = 0;
    filesInfos = [];
    // Ensure prefixed files come first
    files = files.slice(0).sort(function(fileA, fileB) {
      var result = 0;
      if((/(^|\/)(?:((?:u[0-9a-f]{4,6},?)+)\-)(.+)\.svg$/i).test(fileA)) {
        if((/(^|\/)(?:((?:u[0-9a-f]{4,6},?)+)\-)(.+)\.svg$/i).test(fileB)) {
          if(fileA < fileB) {
            result = -1;
          } else {
            result = 1;
          }
        } else {
          result = -1;
        }
      } else {
        if((/(^|\/)(?:((?:u[0-9a-f]{4,6},?)+)\-)(.+)\.svg$/i).test(fileB)) {
          result = 1;
        } else if(fileA < fileB) {
          result = -1;
        } else {
          result = 1;
        }
      }
      return result;
    });
    files.forEach(function(file) {
      getMetadata((dir ? dir + '/' : '') + file, function(err, metadata) {
        filesProcessed++;
        if(err) {
          _this.emit('error', err);
        } else {
          if(metadata.renamed) {
            options.log('Saved codepoint: ' +
              'u' + metadata.unicode[0].charCodeAt(0).toString(16).toUpperCase() +
              ' for the glyph "' + metadata.name + '"');
          }
          filesInfos.push(metadata);
        }
        if(files.length === filesProcessed) {
          // Reorder files
          filesInfos = filesInfos.sort(function(infosA, infosB) {
            return infosA.unicode[0] > infosB.unicode[0] ? 1 : -1;
          });
          _pushSVGIcons();
        }
      });
    });
  }

  function _pushSVGIcons() {
    var fileInfo;
    var matches;
    var svgIconStream;
    while(filesInfos.length) {
      fileInfo = filesInfos.shift();
      svgIconStream = fs.createReadStream(fileInfo.path);
      svgIconStream.metadata = {
        name: fileInfo.name,
        unicode: fileInfo.unicode
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
    if(!filesInfos) {
      fs.readdir(
        dir,
        function(err, files) {
          if(err) {
            _this.emit('error', err);
          }
          _getFilesInfos(files);
        }
      );
    }

  };

}

module.exports = SVGIconsDirStream;
