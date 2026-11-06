#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node validate-source-package.mjs <source-package.json>');
  process.exit(2);
}

const packagePath = resolve(file);
const packageRoot = dirname(packagePath);
const errors = [];
const warnings = [];
const error = (path, message) => errors.push({ path, message });
const warning = (path, message) => warnings.push({ path, message });
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const shaPattern = /^[a-f\d]{64}$/i;
const riskFlags = new Set(['visual-review-required', 'ocr-review-required', 'ambiguous-reading-order', 'cross-page-dependency', 'low-confidence']);

const validBox = (box) => box && typeof box === 'object'
  && [box.x, box.y, box.width, box.height].every(Number.isFinite)
  && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0
  && box.x + box.width <= 1.000001 && box.y + box.height <= 1.000001;

const checkRisks = (path, values) => {
  if (!Array.isArray(values)) return error(path, 'riskFlags must be an array.');
  values.forEach((value, index) => { if (!riskFlags.has(value)) error(`${path}[${index}]`, `Unsupported risk flag: ${value}.`); });
};

let sourcePackage;
try {
  sourcePackage = JSON.parse(await readFile(packagePath, 'utf8'));
} catch (cause) {
  console.error(`Could not read SourcePackage: ${cause.message}`);
  process.exit(2);
}

if (sourcePackage?.sourcePackageVersion !== 1) error('sourcePackageVersion', 'Expected SourcePackage version 1.');
const document = sourcePackage?.document;
if (!document || typeof document !== 'object') error('document', 'Document metadata is required.');
else {
  for (const key of ['id', 'name', 'language', 'parserVersion']) if (!nonEmpty(document[key])) error(`document.${key}`, `${key} is required.`);
  if (document.mimeType !== 'application/pdf') error('document.mimeType', 'Expected application/pdf.');
  if (!Number.isInteger(document.pageCount) || document.pageCount <= 0) error('document.pageCount', 'pageCount must be a positive integer.');
  if (!shaPattern.test(document.sha256 ?? '')) error('document.sha256', 'Document SHA-256 must contain 64 hexadecimal characters.');
}

for (const key of ['pages', 'claims', 'knowledgeNodes', 'visualCandidates', 'assets']) {
  if (!Array.isArray(sourcePackage?.[key])) error(key, `${key} must be an array.`);
}

const assetIds = new Set();
const assetsById = new Map();
for (const [index, asset] of (sourcePackage.assets ?? []).entries()) {
  const path = `assets[${index}]`;
  if (!nonEmpty(asset?.id) || assetIds.has(asset.id)) error(`${path}.id`, 'Asset ID must be present and unique.');
  else { assetIds.add(asset.id); assetsById.set(asset.id, asset); }
  if (!nonEmpty(asset?.uri)) error(`${path}.uri`, 'Asset URI is required.');
  else if (isAbsolute(asset.uri) || asset.uri.split(/[\\/]/).includes('..')) error(`${path}.uri`, 'Asset URI must be package-relative or a controlled object key.');
  if (!shaPattern.test(asset?.sha256 ?? '')) error(`${path}.sha256`, 'Asset SHA-256 must contain 64 hexadecimal characters.');
  if (!['native-xobject', 'rendered-page', 'rendered-crop', 'text-layer', 'ocr'].includes(asset?.extraction)) error(`${path}.extraction`, 'Unsupported extraction method.');
  if (asset?.extraction === 'native-xobject' && asset?.role !== undefined && !['image', 'mask', 'smask'].includes(asset.role)) error(`${path}.role`, 'Native PDF asset role must be image, mask, or smask.');
  if (asset?.source?.objectId !== undefined && !nonEmpty(asset.source.objectId)) error(`${path}.source.objectId`, 'PDF object ID must be a non-empty string.');
  if (!Number.isInteger(asset?.source?.page) || asset.source.page < 1 || asset.source.page > (document?.pageCount ?? 0)) error(`${path}.source.page`, 'Asset source page is outside the document.');
  if (asset?.source?.bbox && !validBox(asset.source.bbox)) error(`${path}.source.bbox`, 'Asset bbox must be normalized inside the page.');
  if (asset?.width !== undefined && (!Number.isInteger(asset.width) || asset.width <= 0)) error(`${path}.width`, 'Asset width must be a positive integer.');
  if (asset?.height !== undefined && (!Number.isInteger(asset.height) || asset.height <= 0)) error(`${path}.height`, 'Asset height must be a positive integer.');

  if (nonEmpty(asset?.uri) && !/^(?:[a-z]+:|\/\/)/i.test(asset.uri) && !isAbsolute(asset.uri) && !asset.uri.split(/[\\/]/).includes('..')) {
    try {
      const data = await readFile(resolve(packageRoot, asset.uri));
      if (shaPattern.test(asset.sha256 ?? '') && sha256(data) !== asset.sha256.toLowerCase()) error(`${path}.sha256`, 'Asset hash does not match the referenced file.');
    } catch {
      error(`${path}.uri`, 'Referenced local asset does not exist or cannot be read.');
    }
  }
}

const pageNumbers = new Set();
const pageStatusByNumber = new Map();
const blockIds = new Set();
let missingPageStatus = false;
for (const [index, page] of (sourcePackage.pages ?? []).entries()) {
  const path = `pages[${index}]`;
  if (!Number.isInteger(page?.page) || page.page < 1 || page.page > (document?.pageCount ?? 0) || pageNumbers.has(page.page)) error(`${path}.page`, 'Page number must be unique and inside the document.');
  else pageNumbers.add(page.page);
  if (typeof page?.text !== 'string') error(`${path}.text`, 'Page text must be a string.');
  if (!Array.isArray(page?.blocks)) error(`${path}.blocks`, 'Page blocks must be an array.');
  if (!assetIds.has(page?.thumbnailAssetId)) error(`${path}.thumbnailAssetId`, 'Page thumbnail must reference an existing asset.');
  if (!['text-layer', 'ocr', 'mixed'].includes(page?.extraction)) error(`${path}.extraction`, 'Unsupported page extraction method.');
  if (page?.status === undefined) missingPageStatus = true;
  else if (!['selected', 'excluded'].includes(page.status)) error(`${path}.status`, 'Page status must be selected or excluded.');
  else {
    pageStatusByNumber.set(page.page, page.status);
    if (page.status === 'excluded' && !nonEmpty(page.exclusionReason)) error(`${path}.exclusionReason`, 'Excluded page requires a concrete reason.');
  }
  checkRisks(`${path}.riskFlags`, page?.riskFlags);
  for (const [blockIndex, block] of (page?.blocks ?? []).entries()) {
    const blockPath = `${path}.blocks[${blockIndex}]`;
    if (!nonEmpty(block?.id) || blockIds.has(block.id)) error(`${blockPath}.id`, 'Block ID must be present and globally unique.');
    else blockIds.add(block.id);
    if (!Number.isInteger(block?.order) || block.order <= 0) error(`${blockPath}.order`, 'Block order must be a positive integer.');
    if (!['heading', 'paragraph', 'image', 'table', 'formula', 'code'].includes(block?.kind)) error(`${blockPath}.kind`, 'Unsupported block kind.');
    if (block?.bbox && !validBox(block.bbox)) error(`${blockPath}.bbox`, 'Block bbox must be normalized inside the page.');
    if (!['text-layer', 'ocr', 'visual'].includes(block?.extraction)) error(`${blockPath}.extraction`, 'Unsupported block extraction method.');
    if (block?.riskFlags) checkRisks(`${blockPath}.riskFlags`, block.riskFlags);
  }
}
if (missingPageStatus) warning('pages.status', 'Legacy package has pages without selected/excluded status; add explicit page decisions before reuse.');
if (Number.isInteger(document?.pageCount) && pageNumbers.size !== document.pageCount) error('pages', `Expected ${document.pageCount} unique page records, found ${pageNumbers.size}.`);

const claimIds = new Set();
for (const [index, claim] of (sourcePackage.claims ?? []).entries()) {
  const path = `claims[${index}]`;
  if (!nonEmpty(claim?.id) || claimIds.has(claim.id)) error(`${path}.id`, 'Claim ID must be present and unique.');
  else claimIds.add(claim.id);
  if (!nonEmpty(claim?.text)) error(`${path}.text`, 'Claim text is required.');
  if (!Array.isArray(claim?.evidenceBlockIds) || !claim.evidenceBlockIds.length) warning(`${path}.evidenceBlockIds`, 'Claim has no evidence blocks; confirm that page-level evidence is sufficient.');
  for (const [evidenceIndex, id] of (claim?.evidenceBlockIds ?? []).entries()) if (!blockIds.has(id)) error(`${path}.evidenceBlockIds[${evidenceIndex}]`, `Unknown evidence block: ${id}.`);
  if (!Array.isArray(claim?.sourcePages) || !claim.sourcePages.length) error(`${path}.sourcePages`, 'Claim needs at least one source page.');
  for (const [pageIndex, page] of (claim?.sourcePages ?? []).entries()) {
    if (!pageNumbers.has(page)) error(`${path}.sourcePages[${pageIndex}]`, `Unknown source page: ${page}.`);
    else if (pageStatusByNumber.get(page) === 'excluded') error(`${path}.sourcePages[${pageIndex}]`, `Claim references excluded page ${page}.`);
  }
  checkRisks(`${path}.riskFlags`, claim?.riskFlags);
}

const nodeIds = new Set();
for (const [index, node] of (sourcePackage.knowledgeNodes ?? []).entries()) {
  const path = `knowledgeNodes[${index}]`;
  if (!nonEmpty(node?.id) || nodeIds.has(node.id)) error(`${path}.id`, 'Knowledge-node ID must be present and unique.');
  else nodeIds.add(node.id);
  if (!['concept', 'relationship', 'example', 'formula'].includes(node?.kind)) error(`${path}.kind`, 'Unsupported knowledge-node kind.');
  if (!nonEmpty(node?.title) || !nonEmpty(node?.summary)) error(path, 'Knowledge node needs a title and summary.');
  for (const [claimIndex, id] of (node?.claimIds ?? []).entries()) if (!claimIds.has(id)) error(`${path}.claimIds[${claimIndex}]`, `Unknown claim: ${id}.`);
  for (const [pageIndex, page] of (node?.sourcePages ?? []).entries()) {
    if (!pageNumbers.has(page)) error(`${path}.sourcePages[${pageIndex}]`, `Unknown source page: ${page}.`);
    else if (pageStatusByNumber.get(page) === 'excluded') error(`${path}.sourcePages[${pageIndex}]`, `Knowledge node references excluded page ${page}.`);
  }
}
for (const [index, node] of (sourcePackage.knowledgeNodes ?? []).entries()) {
  for (const [relatedIndex, id] of (node?.relatedNodeIds ?? []).entries()) if (!nodeIds.has(id)) error(`knowledgeNodes[${index}].relatedNodeIds[${relatedIndex}]`, `Unknown related knowledge node: ${id}.`);
}

const visualIds = new Set();
for (const [index, visual] of (sourcePackage.visualCandidates ?? []).entries()) {
  const path = `visualCandidates[${index}]`;
  if (!nonEmpty(visual?.id) || visualIds.has(visual.id)) error(`${path}.id`, 'Visual-candidate ID must be present and unique.');
  else visualIds.add(visual.id);
  if (!pageNumbers.has(visual?.page)) error(`${path}.page`, 'Visual candidate references an unknown page.');
  else if (pageStatusByNumber.get(visual.page) === 'excluded' && visual?.review?.status !== 'excluded') error(`${path}.page`, 'Visual candidate on an excluded page must also be excluded.');
  if (!validBox(visual?.bbox)) error(`${path}.bbox`, 'Visual-candidate bbox must be normalized inside the page.');
  if (!['diagram', 'chart', 'table', 'formula', 'code', 'photo', 'screenshot', 'mockup', 'illustration', 'comic', 'collage', 'page-layout'].includes(visual?.kind)) error(`${path}.kind`, 'Unsupported visual-candidate kind.');
  if (!nonEmpty(visual?.description) || !nonEmpty(visual?.teachingUse)) error(path, 'Visual candidate needs a description and teaching use.');
  if (!assetsById.has(visual?.assetId)) error(`${path}.assetId`, 'Visual candidate references an unknown asset.');
  if (!['original', 'crop', 'reconstruct', 'show-then-reconstruct'].includes(visual?.recommendedMode)) error(`${path}.recommendedMode`, 'Unsupported recommended mode.');
  for (const [nodeIndex, id] of (visual?.relatedKnowledgeNodeIds ?? []).entries()) if (!nodeIds.has(id)) error(`${path}.relatedKnowledgeNodeIds[${nodeIndex}]`, `Unknown knowledge node: ${id}.`);
  checkRisks(`${path}.riskFlags`, visual?.riskFlags);
  if (visual?.review?.status === 'approved') {
    const asset = assetsById.get(visual.assetId);
    if (!asset || visual.review.sourceAssetSha256 !== asset.sha256) error(`${path}.review.sourceAssetSha256`, 'Approved review must match the current source asset hash.');
    if (!['human', 'vision-model', 'document-service'].includes(visual.review.reviewerType)) error(`${path}.review.reviewerType`, 'Unsupported reviewer type.');
    if (!nonEmpty(visual.review.reviewerId) || !nonEmpty(visual.review.reviewedAt)) error(`${path}.review`, 'Approved review needs reviewer identity and timestamp.');
  }
  if (visual?.screenUse) {
    if (!['high', 'medium', 'low'].includes(visual.screenUse.evidentiaryValue)) error(`${path}.screenUse.evidentiaryValue`, 'Unsupported evidentiary value.');
    if (!['source-specific', 'generic'].includes(visual.screenUse.uniqueness)) error(`${path}.screenUse.uniqueness`, 'Unsupported uniqueness value.');
    if (typeof visual.screenUse.legibleAtTargetSize !== 'boolean') error(`${path}.screenUse.legibleAtTargetSize`, 'legibleAtTargetSize must be boolean.');
    for (const key of ['sourcePixelWidth', 'sourcePixelHeight', 'targetPixelWidth']) if (!Number.isFinite(visual.screenUse[key]) || visual.screenUse[key] <= 0) error(`${path}.screenUse.${key}`, `${key} must be positive.`);
    if (!Number.isFinite(visual.screenUse.scaleRatio) || visual.screenUse.scaleRatio <= 0) error(`${path}.screenUse.scaleRatio`, 'scaleRatio must be positive.');
    else if (Number.isFinite(visual.screenUse.sourcePixelWidth) && Number.isFinite(visual.screenUse.targetPixelWidth)) {
      const calculated = visual.screenUse.targetPixelWidth / visual.screenUse.sourcePixelWidth;
      if (Math.abs(calculated - visual.screenUse.scaleRatio) > 0.05) error(`${path}.screenUse.scaleRatio`, 'scaleRatio must match targetPixelWidth / sourcePixelWidth.');
    }
    if (typeof visual.screenUse.essentialContentReadable !== 'boolean') error(`${path}.screenUse.essentialContentReadable`, 'essentialContentReadable must be boolean.');
    if (!['acceptable', 'extremely-low'].includes(visual.screenUse.resolutionStatus)) error(`${path}.screenUse.resolutionStatus`, 'Unsupported resolution status.');
    if (!['native-xobject', 'rendered-crop', 'rendered-page'].includes(visual.screenUse.reviewedAssetExtraction)) error(`${path}.screenUse.reviewedAssetExtraction`, 'Record the extraction type of the asset used for the resolution decision.');
    if (visual.screenUse.resolutionStatus === 'acceptable' && visual.screenUse.legibleAtTargetSize !== true) error(`${path}.screenUse`, 'Acceptable resolution must remain legible at target size.');
    if (visual.screenUse.resolutionStatus === 'extremely-low' && visual.screenUse.scaleRatio <= 2.5 && visual.screenUse.essentialContentReadable !== false) error(`${path}.screenUse.resolutionStatus`, 'Resolution is not extremely low unless enlargement exceeds 2.5x or essential content is unreadable.');
    if (!['original', 'crop', 'reconstruct', 'show-then-reconstruct'].includes(visual.screenUse.preferredMode)) error(`${path}.screenUse.preferredMode`, 'Unsupported preferred mode.');
    if (!['allowed', 'reference-only', 'unknown'].includes(visual.screenUse.permissionStatus)) error(`${path}.screenUse.permissionStatus`, 'Unsupported permission status.');
  }
}

for (const issue of errors) console.error(`ERROR ${issue.path}: ${issue.message}`);
for (const issue of warnings) console.warn(`WARNING ${issue.path}: ${issue.message}`);

if (errors.length) {
  console.error(`SourcePackage validation failed: ${errors.length} error(s), ${warnings.length} warning(s).`);
  process.exit(1);
}
console.log(`SourcePackage validation passed: ${warnings.length} warning(s), ${pageNumbers.size} page(s), ${claimIds.size} claim(s), ${nodeIds.size} knowledge node(s), ${visualIds.size} visual candidate(s), ${assetIds.size} asset(s).`);
