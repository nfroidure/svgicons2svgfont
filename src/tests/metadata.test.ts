import { describe, test, expect } from '@jest/globals';
import { writeFile, readFile, unlink } from 'node:fs/promises';
import { promisify } from 'node:util';
import { getMetadataService } from '../metadata.js';
import { YError } from 'yerror';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';

try {
  await mkdir(join('fixtures', 'results'));
} catch (err) {
  // empty
}

describe('Metadata service', () => {
  describe('for code generation', () => {
    test('should extract right unicodes from files', async () => {
      const metadataService = getMetadataService();
      const infos = await promisify(metadataService)('/var/plop/hello.svg');

      expect(infos).toEqual({
        path: '/var/plop/hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0xea01)],
        renamed: false,
      });
    });

    test('should append unicodes to files when the option is set', async () => {
      const metadataService = getMetadataService({
        prependUnicode: true,
      });

      await writeFile(join('fixtures', 'results', 'plop.svg'), 'plop', 'utf-8');
      const infos = await promisify(metadataService)(
        join('fixtures', 'results', 'plop.svg'),
      );

      expect(infos).toEqual({
        path: join('fixtures', 'results', 'uEA01-plop.svg'),
        name: 'plop',
        unicode: [String.fromCharCode(0xea01)],
        renamed: true,
      });
      expect(
        await readFile(join('fixtures', 'results', 'uEA01-plop.svg')),
      ).toBeTruthy();
      unlink(join('fixtures', 'results', 'uEA01-plop.svg'));
      try {
        await readFile(join('fixtures', 'results', 'plop.svg'));
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect((err as YError).code === 'E_UNEXPECTED_SUCCESS').toBeFalsy();
      }
    });

    test('should log file rename errors', async () => {
      const metadataService = getMetadataService({
        prependUnicode: true,
        startUnicode: 0xea02,
      });

      try {
        await promisify(metadataService)(
          join('fixtures', 'results', 'plop.svg'),
        );

        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect(err).toBeTruthy();
        expect((err as YError).code === 'E_UNEXPECTED_SUCCESS').toBeFalsy();
      }
      try {
        await readFile(join('fixtures', 'results', 'uEA02-plop.svg'));
        throw new YError('E_UNEXPECTED_SUCCESS');
      } catch (err) {
        expect((err as YError).code === 'E_UNEXPECTED_SUCCESS').toBeFalsy();
      }
    });
  });

  describe('for code extraction', () => {
    test('should work for simple codes', async () => {
      const metadataService = getMetadataService();
      const infos = await promisify(metadataService)(
        '/var/plop/u0001-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/u0001-hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0x0001)],
        renamed: false,
      });
    });

    test('should work for several codes', async () => {
      const metadataService = getMetadataService();
      const infos = await promisify(metadataService)(
        '/var/plop/u0001,u0002-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/u0001,u0002-hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0x0001), String.fromCharCode(0x0002)],
        renamed: false,
      });
    });

    test('should work for higher codepoint codes', async () => {
      const metadataService = getMetadataService();
      const infos = await promisify(metadataService)(
        '/var/plop/u1F63A-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/u1F63A-hello.svg',
        name: 'hello',
        unicode: [String.fromCodePoint(0x1f63a)],
        renamed: false,
      });
    });

    test('should work for ligature codes', async () => {
      const metadataService = getMetadataService();
      const infos = await promisify(metadataService)(
        '/var/plop/u0001u0002-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/u0001u0002-hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0x0001) + String.fromCharCode(0x0002)],
        renamed: false,
      });
    });

    test('should work for nested codes', async () => {
      const metadataService = getMetadataService();
      const infos = await promisify(metadataService)(
        '/var/plop/u0001u0002,u0001-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/u0001u0002,u0001-hello.svg',
        name: 'hello',
        unicode: [
          String.fromCharCode(0x0001) + String.fromCharCode(0x0002),
          String.fromCharCode(0x0001),
        ],
        renamed: false,
      });
    });

    test('should not set the same codepoint twice', async () => {
      const metadataService = getMetadataService();

      const infos = await promisify(metadataService)(
        '/var/plop/uEA01-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/uEA01-hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0xea01)],
        renamed: false,
      });

      const infos2 = await promisify(metadataService)('/var/plop/plop.svg');

      expect(infos2).toEqual({
        path: '/var/plop/plop.svg',
        name: 'plop',
        unicode: [String.fromCharCode(0xea02)],
        renamed: false,
      });
    });

    test('should not set the same codepoint twice with different cases', async () => {
      const metadataService = getMetadataService();

      const infos = await promisify(metadataService)(
        '/var/plop/UEA01-hello.svg',
      );

      expect(infos).toEqual({
        path: '/var/plop/UEA01-hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0xea01)],
        renamed: false,
      });

      const infos2 = await promisify(metadataService)(
        '/var/plop/uEA02-hello.svg',
      );

      expect(infos2).toEqual({
        path: '/var/plop/uEA02-hello.svg',
        name: 'hello',
        unicode: [String.fromCharCode(0xea02)],
        renamed: false,
      });

      const infos3 = await promisify(metadataService)('/var/plop/bell-o.svg');

      expect(infos3).toEqual({
        path: '/var/plop/bell-o.svg',
        name: 'bell-o',
        unicode: [String.fromCharCode(0xea03)],
        renamed: false,
      });
    });
  });
});
