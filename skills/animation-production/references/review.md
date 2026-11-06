# Layered validation and preview

Use all three layers for a complete animation. Keep their conclusions separate. Report review authority explicitly:

- `automated-preflight`: validators and heuristics only;
- `vision-reviewed`: representative rendered frames inspected by a vision-capable model or document service;
- `human-approved`: a named human reviewed the requested playback or artifact.

Never promote `automated-preflight` or `vision-reviewed` to `human-approved`. A vision model may complete draft visual review when allowed, but release approval remains pending unless the task explicitly does not require human approval.

## 1. Structural validation

Run:

```bash
node skills/animation-production/scripts/validate-project.mjs <project.json>
```

This checks schema version, IDs, supported values, timing bounds, cue references, canvas bounds, and other model invariants. Repair errors before warnings. A pass means the project is structurally loadable; it says nothing about visual quality.

For source-based work, validate the source package and audit its final use separately:

```bash
node skills/animation-production/scripts/validate-source-package.mjs <source-package.json>
node skills/animation-production/scripts/audit-source-use.mjs <source-package.json> <source-use-plan.json> <project.json>
```

The first command validates extraction and provenance structure. The second verifies selected-claim coverage, knowledge-node coverage, approved-candidate disposition, target scenes, final asset/element IDs, and the selected source-use mode. Neither command is visual approval.

## 2. Visual review

Import the project into Storyline Studio and inspect the timeline and final-layout views. Review representative frames at the start, middle, and end of every scene, plus transitions.

Check:

- overlap, clipping, safe margins, and title/caption competition;
- text size, scan time, density, and contrast;
- whether each scene has one dominant visual idea;
- for source-based work, whether the visual actually explains the source concept or merely names it; inspect legibility and accuracy of cropped figures at playback size;
- whether diagrams, comparisons, code, or worked examples appear at the narration beat where they are explained, and whether important source ideas are covered at a depth appropriate to the target duration;
- composition repetition across adjacent scenes;
- motion continuity, unwanted resets, and distracting ambient motion;
- whether the selected style remains coherent while scene formats change.
- whether the frame could be mistaken for a topic-swappable AI promo after replacing its text;
- whether gradients, glows, glass, rounded cards, particles, and ambient loops have an explicit information function;
- whether the composition remains distinctive in grayscale without decorative effects.
- whether the transcript remains outside the video frame, contains the complete scene narration, and highlights only the word currently being read.

`review-project.mjs` can surface likely density and overlap risks, but those findings are only a preflight. Record the visual review as `pending`, `changes requested`, or `reviewed`, never infer `reviewed` from the structural validator.

For source-based projects, mark visual review `changes requested` when:

- an approved visual candidate has no final `SourceUsePlan` disposition;
- readable, permitted source-specific visuals exist but a `source-forward` project has no source image elements and no explicit all-reconstruction exception;
- a source-specific example is replaced by generic cards or icons without a teaching rationale;
- a table, graph, workflow, or illustration is reduced to labels even though its relationships are part of the learning goal;
- a reconstruction cannot be matched to source pages, entities, links, direction, values, or legend;
- a planned original/crop asset is unreadable at playback size;
- the project reports all preview samples as reviewed when only a subset was actually inspected.

## 3. Narrative, pacing, and audio review

Read the animation as a film rather than as independent scenes.

Check:

- the hook creates a reason to continue;
- every scene advances the promised takeaway;
- narration is semantically complete and aligned with the corresponding visual change;
- scene duration reflects idea complexity rather than uniform allocation;
- deliberate silence is distinguishable from accidental timing gaps;
- adjacent scenes avoid redundant claims;
- the closing resolves the opening and leaves a quiet final beat.
- generated TTS uses the intended language and voice metadata;
- scene audio plays in order and its measured duration fits the scene;
- narration-triggered motion lands on the spoken beat rather than an estimated script time;
- captions match the spoken words and share the same timing source as the project narration;
- narration edits regenerate only affected audio and do not leave stale captions or cue timing.

Use `node skills/animation-production/scripts/review-project.mjs <project.json>` for an automated preflight. A model may add a separate `vision-reviewed` conclusion after inspecting actual frames; only a human reviewer may record `human-approved`.

## Preview feedback loop

1. Import and preview the structurally valid project with its generated TTS audio.
2. Record concrete feedback by scene and timestamp.
3. Revise the project while preserving stable IDs for unchanged content.
4. Re-run structural validation and the relevant preflight checks.
5. Preview the revised version again; prior approval does not automatically apply to changed scenes.
6. Stop when the requested review is complete, and report anything that still needs playback or stakeholder judgment. Do not render a complete MP4 merely to perform this review.

Do not bulk-mark generated feedback samples as reviewed. Record the exact samples and transitions actually inspected; leave uninspected entries pending and report them as remaining review work.
