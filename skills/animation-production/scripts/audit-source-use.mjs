#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [sourceArg, planArg, projectArg] = process.argv.slice(2);
if (!sourceArg || !planArg || !projectArg) {
  console.error('Usage: node audit-source-use.mjs <source-package.json> <source-use-plan.json> <project.json>');
  process.exit(2);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
let sourcePackage;
let plan;
let project;
try {
  [sourcePackage, plan, project] = await Promise.all([readJson(sourceArg), readJson(planArg), readJson(projectArg)]);
} catch (cause) {
  console.error(`Could not read audit input: ${cause.message}`);
  process.exit(2);
}

const errors = [];
const warnings = [];
const error = (path, message) => errors.push({ path, message });
const warning = (path, message) => warnings.push({ path, message });
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const unique = (values) => new Set(values ?? []);
const allowedModes = new Set(['source-forward', 'balanced', 'reconstruction-first']);
const allowedChosen = new Set(['original', 'crop', 'reconstruct', 'show-then-reconstruct', 'text-only', 'exclude']);
const allowedDispositions = new Set(['used-original', 'used-crop', 'used-reconstruct', 'used-show-then-reconstruct', 'used-text-only', 'reference-only', 'excluded']);
const expectedDisposition = {
  original: 'used-original',
  crop: 'used-crop',
  reconstruct: 'used-reconstruct',
  'show-then-reconstruct': 'used-show-then-reconstruct',
  'text-only': 'used-text-only',
};

const planVersion = plan?.sourceUsePlanVersion;
if (![1, 2].includes(planVersion)) error('sourceUsePlanVersion', 'Expected SourceUsePlan version 1 or 2.');
if (planVersion === 1) warning('sourceUsePlanVersion', 'Version 1 is supported for compatibility; migrate to the planned/final version 2 contract.');
if (planVersion === 2 && plan?.status !== 'final') error('status', 'Source-use audit requires a final version 2 plan.');
if (plan?.projectId !== project?.id) error('projectId', 'Plan projectId does not match the AnimationProject.');
if (plan?.documentId !== sourcePackage?.document?.id) error('documentId', 'Plan documentId does not match the SourcePackage.');
if (plan?.documentSha256 !== sourcePackage?.document?.sha256) error('documentSha256', 'Plan document hash does not match the SourcePackage.');
if (!allowedModes.has(plan?.mode)) error('mode', 'Unsupported source-use mode.');
if (!nonEmpty(plan?.learningGoal)) error('learningGoal', 'Learning goal is required.');
if (!Array.isArray(plan?.items)) error('items', 'Plan items must be an array.');

const claims = new Map((sourcePackage.claims ?? []).map((item) => [item.id, item]));
const nodes = new Map((sourcePackage.knowledgeNodes ?? []).map((item) => [item.id, item]));
const visuals = new Map((sourcePackage.visualCandidates ?? []).map((item) => [item.id, item]));
const approvedVisuals = new Map([...visuals].filter(([, item]) => item.review?.status === 'approved'));
const sourceAssets = new Map((sourcePackage.assets ?? []).map((item) => [item.id, item]));
const projectAssets = new Map((project.assets ?? []).map((item) => [item.id, item]));
const scenes = new Map((project.scenes ?? []).map((item) => [item.id, item]));
const projectElements = new Map();
for (const scene of (project.scenes ?? [])) for (const element of (scene.elements ?? [])) projectElements.set(element.id, { element, sceneId: scene.id });

const selectedClaims = unique(plan?.selectedClaimIds);
const selectedNodes = unique(plan?.selectedKnowledgeNodeIds);
for (const [index, id] of (plan?.selectedClaimIds ?? []).entries()) if (!claims.has(id)) error(`selectedClaimIds[${index}]`, `Unknown claim: ${id}.`);
for (const [index, id] of (plan?.selectedKnowledgeNodeIds ?? []).entries()) if (!nodes.has(id)) error(`selectedKnowledgeNodeIds[${index}]`, `Unknown knowledge node: ${id}.`);

const coveredClaims = new Set();
const coveredNodes = new Set();
const candidatePlans = new Map();
const dispositionCounts = new Map();
const planItemIds = new Set();

if (plan?.allReconstructionReviewedAssetIds !== undefined && !Array.isArray(plan.allReconstructionReviewedAssetIds)) error('allReconstructionReviewedAssetIds', 'Expected an array of source asset IDs.');
for (const [index, id] of (plan?.allReconstructionReviewedAssetIds ?? []).entries()) if (!sourceAssets.has(id)) error(`allReconstructionReviewedAssetIds[${index}]`, `Unknown source asset: ${id}.`);

for (const [index, item] of (plan?.items ?? []).entries()) {
  const path = `items[${index}]`;
  if (!nonEmpty(item?.id) || planItemIds.has(item.id)) error(`${path}.id`, 'Plan-item ID must be present and unique.');
  else planItemIds.add(item.id);
  if (!allowedChosen.has(item?.chosenMode)) error(`${path}.chosenMode`, 'Unsupported chosen mode.');
  const implementation = planVersion === 2 ? item?.implementation : {
    targetSceneIds: item?.targetSceneIds,
    projectAssetIds: item?.projectAssetIds,
    primaryElementId: (item?.projectElementIds ?? [])[0],
    companionElementIds: (item?.projectElementIds ?? []).slice(1),
    finalDisposition: item?.finalDisposition,
  };
  const targetSceneIds = implementation?.targetSceneIds ?? [];
  const projectAssetIds = implementation?.projectAssetIds ?? [];
  const primaryElementId = implementation?.primaryElementId;
  const companionElementIds = implementation?.companionElementIds ?? [];
  const projectElementIds = [...new Set([primaryElementId, ...companionElementIds].filter(Boolean))];
  const finalDisposition = implementation?.finalDisposition;
  if (planVersion === 2 && !implementation) error(`${path}.implementation`, 'Final plan item requires implementation details.');
  if (!allowedDispositions.has(finalDisposition)) error(`${path}.implementation.finalDisposition`, 'Unsupported final disposition.');
  if (expectedDisposition[item?.chosenMode] && finalDisposition !== expectedDisposition[item.chosenMode]) error(`${path}.implementation.finalDisposition`, `Expected ${expectedDisposition[item.chosenMode]} for chosenMode ${item.chosenMode}.`);
  if (item?.chosenMode === 'exclude' && !['excluded', 'reference-only'].includes(finalDisposition)) error(`${path}.implementation.finalDisposition`, 'Excluded material must end as excluded or reference-only.');
  if (!nonEmpty(item?.reason)) error(`${path}.reason`, 'A concrete source-use reason is required.');
  if (!['evidence', 'mechanism', 'process', 'comparison', 'example', 'orientation', 'atmosphere'].includes(item?.teachingJob)) error(`${path}.teachingJob`, 'Unsupported teaching job.');
  if (!['approved', 'needs-crop', 'too-dense'].includes(item?.legibilityStatus)) error(`${path}.legibilityStatus`, 'Unsupported legibility status.');
  if (!['allowed', 'reference-only', 'unknown'].includes(item?.permissionStatus)) error(`${path}.permissionStatus`, 'Unsupported permission status.');
  for (const id of (item?.claimIds ?? [])) {
    if (!claims.has(id)) error(`${path}.claimIds`, `Unknown claim: ${id}.`);
    coveredClaims.add(id);
  }
  for (const id of (item?.knowledgeNodeIds ?? [])) {
    if (!nodes.has(id)) error(`${path}.knowledgeNodeIds`, `Unknown knowledge node: ${id}.`);
    coveredNodes.add(id);
  }
  for (const id of (item?.visualCandidateIds ?? [])) {
    if (!visuals.has(id)) error(`${path}.visualCandidateIds`, `Unknown visual candidate: ${id}.`);
    const uses = candidatePlans.get(id) ?? [];
    uses.push({ item, path });
    candidatePlans.set(id, uses);
  }
  for (const id of targetSceneIds) if (!scenes.has(id)) error(`${path}.implementation.targetSceneIds`, `Unknown target scene: ${id}.`);
  for (const id of projectAssetIds) if (!projectAssets.has(id)) error(`${path}.implementation.projectAssetIds`, `Unknown project asset: ${id}.`);
  for (const id of projectElementIds) {
    const target = projectElements.get(id);
    if (!target) error(`${path}.implementation`, `Unknown project element: ${id}.`);
    else if (targetSceneIds.length && !targetSceneIds.includes(target.sceneId)) error(`${path}.implementation`, `Element ${id} is outside the final target scenes.`);
  }

  const active = !['excluded', 'reference-only'].includes(finalDisposition);
  if (active && !targetSceneIds.length) error(`${path}.implementation.targetSceneIds`, 'Implemented source use needs at least one target scene.');
  if (['original', 'crop'].includes(item?.chosenMode)) {
    if (!projectAssetIds.length) error(`${path}.implementation.projectAssetIds`, 'Original/crop use needs a project asset.');
    const primary = projectElements.get(primaryElementId)?.element;
    if (!primary || primary.type !== 'image') error(`${path}.implementation.primaryElementId`, 'Original/crop use needs an image primary element; companion elements may use any type.');
  }
  if (item?.chosenMode === 'show-then-reconstruct') {
    if (!projectAssetIds.length) error(`${path}.implementation.projectAssetIds`, 'Show-then-reconstruct needs a source image asset.');
    if (projectElements.get(primaryElementId)?.element?.type !== 'image') error(`${path}.implementation.primaryElementId`, 'Show-then-reconstruct needs an image primary element.');
    if (!companionElementIds.some((id) => projectElements.get(id)?.element?.type !== 'image')) error(`${path}.implementation.companionElementIds`, 'Show-then-reconstruct needs a reconstructed companion element.');
  }
  if (item?.chosenMode === 'reconstruct' && !projectElementIds.some((id) => projectElements.get(id)?.element?.type !== 'image')) error(`${path}.implementation`, 'Reconstruction needs at least one non-image project element.');

  for (const visualId of (item?.visualCandidateIds ?? [])) {
    const visual = visuals.get(visualId);
    if (!visual || ['excluded', 'reference-only'].includes(finalDisposition)) continue;
    if (['original', 'crop', 'show-then-reconstruct'].includes(item?.chosenMode)) {
      const plannedAssets = projectAssetIds.map((id) => projectAssets.get(id)).filter(Boolean);
      if (!plannedAssets.some((asset) => asset.source?.documentId === plan.documentId && (asset.source?.page === visual.page || asset.source?.slide === visual.page))) error(`${path}.implementation.projectAssetIds`, `No project asset preserves page ${visual.page} provenance for ${visualId}.`);
      const plannedImages = projectElementIds.map((id) => projectElements.get(id)?.element).filter((element) => element?.type === 'image');
      if (!plannedImages.some((element) => projectAssetIds.includes(element.assetId))) error(`${path}.implementation`, `No planned image element references a planned source asset for ${visualId}.`);
    }
    if (['reconstruct', 'show-then-reconstruct'].includes(item?.chosenMode)) {
      const reconstructed = projectElementIds.map((id) => projectElements.get(id)?.element).filter((element) => element && element.type !== 'image');
      if (!reconstructed.some((element) => (element.sourcePages ?? []).includes(visual.page))) error(`${path}.implementation`, `Reconstruction does not preserve source page ${visual.page} provenance for ${visualId}.`);
    }
  }

  dispositionCounts.set(finalDisposition, (dispositionCounts.get(finalDisposition) ?? 0) + 1);
}

for (const id of selectedClaims) if (!coveredClaims.has(id)) error('selectedClaimIds', `Selected claim has no SourceUsePlan item: ${id}.`);
for (const id of selectedNodes) if (!coveredNodes.has(id)) error('selectedKnowledgeNodeIds', `Selected knowledge node has no SourceUsePlan item: ${id}.`);
for (const id of coveredClaims) if (!selectedClaims.has(id)) warning('items.claimIds', `Plan item covers claim ${id}, but it is not in selectedClaimIds.`);
for (const id of coveredNodes) if (!selectedNodes.has(id)) warning('items.knowledgeNodeIds', `Plan item covers node ${id}, but it is not in selectedKnowledgeNodeIds.`);

for (const [id] of approvedVisuals) {
  const uses = candidatePlans.get(id) ?? [];
  if (uses.length === 0) error('items.visualCandidateIds', `Approved visual candidate has no final disposition: ${id}.`);
  if (uses.length > 1) error('items.visualCandidateIds', `Approved visual candidate appears in multiple plan items: ${id}.`);
}

const sourceImageAssets = [...projectAssets.values()].filter((asset) => asset.kind === 'image' && asset.source?.documentId === plan?.documentId);
const sourceImageElements = [...projectElements.values()].filter(({ element }) => element.type === 'image' && sourceImageAssets.some((asset) => asset.id === element.assetId));
const readableApproved = [...approvedVisuals.values()].filter((visual) => visual.screenUse?.legibleAtTargetSize !== false && visual.screenUse?.permissionStatus !== 'reference-only');
if (readableApproved.length && sourceImageElements.length === 0) {
  const reviewed = new Set(plan?.allReconstructionReviewedAssetIds ?? []);
  const missingReviewedAssets = readableApproved.map((visual) => visual.assetId).filter((id) => !reviewed.has(id));
  const validException = plan?.allowAllReconstruction
    && nonEmpty(plan?.allReconstructionRationale)
    && missingReviewedAssets.length === 0;
  if (!validException) {
    error('assets', `${plan?.mode ?? 'source-based'} project has usable approved source visuals but no source image elements. Use original/crop/show-then-reconstruct, or record an all-reconstruction exception naming every reviewed source asset.`);
    if (missingReviewedAssets.length) error('allReconstructionReviewedAssetIds', `Exception does not name reviewed source assets: ${missingReviewedAssets.join(', ')}.`);
  }
}

const percentage = (covered, selected) => selected.size ? `${Math.round((covered.size / selected.size) * 100)}%` : 'n/a';
console.log('# Source use audit');
console.log(`Mode: ${plan?.mode ?? 'unknown'}`);
console.log(`Claim coverage: ${coveredClaims.size}/${selectedClaims.size} (${percentage(coveredClaims, selectedClaims)})`);
console.log(`Knowledge coverage: ${coveredNodes.size}/${selectedNodes.size} (${percentage(coveredNodes, selectedNodes)})`);
console.log(`Approved visual candidates: ${approvedVisuals.size}`);
for (const disposition of allowedDispositions) console.log(`${disposition}: ${dispositionCounts.get(disposition) ?? 0}`);
console.log(`Source image assets in project: ${sourceImageAssets.length}`);
console.log(`Source image elements in project: ${sourceImageElements.length}`);

for (const issue of errors) console.error(`ERROR ${issue.path}: ${issue.message}`);
for (const issue of warnings) console.warn(`WARNING ${issue.path}: ${issue.message}`);

if (errors.length) {
  console.error(`Source use audit failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`Source use audit passed: ${warnings.length} warning(s).`);
