#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [feedbackArg] = process.argv.slice(2);
if (!feedbackArg) {
  console.error('Usage: node check-preview-feedback.mjs <preview-feedback.json>');
  process.exit(2);
}
const feedback = JSON.parse(await readFile(resolve(feedbackArg), 'utf8'));
const pending = [];
for (const scene of feedback.scenes ?? []) {
  for (const sample of scene.samples ?? []) if (!['reviewed', 'changes-requested'].includes(sample.status)) pending.push(`${scene.sceneId}@${sample.localTime}s`);
  if (feedback.feedbackVersion === 1 && scene.transitionStatus === 'pending') pending.push(`${scene.sceneId} transition`);
  for (const [direction, transition] of Object.entries(scene.transitions ?? {})) {
    if (transition.status === 'pending') pending.push(`${scene.sceneId} ${direction} transition`);
    for (const sample of transition.samples ?? []) if (!['reviewed', 'changes-requested'].includes(sample.status)) pending.push(`${scene.sceneId} ${direction}@${sample.localTime}s`);
  }
}
for (const layer of ['structuralValidation', 'visualReview', 'narrativePacingReview', ...(feedback.feedbackVersion >= 2 ? ['audioSynchronizationReview'] : [])]) if (!['passed', 'reviewed', 'changes-requested'].includes(feedback[layer])) pending.push(layer);
if (pending.length) {
  console.error(`Preview feedback incomplete (${pending.length}): ${pending.join(', ')}`);
  process.exit(1);
}
console.log('Preview feedback complete. Review statuses remain distinct from structural validation.');
