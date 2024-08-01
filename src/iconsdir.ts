import { Readable } from 'node:stream';
import { createReadStream, readdir } from 'node:fs';
import { fileSorter } from './filesorter.js';
import {
  getMetadataService,
  FileMetadata,
  MetadataServiceOptions,
} from './metadata.js';
import debug from 'debug';

const warn = debug('svgicons2svgfont');

export type SVGIconsDirStreamOptions = {
  metadataProvider: ReturnType<typeof getMetadataService>;
};
export type SVGIconStream = Readable & {
  metadata: Pick<FileMetadata, 'name' | 'unicode'>;
};

class SVGIconsDirStream extends Readable {
  private _options: SVGIconsDirStreamOptions & Partial<MetadataServiceOptions>;
  gotFilesInfos: boolean = false;
  fileInfos: FileMetadata[] = [];
  dir: string;

  constructor(
    dir: string[],
    options: Partial<SVGIconsDirStreamOptions & MetadataServiceOptions>,
  ) {
    super({ objectMode: true });
    this._options = {
      metadataProvider: options.metadataProvider || getMetadataService(options),
    };

    if (dir instanceof Array) {
      this.dir = '';
      this._getFilesInfos(dir);
    } else {
      this.dir = dir;
    }
  }
  _getFilesInfos(files) {
    let filesProcessed = 0;

    this.fileInfos = [];
    // Ensure prefixed files come first
    files = files.slice(0).sort(fileSorter);
    files.forEach((file) => {
      this._options.metadataProvider(
        (this.dir ? this.dir + '/' : '') + file,
        (err, metadata) => {
          filesProcessed++;
          if (err) {
            this.emit('error', err);
          }
          if (metadata) {
            if (metadata.renamed) {
              warn(
                '➕ - Saved codepoint: ' +
                  'u' +
                  metadata.unicode[0]
                    .codePointAt(0)
                    ?.toString(16)
                    .toUpperCase() +
                  ' for the glyph "' +
                  metadata.name +
                  '"',
              );
            }
            this.fileInfos.push(metadata);
          }
          if (files.length === filesProcessed) {
            // Reorder files
            this.fileInfos.sort((infosA, infosB) =>
              infosA.unicode[0] > infosB.unicode[0] ? 1 : -1,
            );
            // Mark directory as processed
            this.gotFilesInfos = true;
            // Start processing
            this._pushSVGIcons();
          }
        },
      );
    });
  }

  _pushSVGIcons() {
    let fileInfo: FileMetadata;
    let svgIconStream: SVGIconStream;

    while (this.fileInfos.length) {
      fileInfo = this.fileInfos.shift() as FileMetadata;
      svgIconStream = createReadStream(
        fileInfo.path,
      ) as unknown as SVGIconStream;
      svgIconStream.metadata = {
        name: fileInfo.name,
        unicode: fileInfo.unicode,
      };
      if (!this.push(svgIconStream)) {
        return;
      }
    }
    this.push(null);
  }
  _read() {
    if (this.dir) {
      readdir(this.dir, (err, files) => {
        if (err) {
          this.emit('error', err);
        }
        this._getFilesInfos(files);
      });
      return;
    }
    if (this.gotFilesInfos) {
      this._pushSVGIcons();
    }
  }
}

export { SVGIconsDirStream };
