import { join, dirname, basename } from 'node:path';
import { rename } from 'node:fs';

export type MetadataServiceOptions = {
  prependUnicode: boolean;
  startUnicode: number;
};
export type FileMetadata = {
  path: string;
  name: string;
  unicode: string[] | string;
  renamed: boolean;
};

function getMetadataService(options: Partial<MetadataServiceOptions> = {}) {
  const usedUnicodes = [] as string[];

  // Default options
  const _options: MetadataServiceOptions = {
    prependUnicode: !!options.prependUnicode,
    startUnicode:
      'number' === typeof options.startUnicode ? options.startUnicode : 0xea01,
  };

  return function getMetadataFromFile(
    file: string,
    cb: (error: Error | null, metadata?: FileMetadata) => void,
  ) {
    const fileBasename = basename(file);
    const metadata: FileMetadata = {
      path: file,
      name: '',
      unicode: [],
      renamed: false,
    };
    const matches = fileBasename.match(
      /^(?:((?:u[0-9a-f]{4,6},?)+)-)?(.+)\.svg$/i,
    );

    metadata.name =
      matches && matches[2] ? matches[2] : 'icon' + _options.startUnicode;

    if (matches && matches[1]) {
      metadata.unicode = matches[1].split(',').map((match) => {
        match = match.substring(1);
        return match
          .split('u')
          .map((code) => String.fromCodePoint(parseInt(code, 16)))
          .join('');
      });
      if (-1 !== usedUnicodes.indexOf(metadata.unicode[0])) {
        cb(
          new Error(
            'The unicode codepoint of the glyph ' +
              metadata.name +
              ' seems to be already used by another glyph.',
          ),
        );
        return;
      }
      usedUnicodes.push(...metadata.unicode);
    } else {
      do {
        (metadata.unicode as string[])[0] = String.fromCodePoint(
          _options.startUnicode++,
        );
      } while (usedUnicodes.includes(metadata.unicode[0]));
      usedUnicodes.push(metadata.unicode[0]);
      if (_options.prependUnicode) {
        metadata.renamed = true;
        metadata.path = join(
          dirname(file),
          'u' +
            metadata.unicode[0].codePointAt(0)?.toString(16).toUpperCase() +
            '-' +
            fileBasename,
        );
        rename(file, metadata.path, (err) => {
          if (err) {
            cb(
              new Error(
                'Could not save codepoint: ' +
                  'u' +
                  metadata.unicode[0]
                    .codePointAt(0)
                    ?.toString(16)
                    .toUpperCase() +
                  ' for ' +
                  fileBasename,
              ),
            );
            return;
          }
          cb(null, metadata);
        });
      }
    }
    if (!metadata.renamed) {
      setImmediate(() => cb(null, metadata));
    }
  };
}

export { getMetadataService };
