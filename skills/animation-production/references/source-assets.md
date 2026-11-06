# Source assets and code

Read this reference when source slides, document imagery, or real code should appear in the animation. Ingestion is deterministic; selection and cropping require visual judgment.

## Source ingestion order

Prefer the original PPTX over a PDF export when both are available. For a PDF-only source, first build and quality-gate the versioned `SourcePackage` in [pdf-ingestion.md](pdf-ingestion.md); inspect figures as well as text before authoring. Use three image modes:

1. `native`: extract a picture blob from PPTX without recompression;
2. `rendered-crop`: render a complete slide/page, then crop a compound diagram or annotated composition;
3. `rendered-page`: use a full page only when its complete layout is relevant and readable.

For PPTX sources, run:

```bash
python3 skills/animation-production/scripts/extract-pptx-assets.py source.pptx sources/topic
node skills/animation-production/scripts/render-source-pages.mjs source.pptx sources/topic/pages
node skills/animation-production/scripts/build-source-catalog.mjs sources/topic/source-catalog.json sources/topic/pages
```

Use `register-source-crop.mjs` for derived crops. Never overwrite the native asset. Keep normalized page coordinates, extraction method, document ID, page/slide, object ID when present, and SHA-256.

Use `select-source-candidates.mjs` to narrow a large catalog, then inspect `contact-sheet.html`. Ranking is not visual approval. Copy selected assets into the project package or embed them; do not leave iCloud, home-directory, or other machine-specific absolute paths in project JSON.

For PDF-only sources, extract embedded images before judging source quality:

```bash
python3 skills/animation-production/scripts/extract-pdf-assets.py source.pdf sources/topic/pdf-images --document-id source-topic
```

Use the native XObject when it is a complete standalone visual. When masks, overlaid text, vectors, or several objects form one composition, render the candidate page at 300 DPI or higher and crop the complete composition. Take the page/figure inventory, evidence, risks, and approved visual mode from the quality-gated `SourcePackage`. Record native dimensions, planned display width, scale ratio, page, object ID or crop coordinates, and the reviewed asset hash. A page's image can carry a mechanism absent from extracted text, so review both. Create the `SourceUsePlan` from [source-use-plan.md](source-use-plan.md) before storyboard authoring. See [visual-explanation.md](visual-explanation.md) to decide which figures deserve screen time and when an editable reconstruction teaches better. If the visual changes meaningfully during authoring, reopen the source page and renew its approval rather than trusting the earlier selection.

Before importing a standalone JSON file in the browser, run `embed-project-assets.mjs` to convert project-relative resources into verified data URIs. This makes the project portable without weakening catalog provenance.

## Image authoring

An `image` element references an image asset by `assetId` and declares `alt`, `fit`, and optional normalized `crop`. Use `contain` when labels or diagram boundaries matter. Use `cover` only when losing an edge cannot alter meaning.

Prefer one source visual with a clear narration job over a collage. Confirm resolution at the element's rendered pixel size, crop integrity, caption collision, and the time needed to scan labels. Use the source visual unless it is catastrophically degraded: mild softness is acceptable, and enlargement up to 2.5× is not by itself a reason to replace it. Judge essential content by the visual's teaching job—a comic, mockup, or example can remain recognizable even when every tiny label is not readable. If essential labels remain unreadable, show the source briefly for identity and reconstruct the explanation rather than silently discarding the image.

Use four source-visual patterns deliberately:

1. `original`: preserve a source-specific image when its complete composition is the evidence and remains readable;
2. `crop`: isolate the teaching region while preserving labels, boundaries, legends, and provenance;
3. `reconstruct`: rebuild a crowded or low-resolution mechanism with editable elements, preserving entities, links, direction, values, and source pages;
4. `show-then-reconstruct`: establish the original source crop, then transform or cut to an editable explanation. Prefer this when source identity and progressive teaching both matter.

Do not choose reconstruction merely because it is convenient. Do not keep an original merely to increase source-image count. For every approved source visual, record final project asset and element IDs or an explicit exclusion in the `SourceUsePlan`.

An empty project `assets` array is a quality failure when readable, non-`reference-only`, approved source visuals exist. This applies to both `source-forward` and `balanced`; it passes only with an explicit all-reconstruction exception that names every reviewed source asset and explains why each was catastrophically degraded or unusable. Style consistency, asset packaging effort, and easier animation are invalid exception reasons.

## Real code hierarchy

Use sources in this order:

1. exact repository file and line range;
2. selectable source text from slides/documents;
3. OCR with explicit warning and source comparison;
4. generated example labelled with `extraction: generated`.

Do not silently repair sourced code. Keep displayed code as editable text, not a screenshot. Declare `codeVerification`:

- `exact`: content must equal the recorded repository line range;
- `syntax`: syntax is checked but the snippet may depend on surrounding context;
- `display-only`: intentionally incomplete or unsupported language; never describe it as executed.

Run `verify-code-snippets.mjs` before delivery. Split code beyond roughly 16 lines or 80 columns into narrated steps, and use `highlightLines` only for the lines currently being explained.

### Code presentation choice

Keep code as a `code` element when the code itself is the teaching object. Choose presentation deliberately:

- Use the default `github-dark` + `toolbar` + line numbers for repository walkthroughs, debugging, or any scene where provenance and line references matter.
- Use `carbon-dark` + `mac` + hidden line numbers for a short, self-contained code idea where the visual job is recognition, mood, or a polished example. A soft gray backdrop is appropriate only when the code card is the scene's dominant visual.
- Use `none` chrome for a small code fragment embedded beside another explanation.
- Keep line numbers when narration or review refers to exact lines. Never hide them merely to imitate a reference screenshot when line-specific teaching would suffer.
- Prefer `highlightLines` and narration-timed focus over rasterizing several screenshot variants. Keep the code editable and let the platform render the screenshot-like frame.

Use a source screenshot as an `image` only when the surrounding UI, cursor state, annotations, visual defects, or exact historical appearance is evidence. Do not replace extractable code with an image merely to obtain a Carbon-like frame; use `codePresentation` instead.

## Preview feedback

After structural validation, generate `preview-feedback.json` with `create-preview-feedback.mjs`. Review its start/middle/end samples and transitions, record visual and narrative notes, revise, revalidate, and preview changed scenes again. `check-preview-feedback.mjs` checks completion; it does not decide quality.
