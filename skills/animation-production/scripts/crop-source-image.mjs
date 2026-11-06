#!/usr/bin/env node

import { access, copyFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const args = process.argv.slice(2);
if (args.length !== 6) {
  console.error('Usage: node crop-source-image.mjs <input> <output> <x> <y> <width> <height>');
  console.error('Coordinates are normalized fractions between 0 and 1.');
  process.exit(2);
}
const [inputArg, outputArg, ...numbers] = args;
const [x, y, width, height] = numbers.map(Number);
if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) throw new Error('Crop must be a normalized box inside the image.');
const input = resolve(inputArg);
const output = resolve(outputArg);
await mkdir(dirname(output), { recursive: true });

const run = (command, commandArgs, capture = false) => new Promise((resolveRun, reject) => {
  let stdout = '';
  const child = spawn(command, commandArgs, { stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit' });
  if (capture) child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolveRun(stdout) : reject(new Error(`${command} exited with ${code}`)));
});

const has = async (path) => { try { await access(path); return true; } catch { return false; } };
const findCommand = async (names) => {
  for (const name of names) {
    const candidates = name.includes('/') ? [name] : (process.env.PATH ?? '').split(':').map((dir) => join(dir, name));
    for (const candidate of candidates) if (await has(candidate)) return candidate;
  }
  return undefined;
};
if (await has('/usr/bin/sips')) {
  const info = await run('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', input], true);
  const sourceWidth = Number(info.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const sourceHeight = Number(info.match(/pixelHeight:\s*(\d+)/)?.[1]);
  if (!sourceWidth || !sourceHeight) throw new Error('Could not read source dimensions with sips.');
  await copyFile(input, output);
  await run('/usr/bin/sips', ['--cropToHeightWidth', String(Math.round(height * sourceHeight)), String(Math.round(width * sourceWidth)), '--cropOffset', String(Math.round(y * sourceHeight)), String(Math.round(x * sourceWidth)), output]);
} else {
  const magick = await findCommand(['magick']);
  const convert = magick ? undefined : await findCommand(['convert']);
  const identify = magick ? undefined : await findCommand(['identify']);
  if (!magick && !(convert && identify)) throw new Error('Cropping requires macOS sips or ImageMagick (magick, or convert + identify).');
  const info = magick
    ? await run(magick, ['identify', '-format', '%w %h', input], true)
    : await run(identify, ['-format', '%w %h', input], true);
  const [sourceWidth, sourceHeight] = info.trim().split(/\s+/).map(Number);
  if (!sourceWidth || !sourceHeight) throw new Error('Could not read source dimensions with ImageMagick.');
  const geometry = `${Math.round(width * sourceWidth)}x${Math.round(height * sourceHeight)}+${Math.round(x * sourceWidth)}+${Math.round(y * sourceHeight)}`;
  if (magick) await run(magick, [input, '-crop', geometry, '+repage', output]);
  else await run(convert, [input, '-crop', geometry, '+repage', output]);
}
console.log(`Created ${output}.`);
