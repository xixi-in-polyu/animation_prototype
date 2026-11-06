# Storyline Studio

Storyline Studio is an editable, data-driven animation prototype built around the supplied Software Development Lifecycle lecture. It demonstrates how a future PDF-to-animation pipeline can produce a stable `AnimationProject` instead of arbitrary UI code.

## Run locally

```bash
npm install
npm run dev
```

Then open the local address shown by Vite. Chrome or Edge is recommended for narration.

## Vercel deployment

The repository includes `vercel.json` for the Vite `dist` output and SPA deep-link fallback. Connect the repository in Vercel or run `vercel` from the repository root. Production deployments should keep large source documents, extracted media, and rendered videos in object storage rather than in the deployment bundle; Vercel should host the editor and lightweight orchestration APIs, not long-running video renders.

## What is included

- A 12-scene, 13-minute SDLC story with English narration and source-page provenance.
- A four-area editor for scene ordering, script, layout, styling, timing, and theme changes.
- A Remotion-powered, frame-deterministic 16:9 renderer shared by edit and preview modes.
- Play, pause, seek, chapter navigation, browser speech, and a complete per-scene transcript outside the video frame with word-level read-along highlighting.
- Undo, redo, reset, duplication, deletion, and scene creation.
- Versioned JSON import/export with validation and migration hooks.
- A `GenerationAdapter` boundary for future PDF parsing and AI storyboard generation.
- Independently editable component items with stable IDs, plus validation for empty or duplicate generated content.
- Narration-driven motion cues, deterministic component choreography, ambient motion, and editable Remotion scene transitions.
- First-class sourced image and code elements, including normalized crops, provenance, Shiki highlighting, and line emphasis.
- An animation-production skill with PPTX media extraction, rendered-page catalogs, candidate ranking, portable asset embedding, code verification, layered review, and explicit preview feedback.

## Project structure

- `src/model` — public project types, validation, migration, timeline, and generation adapter.
- `src/data` — the manually authored SDLC example project.
- `src/components` — reusable editor, Remotion composition, player, and visualization components.
- `src/hooks` — history and browser narration behavior.
- `skills/animation-production` — reusable production rules, source-ingestion scripts, validators, and review tools.
- `TODO.md` — platform/API work intentionally kept out of the production skill.

## Project file contract

Exported `.json` files use `schemaVersion: 5`, including frame rate, render dimensions, scene transitions, structured enter/beat/exit/ambient motion, editable visual grammar, sourced image/code elements, surface treatment, and caption layout. Schema v1–v4 projects are migrated on import: string component items receive stable IDs, legacy animations become narration-driven motion cues, and older scenes receive deterministic visual and caption defaults. The default render configuration is 30 FPS at 1920×1080. Future generators should output an `AnimationProject` and pass `projectValidator` before loading. Unknown element, motion, visual, or caption types and newer schema versions are rejected instead of executing generated code.
# animation_prototype
