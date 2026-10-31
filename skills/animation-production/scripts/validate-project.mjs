#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import process from 'node:process';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-project.mjs <project.json>');
  process.exit(2);
}

const allowed = {
  templates: new Set(['opening', 'concept', 'process', 'comparison', 'incident', 'architecture', 'closing']),
  captions: new Set(['bottom', 'side', 'keywords', 'hidden']),
  elements: new Set(['title', 'text', 'cards', 'lifecycle', 'flow', 'comparison', 'timeline', 'metrics', 'topology', 'formula', 'badge']),
  visuals: new Set(['auto', 'grid', 'rail', 'split', 'orbital', 'editorial', 'diagram', 'poster', 'minimal']),
  surfaces: new Set(['none', 'soft', 'outline']),
  transitions: new Set(['fade', 'slide-left', 'slide-up', 'wipe']),
  enter: new Set(['fade-rise', 'spring-scale', 'wipe-reveal', 'draw']),
  beat: new Set(['pulse', 'lift', 'focus', 'glow', 'trace', 'count-up']),
  exit: new Set(['fade', 'slide', 'shrink']),
  ambient: new Set(['none', 'drift', 'breathe', 'orbit']),
};

const issues = [];
const error = (path, message) => issues.push({ severity: 'error', path, message });
const warning = (path, message) => issues.push({ severity: 'warning', path, message });
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const positive = (value) => Number.isFinite(value) && value > 0;

let project;
try {
  project = JSON.parse(await readFile(file, 'utf8'));
} catch (cause) {
  console.error(`Could not read valid JSON from ${file}: ${cause.message}`);
  process.exit(2);
}

if (!project || typeof project !== 'object' || Array.isArray(project)) {
  error('$', 'Project must be a JSON object.');
} else {
  if (project.schemaVersion !== 4) error('schemaVersion', 'Expected schema version 4.');
  for (const key of ['id', 'title', 'description', 'locale', 'createdAt', 'updatedAt']) {
    if (!nonEmpty(project[key])) error(key, `${key} must be a non-empty string.`);
  }
  if (!project.renderConfig || !Number.isInteger(project.renderConfig.fps) || project.renderConfig.fps <= 0) error('renderConfig.fps', 'FPS must be a positive integer.');
  if (!project.renderConfig || !positive(project.renderConfig.width) || !positive(project.renderConfig.height)) error('renderConfig', 'Render dimensions must be positive.');
  for (const key of ['sourceDocuments', 'knowledgeNodes', 'chapters', 'scenes', 'assets']) {
    if (!Array.isArray(project[key])) error(key, `${key} must be an array.`);
  }
  if (Array.isArray(project.chapters) && project.chapters.length === 0) error('chapters', 'At least one chapter is required.');
  if (Array.isArray(project.scenes) && project.scenes.length === 0) error('scenes', 'At least one scene is required.');

  const chapterIds = new Set();
  for (const [index, chapter] of (project.chapters ?? []).entries()) {
    const path = `chapters[${index}]`;
    if (!nonEmpty(chapter?.id)) error(`${path}.id`, 'Chapter ID is required.');
    else if (chapterIds.has(chapter.id)) error(`${path}.id`, 'Chapter ID must be unique.');
    else chapterIds.add(chapter.id);
    for (const key of ['title', 'shortTitle', 'color']) if (!nonEmpty(chapter?.[key])) error(`${path}.${key}`, `${key} is required.`);
  }

  const sceneIds = new Set();
  for (const [sceneIndex, scene] of (project.scenes ?? []).entries()) {
    const base = `scenes[${sceneIndex}]`;
    if (!nonEmpty(scene?.id)) error(`${base}.id`, 'Scene ID is required.');
    else if (sceneIds.has(scene.id)) error(`${base}.id`, 'Scene ID must be unique.');
    else sceneIds.add(scene.id);
    if (!chapterIds.has(scene?.chapterId)) error(`${base}.chapterId`, 'Scene references an unknown chapter.');
    if (!nonEmpty(scene?.title)) error(`${base}.title`, 'Scene title is required.');
    if (!allowed.templates.has(scene?.template)) error(`${base}.template`, 'Unsupported scene template.');
    if (!positive(scene?.duration)) error(`${base}.duration`, 'Scene duration must be positive.');
    if (!allowed.captions.has(scene?.captionMode)) error(`${base}.captionMode`, 'Unsupported caption mode.');
    if (!Array.isArray(scene?.narration)) error(`${base}.narration`, 'Narration must be an array.');
    if (!Array.isArray(scene?.elements)) error(`${base}.elements`, 'Elements must be an array.');
    if (!Array.isArray(scene?.knowledgeNodeIds)) error(`${base}.knowledgeNodeIds`, 'knowledgeNodeIds must be an array.');
    if (scene?.transitionOut) {
      if (!allowed.transitions.has(scene.transitionOut.preset)) error(`${base}.transitionOut.preset`, 'Unsupported transition.');
      if (!positive(scene.transitionOut.duration) || scene.transitionOut.duration >= scene.duration) error(`${base}.transitionOut.duration`, 'Transition must be positive and shorter than the scene.');
    }

    const narrationIds = new Set();
    for (const [index, segment] of (scene?.narration ?? []).entries()) {
      const path = `${base}.narration[${index}]`;
      if (!nonEmpty(segment?.id)) error(`${path}.id`, 'Narration ID is required.');
      else if (narrationIds.has(segment.id)) error(`${path}.id`, 'Narration ID must be unique in the scene.');
      else narrationIds.add(segment.id);
      if (!nonEmpty(segment?.text)) error(`${path}.text`, 'Narration text is required.');
      if (!Number.isFinite(segment?.start) || !Number.isFinite(segment?.end) || segment.start < 0 || segment.end <= segment.start || segment.end > scene.duration) error(path, 'Narration timing is outside the scene.');
    }

    const elementIds = new Set();
    for (const [elementIndex, element] of (scene?.elements ?? []).entries()) {
      const path = `${base}.elements[${elementIndex}]`;
      if (!nonEmpty(element?.id)) error(`${path}.id`, 'Element ID is required.');
      else if (elementIds.has(element.id)) error(`${path}.id`, 'Element ID must be unique in the scene.');
      else elementIds.add(element.id);
      if (!allowed.elements.has(element?.type)) error(`${path}.type`, 'Unsupported element type.');
      if (!nonEmpty(element?.content) && !(Array.isArray(element?.items) && element.items.length)) error(path, 'Element needs content or items.');
      for (const key of ['x', 'y', 'width', 'height']) if (!Number.isFinite(element?.[key])) error(`${path}.${key}`, `${key} must be numeric.`);
      if (Number.isFinite(element?.x) && Number.isFinite(element?.y) && Number.isFinite(element?.width) && Number.isFinite(element?.height) && (element.x < 0 || element.y < 0 || element.x + element.width > 100 || element.y + element.height > 100)) warning(path, 'Element extends outside the canvas.');
      if (!allowed.visuals.has(element?.visual?.variant)) error(`${path}.visual.variant`, 'Unsupported visual variant.');
      if (!allowed.surfaces.has(element?.visual?.surface)) error(`${path}.visual.surface`, 'Unsupported surface style.');
      if (element?.type === 'flow' && (element?.items?.length ?? 0) > 9) warning(`${path}.items`, 'Flow has more than 9 steps; split it.');

      const itemIds = new Set();
      for (const [itemIndex, item] of (element?.items ?? []).entries()) {
        const itemPath = `${path}.items[${itemIndex}]`;
        if (!nonEmpty(item?.id) || itemIds.has(item.id)) error(`${itemPath}.id`, 'Item ID must be present and unique.');
        else itemIds.add(item.id);
        if (!nonEmpty(item?.label)) error(`${itemPath}.label`, 'Item label is required.');
      }

      const motion = element?.motion;
      if (!motion?.enter || !Array.isArray(motion?.beats)) {
        error(`${path}.motion`, 'Motion requires enter and beats.');
        continue;
      }
      if (!allowed.enter.has(motion.enter.preset)) error(`${path}.motion.enter.preset`, 'Unsupported enter preset.');
      for (const [index, cue] of motion.beats.entries()) if (!allowed.beat.has(cue?.preset)) error(`${path}.motion.beats[${index}].preset`, 'Unsupported beat preset.');
      if (motion.exit && !allowed.exit.has(motion.exit.preset)) error(`${path}.motion.exit.preset`, 'Unsupported exit preset.');
      if (!allowed.ambient.has(motion.ambient ?? 'none')) error(`${path}.motion.ambient`, 'Unsupported ambient preset.');

      const cueIds = new Set();
      const cues = [motion.enter, ...motion.beats, ...(motion.exit ? [motion.exit] : [])];
      for (const [cueIndex, cue] of cues.entries()) {
        const cuePath = `${path}.motion.cues[${cueIndex}]`;
        if (!nonEmpty(cue?.id) || cueIds.has(cue.id)) error(`${cuePath}.id`, 'Cue ID must be present and unique.');
        else cueIds.add(cue.id);
        if (!positive(cue?.duration)) error(`${cuePath}.duration`, 'Cue duration must be positive.');
        let start;
        if (cue?.trigger?.type === 'time') start = cue.trigger.at;
        else if (cue?.trigger?.type === 'narration') {
          const segment = (scene.narration ?? []).find((candidate) => candidate.id === cue.trigger.segmentId);
          if (segment) start = segment.start + (cue.trigger.offset ?? 0);
        }
        if (!Number.isFinite(start)) error(`${cuePath}.trigger`, 'Cue trigger is invalid or references unknown narration.');
        else if (start < 0 || start + cue.duration > scene.duration + 0.001) error(cuePath, 'Cue extends outside the scene.');
      }
    }
  }
}

for (const issue of issues) console.log(`${issue.severity.toUpperCase()} ${issue.path}: ${issue.message}`);
const errorCount = issues.filter((issue) => issue.severity === 'error').length;
const warningCount = issues.length - errorCount;
if (errorCount) {
  console.error(`Validation failed: ${errorCount} error(s), ${warningCount} warning(s).`);
  process.exit(1);
}
console.log(`Validation passed: 0 errors, ${warningCount} warning(s).`);
