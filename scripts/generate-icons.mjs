import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iconDir = path.join(root, 'build', 'icons');
const source = path.join(iconDir, 'powder-idle-icon.svg');
const sizes = [1024, 512, 256, 128, 64, 48, 32, 24, 16];

function makeIco(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, index) => {
    const position = 6 + index * 16;
    header[position] = size >= 256 ? 0 : size;
    header[position + 1] = size >= 256 ? 0 : size;
    header[position + 2] = 0;
    header[position + 3] = 0;
    header.writeUInt16LE(1, position + 4);
    header.writeUInt16LE(32, position + 6);
    header.writeUInt32LE(data.length, position + 8);
    header.writeUInt32LE(offset, position + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map(({ data }) => data)]);
}

function makeIcns(images) {
  const types = new Map([[16, 'icp4'], [32, 'icp5'], [64, 'icp6'], [128, 'ic07'], [256, 'ic08'], [512, 'ic09'], [1024, 'ic10']]);
  const chunks = images.filter(({ size }) => types.has(size)).map(({ size, data }) => {
    const chunk = Buffer.alloc(8 + data.length);
    chunk.write(types.get(size), 0, 4, 'ascii');
    chunk.writeUInt32BE(chunk.length, 4);
    data.copy(chunk, 8);
    return chunk;
  });
  const header = Buffer.alloc(8);
  header.write('icns', 0, 4, 'ascii');
  header.writeUInt32BE(8 + chunks.reduce((sum, chunk) => sum + chunk.length, 0), 4);
  return Buffer.concat([header, ...chunks]);
}

await mkdir(iconDir, { recursive: true });
const svg = await readFile(source);
const images = [];
for (const size of sizes) {
  const output = path.join(iconDir, `icon-${size}.png`);
  const data = await sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 }).toBuffer();
  const metadata = await sharp(data).metadata();
  if (metadata.width !== size || metadata.height !== size || metadata.format !== 'png') {
    throw new Error(`Icon generation failed for ${size}x${size}: received ${metadata.width}x${metadata.height} ${metadata.format ?? 'unknown'}`);
  }
  await writeFile(output, data);
  images.push({ size, data });
}

const icoImages = images.filter(({ size }) => [256, 128, 64, 48, 32, 24, 16].includes(size));
const ico = makeIco(icoImages);
if (ico.readUInt16LE(2) !== 1 || ico.readUInt16LE(4) !== icoImages.length) throw new Error('Generated ICO failed validation');
await writeFile(path.join(iconDir, 'icon.ico'), ico);

const icns = makeIcns(images);
if (icns.subarray(0, 4).toString('ascii') !== 'icns' || icns.readUInt32BE(4) !== icns.length) throw new Error('Generated ICNS failed validation');
await writeFile(path.join(iconDir, 'icon.icns'), icns);

console.log(`Generated ${sizes.length} PNGs, icon.ico, and icon.icns from ${path.relative(root, source)}.`);
