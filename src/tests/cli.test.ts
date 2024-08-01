import { describe, test, expect } from '@jest/globals';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

try {
  await mkdir(join('fixtures', 'results'));
} catch (err) {
  // empty
}

describe('Testing CLI', () => {
  test('should work for simple SVG', async () => {
    const command =
      `${'node' + ' '}${join('bin', 'svgicons2svgfont.js')} -o ${join(
        'fixtures',
        'results',
        'originalicons-cli.svg',
      )} -s 0xE001` + ` ${join('fixtures', 'icons', 'originalicons', '*.svg')}`;

    await promisify(exec)(command);

    expect(
      await readFile(join('fixtures', 'results', 'originalicons-cli.svg'), {
        encoding: 'utf8',
      }),
    ).toEqual(
      await readFile(join('fixtures', 'expected', 'originalicons-cli.svg'), {
        encoding: 'utf8',
      }),
    );
  });

  test('should work for more than 32 SVG icons', async () => {
    const command =
      'node' +
      ' ' +
      join('bin', 'svgicons2svgfont.js') +
      ' -o ' +
      join('fixtures', 'results', 'lotoficons-cli.svg') +
      ' -s 0xE001' +
      ' -r 1e4' +
      ' ' +
      join('fixtures', 'icons', 'cleanicons', '*.svg') +
      ' ' +
      join('fixtures', 'icons', 'hiddenpathesicons', '*.svg') +
      ' ' +
      join('fixtures', 'icons', 'multipathicons', 'kikoolol.svg') +
      ' ' +
      join('fixtures', 'icons', 'originalicons', '*.svg') +
      ' ' +
      join('fixtures', 'icons', 'realicons', '*.svg') +
      ' ' +
      join('fixtures', 'icons', 'roundedcorners', '*.svg') +
      ' ' +
      join('fixtures', 'icons', 'shapeicons', '*.svg') +
      ' ' +
      join('fixtures', 'icons', 'tocentericons', '*.svg');

    await promisify(exec)(command);

    expect(
      await readFile(join('fixtures', 'results', 'lotoficons-cli.svg'), {
        encoding: 'utf8',
      }),
    ).toEqual(
      await readFile(join('fixtures', 'expected', 'lotoficons-cli.svg'), {
        encoding: 'utf8',
      }),
    );
  });

  describe('with nested icons', () => {
    test('should work', async () => {
      const command = `${'node' + ' '}${join(
        'bin',
        'svgicons2svgfont.js',
      )} -o ${join(
        'fixtures',
        'results',
        'nestedicons-cli.svg',
      )} ${join('fixtures', 'icons', 'nestedicons', '*.svg')}`;

      await promisify(exec)(command);

      expect(
        await readFile(join('fixtures', 'results', 'nestedicons-cli.svg'), {
          encoding: 'utf8',
        }),
      ).toEqual(
        await readFile(join('fixtures', 'expected', 'nestedicons-cli.svg'), {
          encoding: 'utf8',
        }),
      );
    });
  });
});
