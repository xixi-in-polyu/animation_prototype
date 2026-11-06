#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const projectPath = resolve(args[0] ?? '');
const outIndex = args.indexOf('--out');
const output = outIndex >= 0 ? resolve(args[outIndex + 1] ?? '') : undefined;
if (!args[0] || !output) {
  console.error('Usage: node embed-project-assets.mjs <project.json> --out portable-project.json');
  process.exit(2);
}
const project = JSON.parse(await readFile(projectPath, 'utf8'));
const mimeTypes = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
for (const asset of project.assets ?? []) {
  if (asset.embedded || /^data:/.test(asset.uri) || /^https?:/.test(asset.uri)) continue;
  if (/^(?:file:\/\/|\/|[A-Za-z]:[\\/])/.test(asset.uri)) throw new Error(`Refusing absolute asset path: ${asset.uri}`);
  const path = resolve(dirname(projectPath), asset.uri);
  if (relative(dirname(projectPath), path).startsWith('..')) throw new Error(`Refusing asset outside project package: ${asset.uri}`);
  const data = await readFile(path);
  const digest = createHash('sha256').update(data).digest('hex');
  if (asset.sha256 && asset.sha256 !== digest) throw new Error(`Asset hash changed: ${asset.id}`);
  const mime = mimeTypes[extname(path).toLowerCase()];
  if (!mime) throw new Error(`Unsupported embedded asset type: ${extname(path)}`);
  asset.uri = `data:${mime};base64,${data.toString('base64')}`;
  asset.embedded = true;
  asset.sha256 = digest;
}
await writeFile(output, `${JSON.stringify(project, null, 2)}\n`);
console.log(`Wrote portable project to ${output}.`);
