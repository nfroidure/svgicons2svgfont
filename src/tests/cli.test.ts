import { describe, test, expect } from '@jest/globals';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

describe('Testing CLI', () => {
  test('should work for simple SVG', async () => {
    const command =
      `${'node' + ' '}${path.join('bin', 'svgicons2svgfont.js')} -o ${path.join(
        'src',
        'tests',
        'results',
        'originalicons-cli.svg',
      )} -s 0xE001` +
      ` ${path.join('src', 'tests', 'fixtures', 'originalicons', '*.svg')}`;

    await promisify(exec)(command);

    expect(
      await readFile(
        path.join('src', 'tests', 'results', 'originalicons-cli.svg'),
        { encoding: 'utf8' },
      ),
    ).toEqual(
      await readFile(
        path.join('src', 'tests', 'expected', 'originalicons-cli.svg'),
        { encoding: 'utf8' },
      ),
    );
  });

  test('should work for more than 32 SVG icons', async () => {
    const command =
      'node' +
      ' ' +
      path.join('bin', 'svgicons2svgfont.js') +
      ' -o ' +
      path.join('src', 'tests', 'results', 'lotoficons-cli.svg') +
      ' -s 0xE001' +
      ' -r 1e4' +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'cleanicons', '*.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'hiddenpathesicons', '*.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'multipathicons', 'kikoolol.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'originalicons', '*.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'realicons', '*.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'roundedcorners', '*.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'shapeicons', '*.svg') +
      ' ' +
      path.join('src', 'tests', 'fixtures', 'tocentericons', '*.svg');

    await promisify(exec)(command);

    expect(
      await readFile(
        path.join('src', 'tests', 'results', 'lotoficons-cli.svg'),
        {
          encoding: 'utf8',
        },
      ),
    ).toEqual(
      await readFile(
        path.join('src', 'tests', 'expected', 'lotoficons-cli.svg'),
        { encoding: 'utf8' },
      ),
    );
  });

  describe('with nested icons', () => {
    test('should work', async () => {
      const command = `${'node' + ' '}${path.join(
        'bin',
        'svgicons2svgfont.js',
      )} -o ${path.join(
        'src',
        'tests',
        'results',
        'nestedicons-cli.svg',
      )} ${path.join('src', 'tests', 'fixtures', 'nestedicons', '*.svg')}`;

      await promisify(exec)(command);

      expect(
        await readFile(
          path.join('src', 'tests', 'results', 'nestedicons-cli.svg'),
          { encoding: 'utf8' },
        ),
      ).toEqual(
        await readFile(
          path.join('src', 'tests', 'expected', 'nestedicons-cli.svg'),
          { encoding: 'utf8' },
        ),
      );
    });
  });
});
