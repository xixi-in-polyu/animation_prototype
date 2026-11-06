#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const catalogPath = resolve(args[0] ?? '');
const value = (flag) => args[args.indexOf(flag) + 1];
const query = value('--query');
const output = value('--out');
const limit = Number(value('--limit') ?? 8);
if (!args[0] || !query || !output || !Number.isInteger(limit) || limit < 1) {
  console.error('Usage: node select-source-candidates.mjs <catalog.json> --query "scene intent" --out selection.json [--limit 8]');
  process.exit(2);
}
const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? [])];
const extractionWeight = { native: 24, 'rendered-crop': 18, 'rendered-page': 8, ocr: -8 };
const ranked = (catalog.candidates ?? []).map((candidate) => {
  const asset = (catalog.assets ?? []).find((item) => item.id === candidate.assetId);
  const haystack = [candidate.name, candidate.caption, candidate.notes, ...(candidate.tags ?? [])].filter(Boolean).join(' ').toLowerCase();
  const matches = terms.filter((term) => haystack.includes(term));
  let score = matches.length * 20 + (extractionWeight[candidate.extraction] ?? 0);
  if ((asset?.width ?? 0) >= 1280) score += 8;
  if (candidate.kind === 'rendered-page') score -= 4;
  return { candidateId: candidate.id, assetId: candidate.assetId, score, matches, reason: `${matches.length} semantic match(es); ${candidate.extraction} source${(asset?.width ?? 0) >= 1280 ? '; high-resolution' : ''}` };
}).sort((a, b) => b.score - a.score || a.candidateId.localeCompare(b.candidateId)).slice(0, limit);
const result = {
  catalog: catalogPath,
  query,
  generatedAt: new Date().toISOString(),
  status: 'requires-visual-selection',
  note: 'Ranking narrows candidates; inspect contact-sheet.html before authoring an image element.',
  candidates: ranked,
};
await writeFile(resolve(output), `${JSON.stringify(result, null, 2)}\n`);
console.log(`Ranked ${ranked.length} candidate(s). Visual selection remains required.`);
