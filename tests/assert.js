const assert = require('assert');

const textEquals = (actual, expected) => {
  assert.equal(actual.replace(/\r/g, ''), expected.replace(/\r/g, ''));
};

module.exports = { textEquals };
