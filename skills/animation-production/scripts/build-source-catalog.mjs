#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

const [catalogArg, pagesArg] = process.argv.slice(2);
if (!catalogArg || !pagesArg) {
  console.error('Usage: node build-source-catalog.mjs <source-catalog.json> <pages-dir>');
  process.exit(2);
}
const catalogPath = resolve(catalogArg);
const catalogRoot = dirname(catalogPath);
const pagesDir = resolve(pagesArg);
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const pageNumber = (name) => Number(name.match(/^page-(\d+)\.png$/)?.[1]);
const pageFiles = (await readdir(pagesDir)).filter((name) => /^page-\d+\.png$/.test(name)).sort((a, b) => pageNumber(a) - pageNumber(b));

for (const file of pageFiles) {
  const data = await readFile(join(pagesDir, file));
  const width = data.subarray(16, 20).readUInt32BE();
  const height = data.subarray(20, 24).readUInt32BE();
  const page = pageNumber(file);
  const assetId = `asset-page-${String(page).padStart(3, '0')}`;
  const uri = relative(catalogRoot, join(pagesDir, file)).split('\\').join('/');
  const asset = {
    id: assetId, name: `Rendered page ${page}`, kind: 'image', uri, embedded: false,
    sha256: createHash('sha256').update(data).digest('hex'), width, height,
    source: { documentId: catalog.source.id, page, slide: catalog.source.mimeType.includes('presentation') ? page : undefined, extraction: 'rendered-page' },
  };
  catalog.assets = [...(catalog.assets ?? []).filter((candidate) => candidate.id !== assetId), asset];
  const candidate = { id: `page-${String(page).padStart(3, '0')}-full`, assetId, kind: 'rendered-page', name: asset.name, page, bbox: { x: 0, y: 0, width: 1, height: 1 }, extraction: 'rendered-page' };
  catalog.candidates = [...(catalog.candidates ?? []).filter((item) => item.id !== candidate.id), candidate];
}
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

const cards = catalog.candidates.map((candidate) => {
  const asset = catalog.assets.find((item) => item.id === candidate.assetId);
  if (!asset) return '';
  const src = asset.uri.split('/').map(encodeURIComponent).join('/');
  return `<figure><div class="image"><img src="${src}" alt="${candidate.name ?? candidate.id}"></div><figcaption><b>${candidate.id}</b><span>${candidate.kind} · page ${candidate.page ?? candidate.slide ?? '?'}</span><small>${candidate.name ?? ''}</small></figcaption></figure>`;
}).join('\n');
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Source contact sheet</title><style>body{margin:0;padding:32px;background:#111;color:#eee;font:14px system-ui}header{margin-bottom:24px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px}figure{margin:0;background:#1b1b1b;border:1px solid #333;border-radius:10px;overflow:hidden}.image{height:190px;display:grid;place-items:center;background:#080808}.image img{max-width:100%;max-height:100%;object-fit:contain}figcaption{padding:12px;display:grid;gap:4px}span,small{color:#999}</style></head><body><header><h1>${catalog.source.name}</h1><p>${catalog.candidates.length} source candidates · use IDs, never visual guesswork alone.</p></header><main>${cards}</main></body></html>`;
await writeFile(join(catalogRoot, 'contact-sheet.html'), html);
console.log(`Cataloged ${pageFiles.length} rendered page(s); contact sheet contains ${catalog.candidates.length} candidate(s).`);
