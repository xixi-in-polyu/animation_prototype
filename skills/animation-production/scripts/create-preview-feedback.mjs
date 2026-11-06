#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const args = process.argv.slice(2);
const projectPath = resolve(args[0] ?? '');
const outIndex = args.indexOf('--out');
const output = outIndex >= 0 ? resolve(args[outIndex + 1] ?? '') : undefined;
if (!args[0] || !output) {
  console.error('Usage: node create-preview-feedback.mjs <project.json> --out preview-feedback.json');
  process.exit(2);
}
const project = JSON.parse(await readFile(projectPath, 'utf8'));
let projectTime = 0;
const clampTime = (scene, time) => Number(Math.min(scene.duration - 0.01, Math.max(0, time)).toFixed(3));
const transitionSamples = (scene, start, duration) => duration > 0
  ? [start + 0.01, start + duration / 2, start + duration - 0.01].map((time) => ({ localTime: clampTime(scene, time), status: 'pending', notes: '' }))
  : [];
const scenes = project.scenes.map((scene, index) => {
  const incomingDuration = index > 0 ? project.scenes[index - 1].transitionOut?.duration ?? 0 : 0;
  const outgoingDuration = scene.transitionOut?.duration ?? 0;
  const stableStart = Math.min(scene.duration / 2, incomingDuration + 0.1);
  const stableEnd = Math.max(stableStart, scene.duration - outgoingDuration - 0.1);
  const sampleTimes = [...new Set([stableStart, scene.duration / 2, stableEnd].map((time) => clampTime(scene, time)))];
  const result = {
    sceneId: scene.id,
    sceneTitle: scene.title,
    samples: sampleTimes.map((localTime) => ({ localTime, projectTime: Number((projectTime + localTime).toFixed(3)), status: 'pending', visualNotes: '', narrativeNotes: '' })),
    transitions: {
      incoming: {
        duration: incomingDuration,
        status: incomingDuration > 0 ? 'pending' : 'not-applicable',
        samples: transitionSamples(scene, 0, incomingDuration),
      },
      outgoing: {
        duration: outgoingDuration,
        status: outgoingDuration > 0 ? 'pending' : 'not-applicable',
        samples: transitionSamples(scene, scene.duration - outgoingDuration, outgoingDuration),
      },
    },
  };
  projectTime += scene.duration;
  return result;
});
const feedback = {
  feedbackVersion: 2,
  projectId: project.id,
  projectUpdatedAt: project.updatedAt,
  structuralValidation: 'pending',
  visualReview: 'pending',
  narrativePacingReview: 'pending',
  audioSynchronizationReview: 'pending',
  scenes,
  note: 'Validator success does not change pending review states. Inspect every stable sample and incoming/outgoing transition sample, verify narrated audio synchronization, revise, then regenerate feedback for changed scenes.',
};
await writeFile(output, `${JSON.stringify(feedback, null, 2)}\n`);
const frameCount = scenes.reduce((sum, scene) => sum + scene.samples.length + scene.transitions.incoming.samples.length + scene.transitions.outgoing.samples.length, 0);
console.log(`Created ${output} with ${frameCount} representative frame(s).`);
