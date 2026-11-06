import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bundle } from '@remotion/bundler';
import { openBrowser, renderStill, selectComposition } from '@remotion/renderer';
import { createSdlcIncidentProject } from '../src/data/sdlcIncidentProject';

const browserExecutable = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const project = createSdlcIncidentProject();
const outputDir = resolve('output/sdlc-video-v2/review-frames');
await mkdir(outputDir, { recursive: true });

const serveUrl = await bundle({
  entryPoint: resolve('src/remotion/index.ts'),
  publicDir: resolve('public'),
  onProgress: () => undefined,
});
const browser = await openBrowser('chrome-for-testing', {
  browserExecutable,
  chromiumOptions: { headless: true },
});
const composition = await selectComposition({
  serveUrl,
  id: 'SdlcVideo',
  browserExecutable,
  puppeteerInstance: browser,
});

let projectSeconds = 0;
for (const scene of project.scenes) {
  const samples = [0.65, scene.duration / 2, scene.duration - 0.1];
  for (const [sampleIndex, localSeconds] of samples.entries()) {
    const frame = Math.round((projectSeconds + localSeconds) * project.renderConfig.fps);
    await renderStill({
      serveUrl,
      composition,
      frame,
      imageFormat: 'png',
      output: resolve(outputDir, `${scene.id}-${sampleIndex + 1}.png`),
      browserExecutable,
      puppeteerInstance: browser,
      overwrite: true,
    });
  }
  projectSeconds += scene.duration;
}

await browser.close({ silent: true });
console.log(`Rendered ${project.scenes.length * 3} review frames to ${outputDir}`);
