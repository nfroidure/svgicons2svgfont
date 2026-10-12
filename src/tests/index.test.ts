import { describe, test, expect } from '@jest/globals';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import {
  SVGIcons2SVGFontStream,
  type SVGIcons2SVGFontStreamOptions,
} from '../index.js';
import { SVGIconsDirStream, type SVGIconStream } from '../iconsdir.js';
import streamtest from 'streamtest';
import { BufferStream } from 'bufferstreams';
import { SVGPathData } from 'svg-pathdata';

try {
  await mkdir(join('fixtures', 'results'));
} catch {
  // empty
}

const codepoint = JSON.parse(
  fs.readFileSync('./fixtures/expected/test-codepoint.json').toString(),
);

// Helpers
async function generateFontToFile(
  options: Partial<SVGIcons2SVGFontStreamOptions>,
  fileSuffix?: string,
  startUnicode?: number,
  files?: string[],
) {
  const dest = join(
    'fixtures',
    'results',
    `${options.fontName + (fileSuffix || '')}.svg`,
  );
  let resolve: (value: unknown) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });

  options.round = options.round || 1e3;

  const svgFontStream = new SVGIcons2SVGFontStream(options);

  svgFontStream.pipe(fs.createWriteStream(dest)).on('finish', () => {
    try {
      expect(fs.readFileSync(dest, { encoding: 'utf8' })).toEqual(
        fs.readFileSync(
          join(
            'fixtures',
            'expected',
            `${options.fontName + (fileSuffix || '')}.svg`,
          ),
          { encoding: 'utf8' },
        ),
      );
      resolve(undefined);
    } catch (err) {
      reject(err);
    }
  });

  new SVGIconsDirStream(
    files || join('fixtures', 'icons', options.fontName as string),
    {
      startUnicode: startUnicode || 0xe001,
    },
  ).pipe(svgFontStream);

  return await promise;
}

async function generateFontToMemory(
  options: Partial<SVGIcons2SVGFontStreamOptions>,
  files?: string[],
  startUnicode?: number,
) {
  options.round = options.round || 1e3;

  options.callback = (glyphs) => {
    const fontName = options.fontName as string;

    expect(glyphs).toEqual(codepoint[fontName]);
  };

  const svgFontStream = new SVGIcons2SVGFontStream(options);
  const promise = bufferStream(svgFontStream);

  new SVGIconsDirStream(
    files || join('fixtures', 'icons', options.fontName as string),
    {
      startUnicode: startUnicode || 0xe001,
    },
  ).pipe(svgFontStream);

  expect((await promise).toString()).toEqual(
    fs.readFileSync(join('fixtures', 'expected', `${options.fontName}.svg`), {
      encoding: 'utf8',
    }),
  );
}

// Tests
describe('Generating fonts to files', () => {
  test('should work for simple SVG', async () => {
    await generateFontToFile({
      fontName: 'originalicons',
    });
  });

  test('should work for simple fixedWidth and normalize option', async () => {
    await generateFontToFile(
      {
        fontName: 'originalicons',
        fixedWidth: true,
        normalize: true,
      },
      'n',
    );
  });

  test('should work for simple SVG', async () => {
    await generateFontToFile({
      fontName: 'cleanicons',
    });
  });

  test('should work for simple SVG and custom ascent', async () => {
    await generateFontToFile(
      {
        fontName: 'cleanicons',
        ascent: 100,
      },
      '-ascent',
    );
  });

  test('should work for simple SVG and custom properties', async () => {
    await generateFontToFile(
      {
        fontName: 'cleanicons',
        fontStyle: 'italic',
        fontWeight: 'bold',
      },
      '-stw',
    );
  });

  test('should work for codepoint mapped SVG icons', async () => {
    await generateFontToFile({
      fontName: 'prefixedicons',
      callback: () => undefined,
    });
  });

  test('should work with multipath SVG icons', async () => {
    await generateFontToFile({
      fontName: 'multipathicons',
    });
  });

  test('should work with simple shapes SVG icons', async () => {
    await generateFontToFile({
      fontName: 'shapeicons',
    });
  });

  test('should work with variable height icons', async () => {
    await generateFontToFile({
      fontName: 'variableheighticons',
    });
  });

  test('should work with variable height icons and the normalize option', async () => {
    await generateFontToFile(
      {
        fontName: 'variableheighticons',
        normalize: true,
      },
      'n',
    );
  });

  test('should work with variable height icons, the normalize option and the preserveAspectRatio option', async () => {
    await generateFontToFile(
      {
        fontName: 'variableheighticons',
        normalize: true,
        preserveAspectRatio: true,
      },
      'np',
    );
  });

  test('should work with variable width icons', async () => {
    await generateFontToFile({
      fontName: 'variablewidthicons',
    });
  });

  test('should work with centered variable width icons and the fixed width option', async () => {
    await generateFontToFile(
      {
        fontName: 'variablewidthicons',
        fixedWidth: true,
        centerHorizontally: true,
      },
      'n',
    );
  });

  test('should calculate bounds when not specified in the svg file', async () => {
    await generateFontToFile({
      fontName: 'calcbounds',
    });
  });

  test('should work with a font id', async () => {
    await generateFontToFile(
      {
        fontName: 'variablewidthicons',
        fixedWidth: true,
        centerHorizontally: true,
        fontId: 'plop',
      },
      'id',
    );
  });

  test('should work with scaled icons', async () => {
    await generateFontToFile({
      fontName: 'scaledicons',
      fixedWidth: true,
      centerHorizontally: true,
      fontId: 'plop',
    });
  });

  test('should not display hidden paths', async () => {
    await generateFontToFile({
      fontName: 'hiddenpathesicons',
    });
  });

  test('should work with real world icons', async () => {
    await generateFontToFile({
      fontName: 'realicons',
    });
  });

  test('should work with rendering test SVG icons', async () => {
    await generateFontToFile({
      fontName: 'rendricons',
    });
  });

  test('should work with a single SVG icon', async () => {
    await generateFontToFile({
      fontName: 'singleicon',
    });
  });

  test('should work with transformed SVG icons', async () => {
    await generateFontToFile({
      fontName: 'transformedicons',
    });
  });

  test('should work when horizontally centering SVG icons', async () => {
    await generateFontToFile({
      fontName: 'tocentericons',
      centerHorizontally: true,
    });
  });

  test('should work when vertically centering SVG icons', async () => {
    await generateFontToFile({
      fontName: 'toverticalcentericons',
      centerVertically: true,
    });
  });

  test('should work with a icons with path with fill none', async () => {
    await generateFontToFile({
      fontName: 'pathfillnone',
    });
  });

  test('should work with shapes with rounded corners', async () => {
    await generateFontToFile({
      fontName: 'roundedcorners',
    });
  });

  test('should work with realworld icons', async () => {
    await generateFontToFile({
      fontName: 'realworld',
    });
  });

  test('should work with a lot of icons', async () => {
    await generateFontToFile(
      {
        fontName: 'lotoficons',
      },
      '',
      0,
      [
        'fixtures/icons/cleanicons/account.svg',
        'fixtures/icons/cleanicons/arrow-down.svg',
        'fixtures/icons/cleanicons/arrow-left.svg',
        'fixtures/icons/cleanicons/arrow-right.svg',
        'fixtures/icons/cleanicons/arrow-up.svg',
        'fixtures/icons/cleanicons/basket.svg',
        'fixtures/icons/cleanicons/close.svg',
        'fixtures/icons/cleanicons/minus.svg',
        'fixtures/icons/cleanicons/plus.svg',
        'fixtures/icons/cleanicons/search.svg',
        'fixtures/icons/hiddenpathesicons/sound--off.svg',
        'fixtures/icons/hiddenpathesicons/sound--on.svg',
        'fixtures/icons/multipathicons/kikoolol.svg',
        'fixtures/icons/originalicons/mute.svg',
        'fixtures/icons/originalicons/sound.svg',
        'fixtures/icons/originalicons/speaker.svg',
        'fixtures/icons/realicons/diegoliv.svg',
        'fixtures/icons/realicons/hannesjohansson.svg',
        'fixtures/icons/realicons/roelvanhitum.svg',
        'fixtures/icons/realicons/safety-icon.svg',
        'fixtures/icons/realicons/sb-icon.svg',
        'fixtures/icons/realicons/settings-icon.svg',
        'fixtures/icons/realicons/track-icon.svg',
        'fixtures/icons/realicons/web-icon.svg',
        'fixtures/icons/roundedcorners/roundedrect.svg',
        'fixtures/icons/shapeicons/circle.svg',
        'fixtures/icons/shapeicons/ellipse.svg',
        'fixtures/icons/shapeicons/lines.svg',
        'fixtures/icons/shapeicons/polygon.svg',
        'fixtures/icons/shapeicons/polyline.svg',
        'fixtures/icons/shapeicons/rect.svg',
        'fixtures/icons/tocentericons/bottomleft.svg',
        'fixtures/icons/tocentericons/center.svg',
        'fixtures/icons/tocentericons/topright.svg',
      ],
    );
  });

  test('should work with rotated rectangle icon', async () => {
    await generateFontToFile({
      fontName: 'rotatedrectangle',
    });
  });

  /**
   * Issue #6
   * icon by @paesku
   * https://github.com/nfroidure/svgicons2svgfont/issues/6#issuecomment-125545925
   */
  test('should work with complicated nested transforms', async () => {
    await generateFontToFile({
      fontName: 'paesku',
      round: 1e3,
    });
  });

  /**
   * Issue #76
   * https://github.com/nfroidure/svgicons2svgfont/issues/76#issue-259831969
   */
  test('should work with transform=translate(x) without y', async () => {
    await generateFontToFile({
      fontName: 'translatex',
      round: 1e3,
    });
  });

  test('should work with skew', async () => {
    await generateFontToFile({
      fontName: 'skew',
    });
  });

  test('should work when only rx is present', async () => {
    await generateFontToFile({
      fontName: 'onlywithrx',
    });
  });

  test('should work when only ry is present', async () => {
    await generateFontToFile({
      fontName: 'onlywithry',
    });
  });

  test('should keep the holes of evenodd paths', async () => {
    await generateFontToFile({
      fontName: 'evenoddicons',
    });
  });
});

describe('Generating fonts to memory', () => {
  test('should work for simple SVG', async () => {
    await generateFontToMemory({
      fontName: 'originalicons',
    });
  });

  test('should work for simple SVG', async () => {
    await generateFontToMemory({
      fontName: 'cleanicons',
    });
  });

  test('should work for codepoint mapped SVG icons', async () => {
    await generateFontToMemory({
      fontName: 'prefixedicons',
    });
  });

  test('should work with multipath SVG icons', async () => {
    await generateFontToMemory({
      fontName: 'multipathicons',
    });
  });

  test('should work with simple shapes SVG icons', async () => {
    await generateFontToMemory({
      fontName: 'shapeicons',
    });
  });
});

describe('Using options', () => {
  test('should work with fixedWidth option set to true', async () => {
    await generateFontToFile(
      {
        fontName: 'originalicons',
        fixedWidth: true,
      },
      '2',
    );
  });

  test('should work with custom fontHeight option', async () => {
    await generateFontToFile(
      {
        fontName: 'originalicons',
        fontHeight: 800,
      },
      '3',
    );
  });

  test('should work with custom descent option', async () => {
    await generateFontToFile(
      {
        fontName: 'originalicons',
        descent: 200,
      },
      '4',
    );
  });

  test('should work with fixedWidth set to true and with custom fontHeight option', async () => {
    await generateFontToFile(
      {
        fontName: 'originalicons',
        fontHeight: 800,
        fixedWidth: true,
      },
      '5',
    );
  });

  test(
    'should work with fixedWidth and centerHorizontally set to true and with' +
      ' custom fontHeight option',
    async () => {
      await generateFontToFile(
        {
          fontName: 'originalicons',
          fontHeight: 800,
          fixedWidth: true,
          centerHorizontally: true,
          round: 1e5,
        },

        '6',
      );
    },
  );

  test(
    'should work with fixedWidth, normalize and centerHorizontally set to' +
      ' true and with custom fontHeight option',
    async () => {
      await generateFontToFile(
        {
          fontName: 'originalicons',
          fontHeight: 800,
          normalize: true,
          fixedWidth: true,
          centerHorizontally: true,
          round: 1e5,
        },

        '7',
      );
    },
  );

  test(
    'should work with fixedWidth, normalize and centerHorizontally set to' +
      ' true and with a large custom fontHeight option',
    async () => {
      await generateFontToFile(
        {
          fontName: 'originalicons',
          fontHeight: 5000,
          normalize: true,
          fixedWidth: true,
          centerHorizontally: true,
          round: 1e5,
        },

        '8',
      );
    },
  );

  test('should work with nested icons', async () => {
    await generateFontToFile(
      {
        fontName: 'nestedicons',
      },
      '',
      0xea01,
    );
  });
});

describe('Passing code points', () => {
  test('should work with multiple unicode values for a single icon', async () => {
    const svgFontStream = new SVGIcons2SVGFontStream({ round: 1e3 });
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'account',
      unicode: ['\uE001', '\uE002'],
    };

    const promise = bufferStream(svgFontStream);

    svgFontStream.write(svgIconStream);
    svgFontStream.end();

    expect((await promise).toString()).toEqual(
      fs.readFileSync(join('fixtures', 'expected', 'cleanicons-multi.svg'), {
        encoding: 'utf8',
      }),
    );
  });

  test('should work with ligatures', async () => {
    const svgFontStream = new SVGIcons2SVGFontStream({ round: 1e3 });
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'account',
      unicode: ['\uE001\uE002'],
    };

    const promise = bufferStream(svgFontStream);

    svgFontStream.write(svgIconStream);
    svgFontStream.end();
    expect((await promise).toString()).toEqual(
      fs.readFileSync(join('fixtures', 'expected', 'cleanicons-lig.svg'), {
        encoding: 'utf8',
      }),
    );
  });

  test('should work with high code points', async () => {
    const svgFontStream = new SVGIcons2SVGFontStream({ round: 1e3 });
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'account',
      unicode: ['\u{1f63a}'],
    };

    const promise = bufferStream(svgFontStream);

    svgFontStream.write(svgIconStream);
    svgFontStream.end();

    expect((await promise).toString()).toEqual(
      fs.readFileSync(join('fixtures', 'expected', 'cleanicons-high.svg'), {
        encoding: 'utf8',
      }),
    );
  });
});

describe('Respecting the fill-rule', () => {
  /**
   * Issue #62 (search) and issue #121 (frames)
   * https://github.com/nfroidure/svgicons2svgfont/issues/62
   * https://github.com/nfroidure/svgicons2svgfont/issues/121
   */
  test.each([
    [
      'attribute',
      24,
      [
        [12, 12, false],
        [4, 12, true],
      ],
    ],
    [
      'inherited',
      24,
      [
        [12, 12, false],
        [4, 12, true],
      ],
    ],
    [
      'style',
      24,
      [
        [12, 12, false],
        [4, 12, true],
      ],
    ],
    [
      'island',
      24,
      [
        [12, 12, true],
        [8, 12, false],
        [4, 12, true],
      ],
    ],
    [
      'nested',
      24,
      [
        [12, 12, false],
        [9.5, 12, true],
        [6.5, 12, false],
        [3.5, 12, true],
      ],
    ],
    [
      'overlapping',
      24,
      [
        [16, 16, false],
        [13, 10, true],
        [6, 6, false],
        [3, 3, true],
      ],
    ],
    [
      'separate',
      24,
      [
        [6, 6, true],
        [18, 18, true],
      ],
    ],
    [
      'duplicated',
      24,
      [
        [6, 6, true],
        [18, 6, false],
        [6, 18, false],
        [18, 18, true],
      ],
    ],
    [
      'notched',
      24,
      [
        [12, 4.5, false],
        [19.5, 12, false],
        [12, 19.5, false],
        [4.5, 12, false],
        [12, 12, true],
        [4, 4, true],
      ],
    ],
    [
      'adjacent',
      24,
      [
        [9, 12, false],
        [16, 12, false],
        [4, 12, true],
        [12, 4, true],
      ],
    ],
    [
      'nonzero',
      24,
      [
        [12, 12, true],
        [4, 12, true],
      ],
    ],
    [
      'overridden',
      24,
      [
        [12, 12, true],
        [4, 12, true],
      ],
    ],
    [
      'alternating',
      24,
      [
        [12, 12, false],
        [4, 12, true],
      ],
    ],
    [
      'search',
      16,
      [
        [6.5, 6.5, false],
        [6.5, 1, true],
      ],
    ],
    [
      'frames',
      23,
      [
        [5, 5, false],
        [18, 5, false],
        [5, 18, false],
        [18, 18, false],
        [0.7, 5, true],
        [22.3, 18, true],
      ],
    ],
  ] as [string, number, [number, number, boolean][]][])(
    'should fill the %s icon where SVG paints it',
    async (name, height, probes) => {
      const d = await generateGlyphPath(
        fs.readFileSync(
          join('fixtures', 'icons', 'evenoddicons', `${name}.svg`),
          'utf8',
        ),
      );

      expect(
        probes.map(([x, y]) => 0 !== windingNumberAt(d, x, height - y)),
      ).toEqual(probes.map(([, , ink]) => ink));
    },
  );

  test('should leave a path whose holes already wind backwards untouched', async () => {
    const source = fs.readFileSync(
      join('fixtures', 'icons', 'evenoddicons', 'alternating.svg'),
      'utf8',
    );

    expect(await generateGlyphPath(source)).toEqual(
      await generateGlyphPath(source.replace(' fill-rule="evenodd"', '')),
    );
  });

  test.each([
    ['a quadratic curve', 'M2 2H22V22H2Z M7 7Q7 17 17 17L17 7Z'],
    [
      'smooth cubic curves',
      'M2 12C2 6 6 2 12 2S22 6 22 12S18 22 12 22S2 18 2 12Z',
    ],
    ['smooth quadratic curves', 'M2 12Q2 2 12 2T22 12T12 22T2 12Z'],
  ])(
    'should leave a path drawn with %s untouched when no contour is reversed',
    async (_name, d) => {
      const icon = (fillRule: string) =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path${fillRule} d="${d}"/></svg>`;

      expect(await generateGlyphPath(icon(' fill-rule="evenodd"'))).toEqual(
        await generateGlyphPath(icon('')),
      );
    },
  );

  test.each([
    ['style="fill-rule: evenodd; fill-rule: nonzero"', 'nonzero'],
    ['style="fill-rule: evenodd !important; fill-rule: nonzero"', 'evenodd'],
    [
      'style="fill-rule: nonzero !important; fill-rule: evenodd !important"',
      'evenodd',
    ],
    ['style="fill-rule: bogus; fill-rule: evenodd"', 'evenodd'],
    ['style="FILL-RULE: EVENODD"', 'evenodd'],
    ['style="fill-rule: /* a comment */ evenodd"', 'evenodd'],
    ['style="fill-rule: evenodd /* ; fill-rule: nonzero */"', 'evenodd'],
    ['style="fill-rule: inherit" fill-rule="evenodd"', 'nonzero'],
    ['style="fill-rule: initial" fill-rule="evenodd"', 'nonzero'],
    ['style="FILL-RULE: INITIAL" fill-rule="evenodd"', 'nonzero'],
    ['style="fill-rule: unset" fill-rule="evenodd"', 'nonzero'],
    ['style="fill-rule: revert" fill-rule="evenodd"', 'nonzero'],
    ['style="fill-rule: revert-layer" fill-rule="evenodd"', 'evenodd'],
  ])('should fill a path with %s by the %s rule', async (attributes, rule) => {
    const icon = (declarations: string) =>
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path ${declarations} d="M2 2H22V22H2Z M7 7H17V17H7Z"/></svg>`;

    expect(await generateGlyphPath(icon(attributes))).toEqual(
      await generateGlyphPath(icon(`fill-rule="${rule}"`)),
    );
  });

  test.each([
    ['style="fill-rule: initial"', 'nonzero'],
    ['fill-rule="initial"', 'nonzero'],
    ['fill-rule="nonzero" style="fill-rule: unset"', 'evenodd'],
    ['fill-rule="nonzero" style="fill-rule: revert"', 'evenodd'],
    ['fill-rule="nonzero" style="fill-rule: revert-layer"', 'nonzero'],
    ['style="fill-rule: revert-layer"', 'evenodd'],
    ['fill-rule="unset"', 'evenodd'],
    ['fill-rule="revert-layer"', 'evenodd'],
  ])(
    'should fill a path with %s under an evenodd group by the %s rule',
    async (attributes, rule) => {
      const icon = (group: string, declarations: string) =>
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g ${group}><path ${declarations} d="M2 2H22V22H2Z M7 7H17V17H7Z"/></g></svg>`;

      expect(
        await generateGlyphPath(icon('fill-rule="evenodd"', attributes)),
      ).toEqual(await generateGlyphPath(icon('', `fill-rule="${rule}"`)));
    },
  );

  test('should produce the same glyph every time', async () => {
    const source = fs.readFileSync(
      join('fixtures', 'icons', 'evenoddicons', 'island.svg'),
      'utf8',
    );

    expect(await generateGlyphPath(source)).toEqual(
      await generateGlyphPath(source),
    );
  });
});

describe('Providing bad glyphs', () => {
  test('should fail when not providing glyph name', async () => {
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: undefined as unknown as string,
      unicode: '\uE001',
    };
    new SVGIcons2SVGFontStream({ round: 1e3 })
      .on('error', (err) => {
        expect(err instanceof Error).toBeTruthy();
        expect(err.message).toEqual(
          'Please provide a name for the glyph at index 0',
        );
      })
      .write(svgIconStream);
  });

  test('should fail when not providing codepoints', async () => {
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'test',
      unicode: undefined as unknown as string[],
    };
    new SVGIcons2SVGFontStream({ round: 1e3 })
      .on('error', (err) => {
        expect(err instanceof Error).toBeTruthy();
        expect(err.message).toEqual(
          'Please provide a codepoint for the glyph "test"',
        );
      })
      .write(svgIconStream);
  });

  test('should fail when providing unicode value with duplicates', async () => {
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'test',
      unicode: ['\uE002', '\uE002'],
    };
    new SVGIcons2SVGFontStream({ round: 1e3 })
      .on('error', (err) => {
        expect(err instanceof Error).toBeTruthy();
        expect(err.message).toEqual(
          'Given codepoints for the glyph "test" contain duplicates.',
        );
      })
      .write(svgIconStream);
  });

  test('should fail when providing the same codepoint twice', async () => {
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;
    const svgIconStream2 = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;
    const svgFontStream = new SVGIcons2SVGFontStream({
      round: 1e3,
    });

    svgIconStream.metadata = {
      name: 'test',
      unicode: '\uE002',
    };
    svgIconStream2.metadata = {
      name: 'test2',
      unicode: '\uE002',
    };
    svgFontStream.on('error', (err) => {
      expect(err instanceof Error).toBeTruthy();
      expect(err.message).toEqual(
        'The glyph "test2" codepoint seems to be used already elsewhere.',
      );
    });
    svgFontStream.write(svgIconStream);
    svgFontStream.write(svgIconStream2);
  });

  test('should fail when providing the same name twice', async () => {
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;
    const svgIconStream2 = fs.createReadStream(
      join('fixtures', 'icons', 'cleanicons', 'account.svg'),
    ) as unknown as SVGIconStream;
    const svgFontStream = new SVGIcons2SVGFontStream({ round: 1e3 });

    svgIconStream.metadata = {
      name: 'test',
      unicode: '\uE001',
    };
    svgIconStream2.metadata = {
      name: 'test',
      unicode: '\uE002',
    };
    svgFontStream.on('error', (err) => {
      expect(err instanceof Error).toBeTruthy();
      expect(err.message).toEqual('The glyph name "test" must be unique.');
    });
    svgFontStream.write(svgIconStream);
    svgFontStream.write(svgIconStream2);
  });

  test('should fail when providing bad pathdata', async () => {
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'badicons', 'pathdata.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'test',
      unicode: ['\uE002'],
    };
    new SVGIcons2SVGFontStream({ round: 1e3 })
      .on('error', (err) => {
        expect(err instanceof Error).toBeTruthy();
        expect(err.message).toEqual(
          'Got an error parsing the glyph "test":' +
            ' Expected a flag, got "20" at index "23".',
        );
      })
      .on('end', () => undefined)
      .write(svgIconStream);
  });

  test('should fail when providing bad XML', async () => {
    const svgIconStream = streamtest.fromChunks([
      Buffer.from('bad'),
      Buffer.from('xml'),
    ]) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'test',
      unicode: ['\uE002'],
    };

    let firstError = true;

    new SVGIcons2SVGFontStream({ round: 1e3 })
      .on('error', (err) => {
        expect(err instanceof Error).toBeTruthy();

        if (firstError) {
          firstError = false;
          expect(err.message).toEqual(
            'Non-whitespace before first tag.\nLine: 0\nColumn: 1\nChar: b',
          );
        }
      })
      .write(svgIconStream);
  });
});

async function generateGlyphPath(source: string) {
  const svgFontStream = new SVGIcons2SVGFontStream({ round: 1e3 });
  const svgIconStream = streamtest.fromChunks([
    Buffer.from(source),
  ]) as unknown as SVGIconStream;

  svgIconStream.metadata = {
    name: 'glyph',
    unicode: [''],
  };

  const promise = bufferStream(svgFontStream);

  svgFontStream.write(svgIconStream);
  svgFontStream.end();

  const font = (await promise).toString();
  const glyph = /<glyph[^>]* d="([^"]*)"/.exec(font);

  if (!glyph) {
    throw new Error(`No glyph path in the font: ${font}`);
  }
  return glyph[1];
}

// A font is filled by the nonzero rule: a point is ink when the outline winds around it.
function windingNumberAt(d: string, x: number, y: number) {
  let winding = 0;
  let start = { x: 0, y: 0 };
  let current = start;
  const lineTo = (point: { x: number; y: number }) => {
    const side =
      (point.x - current.x) * (y - current.y) -
      (x - current.x) * (point.y - current.y);

    if (current.y <= y && point.y > y && 0 < side) {
      winding += 1;
    } else if (current.y > y && point.y <= y && 0 > side) {
      winding -= 1;
    }
    current = point;
  };

  for (const command of new SVGPathData(d).toAbs().normalizeST().qtToC().aToC()
    .commands) {
    if (SVGPathData.MOVE_TO === command.type) {
      lineTo(start);
      start = { x: command.x, y: command.y };
      current = start;
    } else if (SVGPathData.LINE_TO === command.type) {
      lineTo({ x: command.x, y: command.y });
    } else if (SVGPathData.HORIZ_LINE_TO === command.type) {
      lineTo({ x: command.x, y: current.y });
    } else if (SVGPathData.VERT_LINE_TO === command.type) {
      lineTo({ x: current.x, y: command.y });
    } else if (SVGPathData.CURVE_TO === command.type) {
      const from = current;

      for (let step = 1; step <= 32; step++) {
        const t = step / 32;
        const u = 1 - t;

        lineTo({
          x:
            u * u * u * from.x +
            3 * u * u * t * command.x1 +
            3 * u * t * t * command.x2 +
            t * t * t * command.x,
          y:
            u * u * u * from.y +
            3 * u * u * t * command.y1 +
            3 * u * t * t * command.y2 +
            t * t * t * command.y,
        });
      }
    } else if (SVGPathData.CLOSE_PATH === command.type) {
      lineTo(start);
    }
  }
  lineTo(start);
  return winding;
}

async function bufferStream(readableStream: Readable) {
  return await new Promise<Buffer>((resolve, reject) => {
    readableStream.pipe(
      new BufferStream((err, buf) => {
        if (err) {
          return reject(err);
        }
        resolve(buf);
      }),
    );
  });
}
