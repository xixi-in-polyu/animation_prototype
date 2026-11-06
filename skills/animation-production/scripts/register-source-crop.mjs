#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const catalogPath = resolve(args[0] ?? '');
const value = (flag) => args[args.indexOf(flag) + 1];
const page = Number(value('--page'));
const bbox = String(value('--bbox') ?? '').split(',').map(Number);
const name = value('--name');
if (!args[0] || !Number.isInteger(page) || bbox.length !== 4 || !bbox.every(Number.isFinite) || !name) {
  console.error('Usage: node register-source-crop.mjs <catalog.json> --page N --bbox x,y,width,height --name slug');
  process.exit(2);
}
const [x, y, width, height] = bbox;
if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) throw new Error('Crop must be a normalized box inside the page.');
const root = dirname(catalogPath);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const sourceCandidate = catalog.candidates.find((candidate) => candidate.id === `page-${String(page).padStart(3, '0')}-full`);
const sourceAsset = catalog.assets.find((asset) => asset.id === sourceCandidate?.assetId);
if (!sourceAsset) throw new Error(`Rendered page ${page} is not in the catalog. Run build-source-catalog.mjs first.`);
const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const assetId = `asset-page-${String(page).padStart(3, '0')}-${safeName}`;
const outputRelative = `assets/${assetId}.png`;
const script = join(dirname(fileURLToPath(import.meta.url)), 'crop-source-image.mjs');
await new Promise((resolveRun, reject) => {
  const child = spawn(process.execPath, [script, resolve(root, sourceAsset.uri), resolve(root, outputRelative), ...bbox.map(String)], { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolveRun() : reject(new Error(`Crop command exited with ${code}`)));
});
const data = await readFile(resolve(root, outputRelative));
const asset = {
  id: assetId, name, kind: 'image', uri: outputRelative, embedded: false,
  sha256: createHash('sha256').update(data).digest('hex'),
  source: { documentId: catalog.source.id, page, slide: catalog.source.mimeType.includes('presentation') ? page : undefined, bbox: { x, y, width, height }, extraction: 'rendered-crop' },
};
catalog.assets = [...catalog.assets.filter((candidate) => candidate.id !== assetId), asset];
const candidate = { id: `page-${String(page).padStart(3, '0')}-crop-${safeName}`, assetId, kind: 'slide-crop', name, page, bbox: { x, y, width, height }, extraction: 'rendered-crop' };
catalog.candidates = [...catalog.candidates.filter((item) => item.id !== candidate.id), candidate];
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Registered ${candidate.id}. Rebuild the contact sheet to display it.`);
