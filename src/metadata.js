var path = require('path');
var fs = require('fs');

function getMetadataService(options) {
  var usedUnicodes = [];
  // Default options
  options = options || {};
  options.appendUnicode = !!options.appendUnicode;
  options.startUnicode = 'number' === typeof options.startUnicode ?
    options.startUnicode :
    0xEA01;
  options.log = options.log || console.log;
  options.err = options.err || console.err;

  return function getMetadataFromFile(file) {
    var basename = path.basename(file);
    var metadata = {
      name: '',
      unicode: []
    };
    matches = basename.match(/^(?:((?:u[0-9a-f]{4,6},?)+)\-)?(.*).svg$/i);
    metadata.name = matches[2];
    if(matches && matches[1]) {
      metadata.unicode = matches[1].split(',').map(function(match) {
        match = match.substr(1);
        return match.split('u').map(function(code) {
          return String.fromCharCode(parseInt(code, 16));
        }).join('');
      });
      usedUnicodes = usedUnicodes.concat(metadata.unicode);
    } else {
      do {
        metadata.unicode[0] = String.fromCharCode(options.startUnicode++);
      } while(-1 !== usedUnicodes.indexOf(metadata.unicode[0]));
      usedUnicodes.push(metadata.unicode[0]);
      if(options.appendUnicode) {
        fs.rename(file, path.dirname(file) + '/' +
          'u' + metadata.unicode[0].charCodeAt(0).toString(16).toUpperCase() +
          '-' + basename,
          function(err) {
            if(err) {
              options.error(new Error('Could not save codepoint: ' +
                'u' + metadata.unicode[0].charCodeAt(0).toString(16).toUpperCase() +
                ' for ' + basename));
            } else {
              options.log('Saved codepoint: ' +
                'u' + metadata.unicode[0].charCodeAt(0).toString(16).toUpperCase() +
                ' for ' + basename);
            }
          }
        );
      }
    }
    return metadata;
  };

}

module.exports = getMetadataService;
