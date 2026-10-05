import { describe, test, expect } from '@jest/globals';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { format } from 'node:util';

import {
  SVGIcons2SVGFontStream,
  type SVGIcons2SVGFontStreamOptions,
} from '../index.js';
import { SVGIconsDirStream, type SVGIconStream } from '../iconsdir.js';
import streamtest from 'streamtest';
import { BufferStream } from 'bufferstreams';
import debug from 'debug';

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

  test('should not draw never-rendered elements', async () => {
    await generateFontToFile({
      fontName: 'neverrenderedicons',
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

describe('Skipping never-rendered elements', () => {
  const square =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">' +
    '<path d="M4 4H10V10H4Z" /></svg>';

  test.each(['clippath', 'mask', 'pattern', 'marker', 'symbol', 'defs'])(
    'should draw the %s icon as its square alone',
    async (name) => {
      expect(
        await generateGlyphPath(
          fs.readFileSync(
            join('fixtures', 'icons', 'neverrenderedicons', `${name}.svg`),
            'utf8',
          ),
        ),
      ).toEqual(await generateGlyphPath(square));
    },
  );

  test('should take the glyph color from what it draws', async () => {
    let colors: (string | undefined)[] = [];
    const svgFontStream = new SVGIcons2SVGFontStream({
      round: 1e3,
      callback: (glyphs) => {
        colors = glyphs.map(({ color }) => color);
      },
    });
    const svgIconStream = fs.createReadStream(
      join('fixtures', 'icons', 'neverrenderedicons', 'clippath.svg'),
    ) as unknown as SVGIconStream;

    svgIconStream.metadata = {
      name: 'clippath',
      unicode: [''],
    };

    const promise = bufferStream(svgFontStream);

    svgFontStream.write(svgIconStream);
    svgFontStream.end();
    await promise;

    expect(colors).toEqual(['#9F9FA9']);
  });

  test.each([
    [
      'clipPath',
      'a clip-path attribute',
      '<g clip-path="url(#clip)"><path d="M4 4H10V10H4Z" /></g>' +
        '<defs><clipPath id="clip"><rect width="24" height="24" /></clipPath></defs>',
    ],
    [
      'clipPath',
      'a clip-path declaration',
      '<g style="clip-path: url(#clip)"><path d="M4 4H10V10H4Z" /></g>' +
        '<clipPath id="clip"><rect width="24" height="24" /></clipPath>',
    ],
    [
      'mask',
      'a mask attribute',
      '<g mask="url(#mask)"><path d="M4 4H10V10H4Z" /></g>' +
        '<mask id="mask"><rect width="24" height="24" fill="white" /></mask>',
    ],
  ])(
    'should warn once about the %s of an icon clipped through %s',
    async (element, _reference, content) => {
      const warnings = await collectWarnings(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${content}</svg>`,
      );

      expect(warnings.filter((warning) => warning.includes('Found a'))).toEqual(
        [expect.stringContaining(`Found a ${element} element in the icon`)],
      );
    },
  );

  test('should not warn about clipping an icon that does not clip', async () => {
    const warnings = await collectWarnings(square);

    expect(warnings).toContainEqual(expect.stringContaining('Font created'));
    expect(warnings.filter((warning) => warning.includes('Found a'))).toEqual(
      [],
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

async function collectWarnings(source: string) {
  const warnings: string[] = [];
  const { log } = debug;
  const namespaces = debug.disable();

  debug.enable('svgicons2svgfont');
  debug.log = (...args: unknown[]) => {
    warnings.push(format(...args));
  };
  try {
    await generateGlyphPath(source);
  } finally {
    debug.log = log;
    debug.enable(namespaces);
  }
  return warnings;
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
