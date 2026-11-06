# Source use planning and coverage

Read this reference for every source-based animation after the `SourcePackage` passes its quality gate and before storyboard authoring. The objective is to maximize useful, readable, traceable source use rather than maximize screenshot count. Every selected claim, knowledge node, and approved visual candidate needs a planned screen role or an explicit exclusion.

`SourceUsePlan` is a versioned sidecar. It is not part of `AnimationProject`, but it is required for PDF- and deck-derived production because the final project schema cannot explain why a source visual was cropped, reconstructed, kept as reference only, or excluded.

## Choose a source-use mode

- `source-forward`: prefer source-specific evidence, illustrations, tables, screenshots, and visual identity. Use `original`, `crop`, or `show-then-reconstruct` whenever an approved source visual is readable and permitted. An image-free final project is a quality-gate failure unless the plan records an explicit all-reconstruction exception.
- `balanced`: use source images for evidence and orientation, and editable reconstruction for mechanisms, relationships, progressive explanation, or playback-size legibility. This is the default when the user does not specify a preference.
- `reconstruction-first`: favor a unified editable visual system, but still disposition every approved visual candidate and preserve its structure and provenance. Do not use this mode merely because reconstruction is convenient.

If the user asks to maximize PDF or deck use, choose `source-forward`. Do not infer permission to redistribute third-party imagery; record permission as `unknown` or `reference-only` when necessary.

## SourceUsePlan contract

Use stable IDs and project scene IDs. `selectedClaimIds` and `selectedKnowledgeNodeIds` define the coverage denominator for the requested duration and learning goal; they need not include every fact in a long document.

```ts
type SourceUseMode = 'source-forward' | 'balanced' | 'reconstruction-first';
type TeachingJob = 'evidence' | 'mechanism' | 'process' | 'comparison' | 'example' | 'orientation' | 'atmosphere';
type ChosenMode = 'original' | 'crop' | 'reconstruct' | 'show-then-reconstruct' | 'text-only' | 'exclude';
type FinalDisposition =
  | 'used-original'
  | 'used-crop'
  | 'used-reconstruct'
  | 'used-show-then-reconstruct'
  | 'used-text-only'
  | 'reference-only'
  | 'excluded';

interface SourceUsePlan {
  sourceUsePlanVersion: 2;
  status: 'planned' | 'final';
  projectId: string;
  documentId: string;
  documentSha256: string;
  mode: SourceUseMode;
  learningGoal: string;
  selectedClaimIds: string[];
  selectedKnowledgeNodeIds: string[];
  allowAllReconstruction?: boolean;
  allReconstructionRationale?: string;
  allReconstructionReviewedAssetIds?: string[];
  items: Array<{
    id: string;
    claimIds: string[];
    knowledgeNodeIds: string[];
    visualCandidateIds: string[];
    teachingJob: TeachingJob;
    chosenMode: ChosenMode;
    plannedSceneIds: string[];
    reason: string;
    legibilityStatus: 'approved' | 'needs-crop' | 'too-dense';
    permissionStatus: 'allowed' | 'reference-only' | 'unknown';
    implementation?: {
      targetSceneIds: string[];
      projectAssetIds: string[];
      primaryElementId?: string;
      companionElementIds: string[];
      finalDisposition: FinalDisposition;
    };
  }>;
}
```

Create the plan in two stages:

1. `planned`, before storyboard authoring: choose evidence, teaching job, visual mode, and semantic `plannedSceneIds`. Do not invent final project IDs.
2. `final`, after project authoring: retain the planning decision and add `implementation` with actual scene, asset, primary element, companion element, and disposition IDs.

An item may cover several related claims or candidates when they share one teaching job and disposition. Do not use a broad item to hide a missing candidate decision. Every approved visual candidate must appear in exactly one plan item. For `original` or `crop`, `primaryElementId` must identify the image; explanatory text, diagrams, or labels belong in `companionElementIds` and are allowed. For `show-then-reconstruct`, use the image as primary and list reconstructed elements as companions.

## Decision order

For each source visual, choose the first option that satisfies the teaching job:

1. The visual is source-specific evidence or a unique example and is not catastrophically degraded: use `original` or `crop`. Mild softness, imperfect theme fit, or enlargement up to 2.5× does not make it unusable.
2. The visual establishes source identity but needs editable progressive explanation: use `show-then-reconstruct`.
3. The structure matters but essential content is genuinely unreadable at the required size: retain the original with `show-then-reconstruct` when it still establishes identity; use reconstruction alone only when the original contributes no recognizable evidence or example.
4. The fact is textual and a visual would not improve understanding: use `text-only`.
5. The material is decorative, redundant, unverifiable, illegible, outside the learning goal, or not permitted: use `exclude` or `reference-only` with a concrete reason.

Do not choose `reconstruct` solely because it is easier to animate, easier to package, or more consistent with the theme. Do not choose `original` merely to increase image count. `show-then-reconstruct` is the preferred bridge when viewers should see both the source evidence and its editable explanation. `permissionStatus: unknown` is a disclosure or user-decision state, not automatic permission to exclude the visual or a claim that reconstruction resolves usage rights.

## Required audit

After project authoring, set the plan to `final` and run:

```bash
node skills/animation-production/scripts/audit-source-use.mjs <source-package.json> <source-use-plan.json> <project.json>
```

Migrate an existing version 1 final plan with:

```bash
node skills/animation-production/scripts/migrate-source-use-plan.mjs <v1-plan.json> <project.json> <v2-plan.json>
```

The audit checks stable references, selected-claim and knowledge-node coverage, approved-candidate disposition, target scenes, project assets, image elements, and reconstruction provenance. It also reports:

- claim coverage;
- knowledge-node coverage;
- approved visual utilization by disposition;
- source image asset and image-element counts;
- exclusions and reference-only decisions.

Treat missing dispositions, invalid references, unimplemented source-image plans, or unsupported all-reconstruction as errors. An image-free `source-forward` or `balanced` project with usable approved source visuals fails unless the exception names all reviewed source asset IDs and gives a concrete per-asset reason. A successful audit does not prove that a crop is readable or a reconstruction is accurate; rendered review remains required.

## Delivery report

For source-based work, report the SourceUsePlan path and audit result. Summarize how many approved candidates were used as original/crop, shown then reconstructed, reconstructed, kept reference-only, and excluded. Name material omissions that affect the learning goal.
