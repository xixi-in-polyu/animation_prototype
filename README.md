# Storyline Studio

Storyline Studio is an editable, data-driven animation prototype built around the supplied Software Development Lifecycle lecture. It demonstrates how a future PDF-to-animation pipeline can produce a stable `AnimationProject` instead of arbitrary UI code.

## Run locally

```bash
npm install
npm run dev
```

Then open the local address shown by Vite. Chrome or Edge is recommended for narration.

## What is included

- A 12-scene, 13-minute SDLC story with English narration and source-page provenance.
- A four-area editor for scene ordering, script, layout, styling, timing, and theme changes.
- A Remotion-powered, frame-deterministic 16:9 renderer shared by edit and preview modes.
- Play, pause, seek, chapter navigation, captions, browser speech, and speed controls.
- Undo, redo, reset, duplication, deletion, and scene creation.
- Versioned JSON import/export with validation and migration hooks.
- A `GenerationAdapter` boundary for future PDF parsing and AI storyboard generation.
- Independently editable component items with stable IDs, plus validation for empty or duplicate generated content.
- Narration-driven motion cues, deterministic component choreography, ambient motion, and editable Remotion scene transitions.

## Project structure

- `src/model` — public project types, validation, migration, timeline, and generation adapter.
- `src/data` — the manually authored SDLC example project.
- `src/components` — reusable editor, Remotion composition, player, and visualization components.
- `src/hooks` — history and browser narration behavior.

## Project file contract

Exported `.json` files use `schemaVersion: 3`, including frame rate, render dimensions, scene transitions, and structured enter/beat/exit/ambient motion. Schema v1 and v2 projects are migrated on import: string component items receive stable IDs, legacy animations become narration-driven motion cues, and the default render configuration is 30 FPS at 1920×1080. Future generators should output an `AnimationProject` and pass `projectValidator` before loading. Unknown element or motion types and newer schema versions are rejected instead of executing generated code.
# animation_prototype
