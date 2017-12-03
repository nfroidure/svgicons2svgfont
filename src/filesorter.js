/* eslint-disable complexity */
'use strict';

const testExpression = /(^|\/|\\)(?:((?:u[0-9a-f]{4,6},?)+)-)(.+)\.svg$/i;

function fileSorter(fileA, fileB) {
  let result = 0;

  if (testExpression.test(fileA)) {
    if (testExpression.test(fileB)) {
      // Compare filenames without their .svg extension
      if (
        fileA.substring(0, fileA.length - 4) <
        fileB.substring(0, fileB.length - 4)
      ) {
        result = -1;
      } else {
        result = 1;
      }
    } else {
      result = -1;
    }
  } else if (testExpression.test(fileB)) {
    result = 1;
  } else if (
    fileA.substring(0, fileA.length - 4) < fileB.substring(0, fileB.length - 4)
  ) {
    result = -1;
  } else {
    result = 1;
  }
  return result;
}

module.exports = fileSorter;
