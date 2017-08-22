/* eslint-disable complexity */
'use strict';

const testExpression =
  /(^|\/|\\)(?:((?:u[0-9a-f]{4,6},?)+)-)(.+)\.svg$/i;

function fileSorter(fileA, fileB) {
  let result = 0;

  if(testExpression.test(fileA)) {
    if(testExpression.test(fileB)) {
      if(fileA < fileB) {
        result = -1;
      } else {
        result = 1;
      }
    } else {
      result = -1;
    }
  } else if(testExpression.test(fileB)) {
    result = 1;
  } else if(fileA < fileB) {
    result = -1;
  } else {
    result = 1;
  }
  return result;
}

module.exports = fileSorter;
