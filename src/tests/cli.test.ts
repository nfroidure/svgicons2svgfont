import { describe, test, expect } from '@jest/globals';
import { readFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

try {
  await mkdir(join('src', 'tests', 'results'));
} catch (err) {
  // empty
}

describe('Testing CLI', () => {
  test('should work for simple SVG', async () => {
    const command =
      `${'node' + ' '}${join('bin', 'svgicons2svgfont.js')} -o ${join(
        'src',
        'tests',
        'results',
        'originalicons-cli.svg',
      )} -s 0xE001` +
      ` ${join('src', 'tests', 'fixtures', 'originalicons', '*.svg')}`;

    await promisify(exec)(command);

    expect(
      await readFile(join('src', 'tests', 'results', 'originalicons-cli.svg'), {
        encoding: 'utf8',
      }),
    ).toEqual(
      await readFile(
        join('src', 'tests', 'expected', 'originalicons-cli.svg'),
        { encoding: 'utf8' },
      ),
    );
  });

  test('should work for more than 32 SVG icons', async () => {
    const command =
      'node' +
      ' ' +
      join('bin', 'svgicons2svgfont.js') +
      ' -o ' +
      join('src', 'tests', 'results', 'lotoficons-cli.svg') +
      ' -s 0xE001' +
      ' -r 1e4' +
      ' ' +
      join('src', 'tests', 'fixtures', 'cleanicons', '*.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'hiddenpathesicons', '*.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'multipathicons', 'kikoolol.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'originalicons', '*.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'realicons', '*.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'roundedcorners', '*.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'shapeicons', '*.svg') +
      ' ' +
      join('src', 'tests', 'fixtures', 'tocentericons', '*.svg');

    await promisify(exec)(command);

    expect(
      await readFile(join('src', 'tests', 'results', 'lotoficons-cli.svg'), {
        encoding: 'utf8',
      }),
    ).toEqual(
      await readFile(join('src', 'tests', 'expected', 'lotoficons-cli.svg'), {
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
        'src',
        'tests',
        'results',
        'nestedicons-cli.svg',
      )} ${join('src', 'tests', 'fixtures', 'nestedicons', '*.svg')}`;

      await promisify(exec)(command);

      expect(
        await readFile(join('src', 'tests', 'results', 'nestedicons-cli.svg'), {
          encoding: 'utf8',
        }),
      ).toEqual(
        await readFile(
          join('src', 'tests', 'expected', 'nestedicons-cli.svg'),
          { encoding: 'utf8' },
        ),
      );
    });
  });
});
