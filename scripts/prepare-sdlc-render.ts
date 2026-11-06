import { mkdir, writeFile } from 'node:fs/promises';
import { createSdlcIncidentProject } from '../src/data/sdlcIncidentProject';

const project = createSdlcIncidentProject();
project.updatedAt = '2026-11-04T00:00:00.000Z';

await mkdir('output/sdlc-video-v2', { recursive: true });
await mkdir('tmp/sdlc-narration-v2', { recursive: true });
await writeFile(
  'output/sdlc-video-v2/eighteen-hours-to-learn.animation.json',
  `${JSON.stringify(project, null, 2)}\n`,
  'utf8',
);

await Promise.all(project.scenes.map(async (scene) => {
  const text = scene.narration.map((segment) => segment.text).join(' ');
  await writeFile(`tmp/sdlc-narration-v2/${scene.id}.txt`, `${text}\n`, 'utf8');
}));

console.log(JSON.stringify({
  project: 'output/sdlc-video-v2/eighteen-hours-to-learn.animation.json',
  scenes: project.scenes.length,
  duration: project.scenes.reduce((sum, scene) => sum + scene.duration, 0),
}, null, 2));
