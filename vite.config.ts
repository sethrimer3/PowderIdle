import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

const dataFiles = [
  'powders.json',
  'machines.json',
  'upgrades.json',
  'progression.json'
  ,'stages.json'
] as const;

const iconFiles = ['icon-16.png', 'icon-32.png', 'icon-48.png', 'icon-256.png'] as const;

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'powder-idle-data-files',
      generateBundle() {
        for (const file of dataFiles) {
          this.emitFile({
            type: 'asset',
            fileName: `data/${file}`,
            source: readFileSync(new URL(`./data/${file}`, import.meta.url), 'utf8')
          });
        }
        for (const file of iconFiles) {
          this.emitFile({
            type: 'asset',
            fileName: `build/icons/${file}`,
            source: readFileSync(new URL(`./build/icons/${file}`, import.meta.url))
          });
        }
      }
    }
  ],
  server: {
    host: '127.0.0.1'
  },
  preview: {
    host: '127.0.0.1'
  }
});
