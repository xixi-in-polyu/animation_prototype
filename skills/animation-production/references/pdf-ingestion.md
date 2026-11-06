# PDF ingestion and SourcePackage

Read this reference only when a PDF, a PDF export, or a PDF-backed source supplies knowledge or visuals for an animation. The goal is to parse the document once, preserve evidence, escalate only useful pages for visual understanding, and hand animation production a stable intermediate package. Do not make the animation model repeatedly rediscover the PDF.

`SourcePackage` is a versioned sidecar, not part of `AnimationProject`. Keep the final project on the repository's current schema version and project only selected source documents, content blocks, knowledge nodes, assets, and page provenance into it.

Use the platform source-document API as the default deterministic layer when available. It owns original-file storage, extraction, page rendering, OCR, crops, versioned caching, and stable document/page/block/asset lookup. The Skill owns task-specific semantic analysis and may reopen a precise page, block, image, or crop through those stable IDs whenever evidence needs to be checked again. Do not treat an LLM summary as a replacement for re-readable source evidence.

## Five-stage handoff

1. **Deterministic extraction:** identify the file by SHA-256; extract page count, selectable text, reading-order blocks, normalized bounding boxes, low-resolution page images, and embedded image XObjects at native pixel dimensions. Preserve masks and object IDs. Use OCR only where the text layer is absent or unreliable. Preserve extraction method and confidence.
2. **Semantic analysis:** derive the document hierarchy, claims and evidence, knowledge nodes, relationships, examples, formulas, and candidate visuals. Every sourced statement must retain block or page evidence.
3. **Candidate-page visual escalation:** rank pages from text, layout signals, and thumbnails, then inspect only the useful candidates or crops at sufficient resolution. Visual ranking is not visual approval.
4. **Quality gate:** validate the package and resolve or explicitly exclude risks that affect the intended animation. A failed package may support a labelled draft storyboard only.
5. **Animation production:** map approved claims, knowledge nodes, and visual candidates into the Reel Read, storyboard, narration, scene elements, and source-to-screen review.

## SourcePackage contract

Use stable, unique IDs and normalized boxes with `x`, `y`, `width`, and `height` between 0 and 1. Store asset URIs as package-relative paths or controlled object keys, never machine-specific absolute paths. Additional fields are allowed when they preserve provider or parser detail, but the following information is required where applicable:

```ts
type SourceRisk =
  | 'visual-review-required'
  | 'ocr-review-required'
  | 'ambiguous-reading-order'
  | 'cross-page-dependency'
  | 'low-confidence';

interface SourcePackage {
  sourcePackageVersion: 1;
  document: {
    id: string;
    name: string;
    mimeType: 'application/pdf';
    pageCount: number;
    sha256: string;
    language: string;
    parserVersion: string;
  };
  pages: Array<{
    page: number;
    status: 'selected' | 'excluded';
    exclusionReason?: string;
    text: string;
    blocks: Array<{
      id: string;
      order: number;
      kind: 'heading' | 'paragraph' | 'image' | 'table' | 'formula' | 'code';
      text?: string;
      bbox?: { x: number; y: number; width: number; height: number };
      extraction: 'text-layer' | 'ocr' | 'visual';
      confidence?: number;
      riskFlags?: SourceRisk[];
    }>;
    thumbnailAssetId: string;
    extraction: 'text-layer' | 'ocr' | 'mixed';
    confidence?: number;
    riskFlags: SourceRisk[];
  }>;
  claims: Array<{
    id: string;
    text: string;
    evidenceBlockIds: string[];
    sourcePages: number[];
    confidence?: number;
    riskFlags: SourceRisk[];
  }>;
  knowledgeNodes: Array<{
    id: string;
    kind: 'concept' | 'relationship' | 'example' | 'formula';
    title: string;
    summary: string;
    sourcePages: number[];
    claimIds: string[];
    relatedNodeIds?: string[];
  }>;
  visualCandidates: Array<{
    id: string;
    page: number;
    bbox: { x: number; y: number; width: number; height: number };
    kind: 'diagram' | 'chart' | 'table' | 'formula' | 'code' | 'photo' | 'screenshot' | 'mockup' | 'illustration' | 'comic' | 'collage' | 'page-layout';
    description: string;
    teachingUse: string;
    relatedKnowledgeNodeIds: string[];
    assetId: string;
    recommendedMode: 'original' | 'crop' | 'reconstruct' | 'show-then-reconstruct';
    screenUse?: {
      evidentiaryValue: 'high' | 'medium' | 'low';
      uniqueness: 'source-specific' | 'generic';
      legibleAtTargetSize: boolean;
      minimumRenderedWidth?: number;
      sourcePixelWidth: number;
      sourcePixelHeight: number;
      targetPixelWidth: number;
      scaleRatio: number;
      essentialContentReadable: boolean;
      resolutionStatus: 'acceptable' | 'extremely-low';
      reviewedAssetExtraction: 'native-xobject' | 'rendered-crop' | 'rendered-page';
      preferredMode: 'original' | 'crop' | 'reconstruct' | 'show-then-reconstruct';
      permissionStatus: 'allowed' | 'reference-only' | 'unknown';
    };
    graph?: {
      nodes: Array<{ id: string; label: string }>;
      edges: Array<{ from: string; to: string; label?: string; direction?: string }>;
      legend?: string[];
    };
    chart?: {
      xAxis?: { label?: string; unit?: string; categories?: string[] };
      yAxis?: { label?: string; unit?: string; scale?: 'linear' | 'log' };
      series: Array<{ id: string; label: string; values?: number[]; legendKey?: string }>;
      notes?: string[];
    };
    confidence?: number;
    riskFlags: SourceRisk[];
    review?: {
      status: 'pending' | 'approved' | 'excluded';
      reviewerType: 'human' | 'vision-model' | 'document-service';
      reviewerId: string;
      reviewedAt: string;
      sourceAssetSha256: string;
      notes?: string;
    };
  }>;
  assets: Array<{
    id: string;
    uri: string;
    sha256: string;
    width?: number;
    height?: number;
    extraction: 'native-xobject' | 'rendered-page' | 'rendered-crop' | 'text-layer' | 'ocr';
    role?: 'image' | 'mask' | 'smask';
    source: {
      page: number;
      bbox?: { x: number; y: number; width: number; height: number };
      objectId?: string;
    };
  }>;
}
```

Confidence values, when present, are normalized from 0 to 1. They help route review but never override a concrete contradiction with the source. Keep exact quotations or values in claims/evidence rather than relying only on a knowledge-node summary. Mark every page `selected` or `excluded`; an excluded page requires a concrete `exclusionReason` and must not supply selected claims, nodes, or approved visual candidates. `SourceDocument.contentBlocks` is a compact final-project index, not a replacement for this package.

Populate `graph` only after a visual-capable reviewer has confirmed entities, connections, direction, and legend. Populate `chart` only from verified visual or structured data; preserve axes, units, scale, series, category order, and uncertainty marks that affect the claim. A confidence score alone is not approval. The `review` record identifies who or what inspected the exact source asset and becomes stale when that asset hash changes.

Use `screenUse` to distinguish a merely detectable visual from one that should appear on screen. Assess the native XObject when one exists; never use a lower-resolution page crop to declare the source itself unusable. Compute `scaleRatio = targetPixelWidth / sourcePixelWidth`. Treat resolution as `acceptable` by default, including mild softness or enlargement. Mark it `extremely-low` only when essential content is genuinely unrecognizable at the planned display size or the source needs more than 2.5× enlargement. If the original still establishes source identity, prefer `show-then-reconstruct` even in that case. A source-specific, high-evidence visual should not be replaced by generic cards without an explicit `SourceUsePlan` decision.

Visual-theme mismatch, attribution work, asset packaging, a preference for editable elements, or the convenience of reconstruction never make resolution `extremely-low`. Reduce the image's on-screen size, crop it, or pair it with a reconstruction before excluding it.

## Local and Vercel paths

### Local fallback path

Use local deterministic tools only when the platform API is unavailable and the user approves the fallback. Record the fallback provider, parser, renderer, OCR, and crop-tool versions in the package. Run `extract-pdf-assets.py` first to recover image XObjects without resampling. If Poppler `pdfimages` is unavailable, or if masked or multi-object compositions do not survive standalone extraction, use a 300-DPI or higher rendered crop from `render-source-pages.mjs --dpi 300`; record that native extraction was unavailable or why the object was not independently usable. This fallback is still source imagery and should not be replaced with generic reconstruction. Never downgrade to an earlier low-resolution render. Platform-specific tools such as macOS `sips` may be used only after confirming they exist; cross-platform ImageMagick is also supported for crops. Never create an unrecorded one-off extractor and present it as the platform path.

```bash
python3 skills/animation-production/scripts/extract-pdf-assets.py source.pdf sources/topic/pdf-images --document-id source-topic
node skills/animation-production/scripts/render-source-pages.mjs source.pdf sources/topic/pages-hires --dpi 300
```

### Platform engineering path

Treat Vercel as the editor host and lightweight job orchestrator, not as a durable filesystem or an all-in-one PDF workstation. The required platform work is tracked in the repository `TODO.md`:

- In the browser, use PDF.js in a Worker to read page count, selectable text, reading-order geometry, and low-resolution thumbnails. Render high-resolution pages only after candidate selection.
- Upload the original PDF, page images, crops, and package JSON directly to private object storage. Do not relay a large document through a Function request when direct client upload is available.
- Store only object keys or short-lived signed access in orchestration data. Use SHA-256 for deduplication and cache identity, and make retention configurable. Provider-side file references must also have an explicit cleanup path.
- Use Functions for bounded orchestration: batch semantic work, persist progress between stages, retry failed batches, and resume from completed artifacts. Do not combine upload, full-document rendering, OCR, vision, knowledge extraction, and animation generation into one synchronous call.
- Do not require Poppler, LibreOffice, `sips`, or persistent local disk in the deployed path. If browser preprocessing is insufficient, dispatch the bounded operation to a document/OCR service or external worker and preserve the same SourcePackage contract.

Provider limits and APIs change. Consult the deployed provider's current primary documentation before choosing request sizes, duration, or file-reference behavior; keep those volatile values out of this reference.

## Route by model capability

Choose the strongest available path without pretending weaker models saw information they did not receive:

1. **Native PDF plus vision:** send the source once through a reusable provider file reference when supported. Use deterministic text, page numbering, and hashes as the factual baseline; verify model-produced page references and boxes.
2. **Image vision without native PDF:** provide thumbnails or a contact sheet for classification, then send only candidate pages or crops at high resolution.
3. **Text-only animation model with a visual sidecar:** have the visual model or document service produce visual candidates, graph structure, legends, and confidence. The animation model consumes that structured result and may request a targeted reinspection.
4. **No visual capability anywhere:** analyze selectable text, structured tables, and OCR only. Mark image-, layout-, chart-, formula-, or diagram-dependent content `visual-review-required`. It may enter a labelled text storyboard, but not verified narration, reconstructed graphics, or an approved source visual.

Never infer topology, arrows, color meaning, chart trends, formula layout, image labels, or numeric values from neighboring text alone.

The current `AnimationProject` v5 model has no native chart element. For a verified chart, use an approved source image/crop when its axes and labels remain readable, or translate only the verified teaching claim into supported `metrics`, `comparison`, `formula`, or other elements without pretending the full chart remains editable. A genuinely editable or progressively drawn chart requires an explicit renderer/schema product change outside ordinary animation production.

## Quality gate

A SourcePackage is ready for formal animation production only when:

- its version, document identity, page ranges, IDs, references, boxes, hashes, and asset links are internally consistent;
- every important claim has evidence blocks or source pages;
- knowledge nodes cover the concepts selected for the requested duration and learning goal;
- every page is marked selected or explicitly excluded with a reason, and excluded pages do not supply selected evidence;
- OCR, reading-order, cross-page, formula, table, code, and visual risks that affect selected content are confirmed or explicitly excluded;
- each selected source visual has been inspected using a native XObject or a documented high-resolution composite crop, records the source and target pixels plus scale ratio, has an approved `original`, `crop`, `reconstruct`, or `show-then-reconstruct` decision, and carries an `approved` review record tied to the current source asset hash;
- no unresolved risk is represented as verified narration, a verified graph, or an approved source image.

Run the deterministic package validator before the quality-gate decision:

```bash
node skills/animation-production/scripts/validate-source-package.mjs <source-package.json>
```

Validation checks structure, references, page ranges, hashes, asset links, approved-review hashes, and supported source-use metadata. It does not decide teaching value or visual quality.

If the gate fails, report the unresolved items and either stop before formal production or produce only a clearly labelled draft storyboard that names its unavailable evidence. Do not silently lower the gate. After it passes, create the `SourceUsePlan` in [source-use-plan.md](source-use-plan.md); package approval alone does not guarantee that approved source material reaches the screen.

## When to reopen the PDF

Reuse a verified package when the file hash, parser version, selected evidence, and intended teaching job have not changed. Reopen the relevant page, not the whole document, when:

- choosing between a full page, crop, or editable reconstruction;
- using an exact definition, number, formula, comparison, causal claim, or strong conclusion;
- OCR, reading order, cross-page context, or conflicting evidence is uncertain;
- reconstructing a `diagram`, `flow`, `topology`, `comparison`, `formula`, table, or code example;
- checking crop boundaries, labels, arrows, legends, units, exceptions, or playback-size readability;
- the audience, duration, learning goal, selected chapters, document hash, or parser version changes;
- conducting the final source-to-screen audit.

Do not reopen the PDF merely to reorder already verified scenes, shorten copy without changing meaning, adjust style, or tune non-semantic motion. If a crop or reconstruction changes semantically, its earlier visual approval no longer applies.
