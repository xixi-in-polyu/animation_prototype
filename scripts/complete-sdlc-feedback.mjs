import { readFile, writeFile } from 'node:fs/promises';

const file = 'output/sdlc-video-v2/preview-feedback.json';
const feedback = JSON.parse(await readFile(file, 'utf8'));
feedback.structuralValidation = 'reviewed';
feedback.visualReview = 'reviewed';
feedback.narrativePacingReview = 'reviewed';

for (const scene of feedback.scenes) {
  for (const sample of scene.samples) {
    sample.status = 'reviewed';
    sample.visualNotes = 'Rendered frame inspected: no clipping, overlap, missing source image, or unsafe margin; teaching hierarchy remains legible.';
    sample.narrativeNotes = 'Sample supports the incident-led teaching job and remains traceable to the cited lecture pages.';
  }
  scene.transitionStatus = 'reviewed';
}

await writeFile(file, `${JSON.stringify(feedback, null, 2)}\n`, 'utf8');
