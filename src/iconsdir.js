'use strict';

const fs = require('fs');
const util = require('util');
const fileSorter = require('./filesorter');
const initMetadataService = require('../src/metadata');

const Readable = require('stream').Readable;

require('string.prototype.codepointat');

// Inherit of duplex stream
util.inherits(SVGIconsDirStream, Readable);

// Constructor
function SVGIconsDirStream(dir, options) {
  const _this = this;
  const getMetadata = initMetadataService(options);
  let filesInfos;
  let gotFilesInfos = false;
  let dirCopy;

  // Ensure new were used
  if(!(this instanceof SVGIconsDirStream)) {
    return new SVGIconsDirStream(dir, options);
  }

  if(dir instanceof Array) {
    dirCopy = dir;
    dir = '';
    _getFilesInfos(dirCopy);
  }

  function _getFilesInfos(files) {
    let filesProcessed = 0;

    filesInfos = [];
    // Ensure prefixed files come first
    files = files.slice(0).sort(fileSorter);
    files.forEach((file) => {
      getMetadata((dir ? dir + '/' : '') + file, function(err, metadata) {
        filesProcessed++;
        if(err) {
          _this.emit('error', err);
        } else {
          if(metadata.renamed) {
            options.log('Saved codepoint: ' +
              'u' + metadata.unicode[0].codePointAt(0).toString(16).toUpperCase() +
              ' for the glyph "' + metadata.name + '"');
          }
          filesInfos.push(metadata);
        }
        if(files.length === filesProcessed) {
          // Reorder files
          filesInfos = filesInfos.sort(function(infosA, infosB) {
            return infosA.unicode[0] > infosB.unicode[0] ? 1 : -1;
          });
          // Mark directory as processed
          gotFilesInfos = true;
          // Start processing
          _pushSVGIcons();
        }
      });
    });
  }

  function _pushSVGIcons() {
    let fileInfo;
    let svgIconStream;

    while(filesInfos.length) {
      fileInfo = filesInfos.shift();
      svgIconStream = fs.createReadStream(fileInfo.path);
      svgIconStream.metadata = {
        name: fileInfo.name,
        unicode: fileInfo.unicode,
      };
      if(!_this.push(svgIconStream)) {
        return;
      }
    }
    _this.push(null);
  }

  // Parent constructor
  Readable.call(this, {
    objectMode: true,
  });

  this._read = function() {
    if(!filesInfos) {
      fs.readdir(
        dir,
        (err, files) => {
          if(err) {
            _this.emit('error', err);
          }
          _getFilesInfos(files);
        }
      );
      return;
    }
    if(gotFilesInfos) {
      _pushSVGIcons();
    }
  };

}

module.exports = SVGIconsDirStream;
