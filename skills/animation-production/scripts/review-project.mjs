#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';

const args = process.argv.slice(2);
const file = args[0];
const outIndex = args.indexOf('--out');
const out = outIndex >= 0 ? args[outIndex + 1] : undefined;
if (!file || (outIndex >= 0 && !out)) {
  console.error('Usage: node review-project.mjs <project.json> [--out review.md]');
  process.exit(2);
}

const project = JSON.parse(await readFile(file, 'utf8'));
const visual = [];
const narrative = [];
const provenance = [];
const scenes = Array.isArray(project.scenes) ? project.scenes : [];
const assets = new Map((project.assets ?? []).map((asset) => [asset.id, asset]));

const area = (element) => Math.max(0, element.width ?? 0) * Math.max(0, element.height ?? 0);
const intersection = (a, b) => {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height;
};
const visibleLength = (element) => `${element.content ?? ''} ${(element.items ?? []).map((item) => item.label).join(' ')}`.trim().length;
const wordCount = (text) => (String(text).trim().match(/[\p{L}\p{N}'’-]+/gu) ?? []).length;

for (const [sceneIndex, scene] of scenes.entries()) {
  const label = `Scene ${sceneIndex + 1} (${scene.id ?? 'missing-id'})`;
  const elements = Array.isArray(scene.elements) ? scene.elements : [];
  if (elements.length > 4) visual.push(`${label}: ${elements.length} elements may compete for attention.`);
  for (const element of elements) {
    const length = visibleLength(element);
    if (length > 180) visual.push(`${label}: ${element.id} contains ${length} visible characters; inspect scan time and density.`);
    if ((element.items?.length ?? 0) > 7) visual.push(`${label}: ${element.id} has ${element.items.length} items; inspect legibility.`);
    if (element.type === 'image') {
      const asset = assets.get(element.assetId);
      if (!asset) provenance.push(`${label}: ${element.id} references missing asset ${element.assetId}.`);
      else {
        const targetWidth = (project.renderConfig?.width ?? 1920) * element.width / 100;
        const targetHeight = (project.renderConfig?.height ?? 1080) * element.height / 100;
        if (asset.width && asset.height && (asset.width < targetWidth || asset.height < targetHeight)) visual.push(`${label}: ${element.id} may upscale ${asset.width}×${asset.height} into ${Math.round(targetWidth)}×${Math.round(targetHeight)}; inspect sharpness.`);
        if (!asset.source) provenance.push(`${label}: ${element.id} asset ${asset.id} has no source provenance.`);
      }
      if (!element.alt?.trim()) visual.push(`${label}: ${element.id} has no concise alt/intent description for review.`);
    }
    if (element.type === 'code') {
      const lines = String(element.content ?? '').split('\n');
      if (lines.length > 16) visual.push(`${label}: ${element.id} displays ${lines.length} code lines; split narrated steps.`);
      if (lines.some((line) => line.length > 80)) visual.push(`${label}: ${element.id} has code wider than 80 characters.`);
      if (!element.codeSource) provenance.push(`${label}: ${element.id} has no code source provenance.`);
      if (element.codeSource?.extraction === 'ocr') provenance.push(`${label}: ${element.id} is OCR-derived and needs source comparison.`);
    }
  }
  for (let i = 0; i < elements.length; i += 1) for (let j = i + 1; j < elements.length; j += 1) {
    const overlap = intersection(elements[i], elements[j]);
    const smaller = Math.min(area(elements[i]), area(elements[j]));
    if (smaller > 0 && overlap / smaller > 0.2) visual.push(`${label}: ${elements[i].id} and ${elements[j].id} overlap by ${Math.round(overlap / smaller * 100)}% of the smaller box; verify this is intentional.`);
  }

  const narration = Array.isArray(scene.narration) ? [...scene.narration].sort((a, b) => a.start - b.start) : [];
  const words = narration.reduce((sum, segment) => sum + wordCount(segment.text), 0);
  const minutes = Number(scene.duration) / 60;
  if (minutes > 0 && words / minutes > 185) narrative.push(`${label}: estimated narration density is ${Math.round(words / minutes)} words/minute.`);
  if (narration.length === 0) narrative.push(`${label}: no narration; confirm that silence is intentional.`);
  for (let i = 1; i < narration.length; i += 1) {
    const gap = narration[i].start - narration[i - 1].end;
    if (gap > 2) narrative.push(`${label}: ${gap.toFixed(1)}s narration gap before ${narration[i].id}; confirm intentional silence.`);
    if (gap < -0.01) narrative.push(`${label}: narration overlaps by ${Math.abs(gap).toFixed(1)}s at ${narration[i].id}.`);
  }
  if (narration.length && scene.duration - narration.at(-1).end < 0.5) narrative.push(`${label}: less than 0.5s remains after narration; inspect the closing beat.`);

  const previous = scenes[sceneIndex - 1];
  if (previous) {
    const signature = (candidate) => `${candidate.template}:${(candidate.elements ?? []).map((element) => element.type).sort().join(',')}`;
    if (signature(previous) === signature(scene)) narrative.push(`${label}: repeats the preceding scene's template and element vocabulary; verify the repetition is purposeful.`);
  }
}

if (scenes[0]?.template !== 'opening') narrative.push('Project: first scene is not an opening template; verify the hook remains clear.');
if (scenes.at(-1)?.template !== 'closing') narrative.push('Project: final scene is not a closing template; verify the takeaway resolves.');

const section = (title, findings, empty) => [
  `## ${title}`,
  '',
  findings.length ? findings.map((item) => `- REVIEW: ${item}`).join('\n') : `- ${empty}`,
].join('\n');
const report = [
  '# Animation review preflight',
  '',
  `Project: ${project.title ?? file}`,
  '',
  'This heuristic report does not replace structural validation, rendered visual inspection, or human narrative judgment.',
  '',
  section('Visual preflight', visual, 'No heuristic visual risks found; rendered review is still required.'),
  '',
  section('Narrative and pacing preflight', narrative, 'No heuristic narrative risks found; playback review is still required.'),
  '',
  section('Source and provenance preflight', provenance, 'No heuristic provenance risks found; source accuracy still requires review.'),
  '',
].join('\n');

if (out) await writeFile(out, report, 'utf8');
else process.stdout.write(report);
