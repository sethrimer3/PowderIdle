import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const iconDir = resolve(root, 'build/icons');
const sizes = [1024, 512, 256, 128, 64, 48, 32, 24, 16];

describe('desktop icon assets', () => {
  it.each(sizes)('contains a valid %ix%i PNG', async (size) => {
    const file = resolve(iconDir, `icon-${size}.png`);
    expect((await stat(file)).size).toBeGreaterThan(100);
    const metadata = await sharp(file).metadata();
    expect([metadata.format, metadata.width, metadata.height]).toEqual(['png', size, size]);
  });

  it('contains a multi-resolution Windows ICO', async () => {
    const icon = await readFile(resolve(iconDir, 'icon.ico'));
    expect(icon.readUInt16LE(0)).toBe(0);
    expect(icon.readUInt16LE(2)).toBe(1);
    expect(icon.readUInt16LE(4)).toBeGreaterThanOrEqual(6);
  });

  it('contains a structurally valid Apple ICNS', async () => {
    const icon = await readFile(resolve(iconDir, 'icon.icns'));
    expect(icon.subarray(0, 4).toString('ascii')).toBe('icns');
    expect(icon.readUInt32BE(4)).toBe(icon.length);
  });
});
