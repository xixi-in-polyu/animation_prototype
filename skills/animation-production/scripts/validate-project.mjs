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
  elements: new Set(['title', 'text', 'cards', 'lifecycle', 'flow', 'comparison', 'timeline', 'metrics', 'topology', 'diagram', 'formula', 'badge', 'image', 'code']),
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
  if (project.schemaVersion !== 5) error('schemaVersion', 'Expected schema version 5.');
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

  const sourceDocumentIds = new Set();
  const sourceDocumentsById = new Map();
  for (const [index, document] of (project.sourceDocuments ?? []).entries()) {
    const path = `sourceDocuments[${index}]`;
    if (!nonEmpty(document?.id) || sourceDocumentIds.has(document.id)) error(`${path}.id`, 'Source-document ID must be present and unique.');
    else { sourceDocumentIds.add(document.id); sourceDocumentsById.set(document.id, document); }
    if (!nonEmpty(document?.name)) error(`${path}.name`, 'Source document name is required.');
    if (!Number.isInteger(document?.pageCount) || document.pageCount <= 0) error(`${path}.pageCount`, 'Source document pageCount must be a positive integer.');
    for (const [blockIndex, block] of (document?.contentBlocks ?? []).entries()) {
      const blockPath = `${path}.contentBlocks[${blockIndex}]`;
      if (!nonEmpty(block?.id)) error(`${blockPath}.id`, 'Content block ID is required.');
      if (!Number.isInteger(block?.page) || block.page < 1 || block.page > document.pageCount) error(`${blockPath}.page`, 'Content block page is outside the source document.');
    }
  }
  const knowledgeNodeIds = new Set();
  for (const [index, node] of (project.knowledgeNodes ?? []).entries()) {
    const path = `knowledgeNodes[${index}]`;
    if (!nonEmpty(node?.id) || knowledgeNodeIds.has(node.id)) error(`${path}.id`, 'Knowledge-node ID must be present and unique.');
    else knowledgeNodeIds.add(node.id);
    if (!['concept', 'relationship', 'example', 'formula'].includes(node?.kind)) error(`${path}.kind`, 'Unsupported knowledge-node kind.');
    if (!nonEmpty(node?.title) || !nonEmpty(node?.summary)) error(path, 'Knowledge node needs a title and summary.');
    const source = sourceDocumentsById.get(node?.sourceDocumentId);
    if (!source) error(`${path}.sourceDocumentId`, 'Knowledge node references an unknown source document.');
    if (!Array.isArray(node?.sourcePages) || !node.sourcePages.length) error(`${path}.sourcePages`, 'Knowledge node needs source pages.');
    for (const [pageIndex, page] of (node?.sourcePages ?? []).entries()) if (!source || !Number.isInteger(page) || page < 1 || page > source.pageCount) error(`${path}.sourcePages[${pageIndex}]`, 'Knowledge-node page is outside its source document.');
  }
  for (const [index, node] of (project.knowledgeNodes ?? []).entries()) for (const [relatedIndex, id] of (node?.relatedNodeIds ?? []).entries()) if (!knowledgeNodeIds.has(id)) error(`knowledgeNodes[${index}].relatedNodeIds[${relatedIndex}]`, 'Unknown related knowledge node.');
  const assetIds = new Set();
  const assetsById = new Map();
  for (const [assetIndex, asset] of (project.assets ?? []).entries()) {
    const path = `assets[${assetIndex}]`;
    if (!nonEmpty(asset?.id) || assetIds.has(asset.id)) error(`${path}.id`, 'Asset ID must be present and unique.');
    else { assetIds.add(asset.id); assetsById.set(asset.id, asset); }
    if (!nonEmpty(asset?.uri)) error(`${path}.uri`, 'Asset URI is required.');
    if (/^(?:file:\/\/|\/|[A-Za-z]:[\\/])/.test(asset?.uri ?? '')) error(`${path}.uri`, 'Asset URI must not be an absolute filesystem path.');
    if (/^https?:\/\//.test(asset?.uri ?? '')) warning(`${path}.uri`, 'Remote asset should be embedded or copied for deterministic rendering.');
    if ((asset?.uri ?? '').split(/[\\/]/).includes('..')) error(`${path}.uri`, 'Asset URI must stay inside the project package.');
    if (asset?.sha256 && !/^[a-f\d]{64}$/i.test(asset.sha256)) error(`${path}.sha256`, 'SHA-256 must contain 64 hexadecimal characters.');
    if (asset?.source?.documentId && !sourceDocumentIds.has(asset.source.documentId)) error(`${path}.source.documentId`, 'Asset references an unknown source document.');
    const assetSource = sourceDocumentsById.get(asset?.source?.documentId);
    const assetPage = asset?.source?.page ?? asset?.source?.slide;
    if (assetPage !== undefined && (!assetSource || !Number.isInteger(assetPage) || assetPage < 1 || assetPage > assetSource.pageCount)) error(`${path}.source`, 'Asset source page/slide is outside its source document.');
  }

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
    for (const [nodeIndex, id] of (scene?.knowledgeNodeIds ?? []).entries()) if (!knowledgeNodeIds.has(id)) error(`${base}.knowledgeNodeIds[${nodeIndex}]`, 'Scene references an unknown knowledge node.');
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
      if (!nonEmpty(element?.content) && !(Array.isArray(element?.items) && element.items.length) && !(element?.type === 'image' && nonEmpty(element?.assetId)) && !(element?.type === 'diagram' && element.diagram?.nodes?.length)) error(path, 'Element needs content, items, a diagram, or an image asset.');
      for (const key of ['x', 'y', 'width', 'height']) if (!Number.isFinite(element?.[key])) error(`${path}.${key}`, `${key} must be numeric.`);
      if (Number.isFinite(element?.x) && Number.isFinite(element?.y) && Number.isFinite(element?.width) && Number.isFinite(element?.height) && (element.x < 0 || element.y < 0 || element.x + element.width > 100 || element.y + element.height > 100)) warning(path, 'Element extends outside the canvas.');
      if (!allowed.visuals.has(element?.visual?.variant)) error(`${path}.visual.variant`, 'Unsupported visual variant.');
      if (!allowed.surfaces.has(element?.visual?.surface)) error(`${path}.visual.surface`, 'Unsupported surface style.');
      if (element?.type === 'flow' && (element?.items?.length ?? 0) > 9) warning(`${path}.items`, 'Flow has more than 9 steps; split it.');
      if (element?.type === 'metrics' && (element?.items?.length ?? 0) === 3) warning(`${path}.items`, 'Three metrics require the three-column layout; inspect label width at playback size.');
      if (project.sourceDocuments?.length === 1) for (const [pageIndex, page] of (element?.sourcePages ?? []).entries()) if (!Number.isInteger(page) || page < 1 || page > project.sourceDocuments[0].pageCount) error(`${path}.sourcePages[${pageIndex}]`, 'Element source page is outside the project source document.');
      else if (project.sourceDocuments?.length > 1 && (element?.sourcePages ?? []).length) warning(`${path}.sourcePages`, 'Element page provenance is ambiguous with multiple source documents; use asset/source references where possible.');
      if (element?.type === 'diagram') {
        const graph = element.diagram;
        if (!Array.isArray(graph?.nodes) || !graph.nodes.length || !Array.isArray(graph?.edges)) error(`${path}.diagram`, 'Diagram requires nodes and an edges array.');
        else {
          const nodeIds = new Set();
          for (const [index, node] of graph.nodes.entries()) {
            const nodePath = `${path}.diagram.nodes[${index}]`;
            if (!nonEmpty(node.id) || nodeIds.has(node.id)) error(`${nodePath}.id`, 'Node ID must be unique and nonempty.');
            nodeIds.add(node.id);
            if (!nonEmpty(node.label)) error(`${nodePath}.label`, 'Node label is required.');
            if (![node.x, node.y, node.width, node.height].every(Number.isFinite) || node.x < 0 || node.y < 0 || node.width <= 0 || node.height <= 0 || node.x + node.width > 100 || node.y + node.height > 100) error(nodePath, 'Node must fit inside diagram percent coordinates.');
            if (node.revealAt !== undefined && (!Number.isFinite(node.revealAt) || node.revealAt < 0 || node.revealAt >= scene.duration)) error(`${nodePath}.revealAt`, 'Node reveal time must be inside the scene.');
            if (node.tone && !['primary', 'secondary', 'neutral'].includes(node.tone)) error(`${nodePath}.tone`, 'Unsupported node tone.');
          }
          const edgeIds = new Set();
          for (const [index, edge] of graph.edges.entries()) {
            const edgePath = `${path}.diagram.edges[${index}]`;
            if (!nonEmpty(edge.id) || edgeIds.has(edge.id)) error(`${edgePath}.id`, 'Edge ID must be unique and nonempty.');
            edgeIds.add(edge.id);
            if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to) || edge.from === edge.to) error(edgePath, 'Edge must connect two distinct existing nodes.');
            if (edge.revealAt !== undefined && (!Number.isFinite(edge.revealAt) || edge.revealAt < 0 || edge.revealAt >= scene.duration)) error(`${edgePath}.revealAt`, 'Edge reveal time must be inside the scene.');
            if (edge.kind && !['directed', 'undirected'].includes(edge.kind)) error(`${edgePath}.kind`, 'Unsupported edge kind.');
          }
        }
      }
      if (element?.type === 'image') {
        const asset = assetsById.get(element.assetId);
        if (!asset) error(`${path}.assetId`, 'Image element must reference an existing asset.');
        else if (asset.kind !== 'image') error(`${path}.assetId`, 'Image element must reference an image asset.');
        if (!nonEmpty(element.alt)) error(`${path}.alt`, 'Image element requires alternative text.');
        if (element.fit && !['contain', 'cover'].includes(element.fit)) error(`${path}.fit`, 'Image fit must be contain or cover.');
      }
      if (element?.type === 'code') {
        if (!nonEmpty(element.language)) error(`${path}.language`, 'Code element requires a language.');
        if (!element.codeSource?.extraction) error(`${path}.codeSource`, 'Code element requires source provenance.');
        if (!['exact', 'syntax', 'display-only'].includes(element.codeVerification)) error(`${path}.codeVerification`, 'Code verification must be exact, syntax, or display-only.');
        if (element.codeSource?.file && (/^(?:file:\/\/|\/|[A-Za-z]:[\\/])/.test(element.codeSource.file) || element.codeSource.file.split(/[\\/]/).includes('..'))) error(`${path}.codeSource.file`, 'Code source file must stay inside the repository.');
        const lineCount = String(element.content ?? '').split('\n').length;
        for (const [lineIndex, line] of (element.highlightLines ?? []).entries()) if (!Number.isInteger(line) || line < 1 || line > lineCount) error(`${path}.highlightLines[${lineIndex}]`, 'Highlighted line is outside the code block.');
        if (element.codeVerification === 'exact' && (element.codeSource?.extraction !== 'repository' || !positive(element.codeSource?.startLine) || !positive(element.codeSource?.endLine))) error(`${path}.codeVerification`, 'Exact verification requires repository provenance and a line range.');
        if (positive(element.codeSource?.startLine) && positive(element.codeSource?.endLine) && element.codeSource.endLine < element.codeSource.startLine) error(`${path}.codeSource.endLine`, 'Code source end line precedes its start line.');
        const presentation = element.codePresentation;
        if (presentation) {
          if (presentation.theme && !['github-dark', 'carbon-dark'].includes(presentation.theme)) error(`${path}.codePresentation.theme`, 'Unsupported code theme.');
          if (presentation.windowChrome && !['toolbar', 'mac', 'none'].includes(presentation.windowChrome)) error(`${path}.codePresentation.windowChrome`, 'Unsupported code window chrome.');
          if (presentation.backdrop && !['none', 'soft-gray', 'soft-gray-gradient'].includes(presentation.backdrop)) error(`${path}.codePresentation.backdrop`, 'Unsupported code backdrop.');
          if (presentation.showLineNumbers !== undefined && typeof presentation.showLineNumbers !== 'boolean') error(`${path}.codePresentation.showLineNumbers`, 'showLineNumbers must be boolean.');
          if (presentation.fontSize !== undefined && (!Number.isFinite(presentation.fontSize) || presentation.fontSize < 12 || presentation.fontSize > 36)) error(`${path}.codePresentation.fontSize`, 'Code font size must be from 12 to 36 pixels.');
          if (presentation.padding !== undefined && (!Number.isFinite(presentation.padding) || presentation.padding < 0 || presentation.padding > 72)) error(`${path}.codePresentation.padding`, 'Code padding must be from 0 to 72 pixels.');
          if (presentation.frameInset !== undefined && (!Number.isFinite(presentation.frameInset) || presentation.frameInset < 0 || presentation.frameInset > 240)) error(`${path}.codePresentation.frameInset`, 'Horizontal code frame inset must be from 0 to 240 pixels.');
          if (presentation.frameInsetY !== undefined && (!Number.isFinite(presentation.frameInsetY) || presentation.frameInsetY < 0 || presentation.frameInsetY > 300)) error(`${path}.codePresentation.frameInsetY`, 'Vertical code frame inset must be from 0 to 300 pixels.');
        }
      }

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
