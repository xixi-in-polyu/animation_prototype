#!/usr/bin/env node

import { access, copyFile, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
const [inputArg, outputArg] = args;
const dpiIndex = args.indexOf('--dpi');
const dpi = dpiIndex >= 0 ? Number(args[dpiIndex + 1]) : 180;
if (!inputArg || !outputArg) {
  console.error('Usage: node render-source-pages.mjs <source.pdf|source.pptx> <pages-dir> [--dpi 300]');
  process.exit(2);
}
if (!Number.isInteger(dpi) || dpi < 72 || dpi > 600) throw new Error('--dpi must be an integer from 72 to 600.');

const input = resolve(inputArg);
const output = resolve(outputArg);
const run = (command, args) => new Promise((resolveRun, reject) => {
  const child = spawn(command, args, { stdio: 'inherit' });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolveRun() : reject(new Error(`${command} exited with ${code}`)));
});
const findCommand = async (names) => {
  for (const name of names) {
    const paths = name.includes('/') ? [name] : (process.env.PATH ?? '').split(':').map((dir) => join(dir, name));
    for (const path of paths) try { await access(path); return path; } catch { /* keep looking */ }
  }
  return undefined;
};

await mkdir(output, { recursive: true });
const temporary = await mkdtemp(join(tmpdir(), 'storyline-source-'));
try {
  let pdf = input;
  if (['.pptx', '.ppt'].includes(extname(input).toLowerCase())) {
    const soffice = await findCommand(['soffice', 'libreoffice', '/Applications/LibreOffice.app/Contents/MacOS/soffice']);
    if (!soffice) throw new Error('PPT rendering requires LibreOffice/soffice. Install it or export the source to PDF with PowerPoint for higher fidelity.');
    await run(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', temporary, input]);
    pdf = join(temporary, `${basename(input, extname(input))}.pdf`);
  }
  const pdftoppm = await findCommand(['pdftoppm']);
  if (!pdftoppm) throw new Error('Page rendering requires Poppler pdftoppm. Install Poppler and retry.');
  await run(pdftoppm, ['-png', '-r', String(dpi), pdf, join(temporary, 'page')]);
  const pages = (await readdir(temporary)).filter((name) => /^page-\d+\.png$/.test(name)).sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]));
  for (const [index, name] of pages.entries()) await copyFile(join(temporary, name), join(output, `page-${String(index + 1).padStart(3, '0')}.png`));
  console.log(`Rendered ${pages.length} page(s) at ${dpi} DPI to ${output}.`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
