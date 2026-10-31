---
name: animation-production
description: Turn a topic, outline, knowledge points, or narration script into an editable Storyline Studio AnimationProject with deliberate scene structure, visual grammar, narration timing, and motion choreography. Use for creating or revising this repository's data-driven animations; exclude PDF extraction, voice synthesis, and final video rendering.
---

# Animation Production

Produce a coherent, editable animation project rather than arbitrary React or Remotion code. Treat `AnimationProject` JSON as the deliverable and the repository renderer as the runtime.

## Establish the task

Accept a topic, outline, knowledge points, or an existing project. Preserve explicit duration, locale, tone, audience, aspect ratio, and brand choices. If they are absent, infer conservative defaults from the request instead of blocking: use the user's language, 16:9, 30 FPS, and a duration appropriate to the supplied content.

Do not perform PDF parsing, TTS generation, or final video rendering under this skill. Do not modify renderer or editor source code unless the user explicitly asks for a product change.

Find the Storyline Studio repository root by locating `src/model/types.ts` and `package.json`. Read the canonical model files when they may have changed; repository code wins over these references.

## Choose the operating mode

- For a new animation, read [references/choreography.md](references/choreography.md), then [references/project-contract.md](references/project-contract.md). Start from [assets/starter-project.json](assets/starter-project.json) when it saves work.
- For a revision, inspect the existing project first, retain stable IDs for unchanged objects, and read only the relevant reference sections.
- For a storyboard-only request, return the scene plan without manufacturing JSON.
- For validation or repair, run `node skills/animation-production/scripts/validate-project.mjs <project.json>` and repair errors before warnings.

## Production loop

1. Define the through-line: audience, promised outcome, opening tension, chapter progression, and closing takeaway.
2. Allocate duration across chapters and scenes. Give every scene one communication job and one dominant visual idea.
3. Write narration before fine motion. Segment it into timed units with no gaps or overlaps unless silence is intentional.
4. Select the smallest supported element vocabulary that communicates the idea. Keep visible copy shorter than narration and avoid repeating the same composition scene after scene.
5. Choreograph motion from narration beats. Motion must explain hierarchy, sequence, comparison, change, or emphasis; decorative ambient motion is secondary.
6. Build schema-version-4 JSON, preserving source provenance only when the user actually supplied it. Never invent page citations or source documents.
7. Run the validator. Review warnings for readability and canvas bounds, then import into Storyline Studio for visual review when preview is in scope.
8. Iterate on pacing, collisions, visual repetition, and narration synchronization. Stop when the requested artifact is valid and the requested review is complete.

## Delivery rules

When creating a file and no path is specified, write `output/<project-slug>.animation.json`, creating `output/` if needed. Do not overwrite an existing project without inspecting it and preserving user work.

Report the artifact path, total duration, scene count, validation result, and any remaining visual-review caveats. A passing structural validator is necessary but does not prove that typography, density, or pacing looks good.
