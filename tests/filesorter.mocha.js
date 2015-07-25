'use strict';

var fileSorter = require('../src/filesorter.js');
var assert = require('assert');

describe('fileSorter', function() {

  it('should sort files per filename', function() {
    assert.deepEqual([
      '/var/plop/c.svg',
      '/var/plop/a.svg',
      '/var/plop/A.svg',
      '/var/plop/C.svg',
      '/var/plop/B.svg',
      '/var/plop/b.svg',
    ].sort(fileSorter), [
      '/var/plop/A.svg',
      '/var/plop/B.svg',
      '/var/plop/C.svg',
      '/var/plop/a.svg',
      '/var/plop/b.svg',
      '/var/plop/c.svg',
    ]);
  });

  it('should sort files per codepoints', function() {
    assert.deepEqual([
      '/var/plop/uAE01-c.svg',
      '/var/plop/uAE03-a.svg',
      '/var/plop/uAE02-A.svg',
      '/var/plop/uAE06-C.svg',
      '/var/plop/uAE04-B.svg',
      '/var/plop/uAE05-b.svg',
    ].sort(fileSorter), [
      '/var/plop/uAE01-c.svg',
      '/var/plop/uAE02-A.svg',
      '/var/plop/uAE03-a.svg',
      '/var/plop/uAE04-B.svg',
      '/var/plop/uAE05-b.svg',
      '/var/plop/uAE06-C.svg',
    ]);
  });

  it('should put codepoints first', function() {
    assert.deepEqual([
      '/var/plop/uAE01-c.svg',
      '/var/plop/uAE03-a.svg',
      '/var/plop/uAE02-A.svg',
      '/var/plop/C.svg',
      '/var/plop/B.svg',
      '/var/plop/b.svg',
    ].sort(fileSorter), [
      '/var/plop/uAE01-c.svg',
      '/var/plop/uAE02-A.svg',
      '/var/plop/uAE03-a.svg',
      '/var/plop/B.svg',
      '/var/plop/C.svg',
      '/var/plop/b.svg',
    ]);
  });

});
