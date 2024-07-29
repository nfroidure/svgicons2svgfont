import { describe, test, expect } from '@jest/globals';
import { fileSorter } from '../filesorter.js';

describe('fileSorter', () => {
  test('should sort files per filename', () => {
    expect(
      [
        '/var/plop/c.svg',
        '/var/plop/a.svg',
        '/var/plop/A.svg',
        '/var/plop/C.svg',
        '/var/plop/B.svg',
        '/var/plop/b.svg',
      ].sort(fileSorter),
    ).toEqual([
      '/var/plop/A.svg',
      '/var/plop/B.svg',
      '/var/plop/C.svg',
      '/var/plop/a.svg',
      '/var/plop/b.svg',
      '/var/plop/c.svg',
    ]);
  });

  test('should sort files per codepoints', () => {
    expect(
      [
        '/var/plop/uAE01-c.svg',
        '/var/plop/uAE03-a.svg',
        '/var/plop/uAE02-A.svg',
        '/var/plop/uAE06-C.svg',
        '/var/plop/uAE04-B.svg',
        '/var/plop/uAE05-b.svg',
      ].sort(fileSorter),
    ).toEqual([
      '/var/plop/uAE01-c.svg',
      '/var/plop/uAE02-A.svg',
      '/var/plop/uAE03-a.svg',
      '/var/plop/uAE04-B.svg',
      '/var/plop/uAE05-b.svg',
      '/var/plop/uAE06-C.svg',
    ]);
  });

  test('should put codepoints first', () => {
    expect(
      [
        '/var/plop/uAE01-c.svg',
        '/var/plop/uAE03-a.svg',
        '/var/plop/uAE02-A.svg',
        '/var/plop/C.svg',
        '/var/plop/B.svg',
        '/var/plop/b.svg',
      ].sort(fileSorter),
    ).toEqual([
      '/var/plop/uAE01-c.svg',
      '/var/plop/uAE02-A.svg',
      '/var/plop/uAE03-a.svg',
      '/var/plop/B.svg',
      '/var/plop/C.svg',
      '/var/plop/b.svg',
    ]);
  });

  test('should work with the @pinin files', () => {
    expect(
      [
        'bell-disabled.svg',
        'bell-disabled-o.svg',
        'bell-o.svg',
        'UEA01-calendar-agenda.svg',
        'UEA02-calendar-alert.svg',
        'UEA03-calendar.svg',
        'uEA04-bookmark-favorite.svg',
        'uEA05-bookmark-o.svg',
        'uEA06-bookmark.svg',
      ].sort(fileSorter),
    ).toEqual([
      'UEA01-calendar-agenda.svg',
      'UEA02-calendar-alert.svg',
      'UEA03-calendar.svg',
      'uEA04-bookmark-favorite.svg',
      'uEA05-bookmark-o.svg',
      'uEA06-bookmark.svg',
      'bell-disabled.svg',
      'bell-disabled-o.svg',
      'bell-o.svg',
    ]);
  });
});
