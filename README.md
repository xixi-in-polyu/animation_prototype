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
- A shared 16:9 renderer used by both edit and preview modes.
- Play, pause, seek, chapter navigation, captions, browser speech, and speed controls.
- Undo, redo, reset, duplication, deletion, and scene creation.
- Versioned JSON import/export with validation and migration hooks.
- A `GenerationAdapter` boundary for future PDF parsing and AI storyboard generation.

## Project structure

- `src/model` — public project types, validation, migration, timeline, and generation adapter.
- `src/data` — the manually authored SDLC example project.
- `src/components` — reusable editor, player, and visualization components.
- `src/hooks` — history and browser narration behavior.

## Project file contract

Exported `.json` files use `schemaVersion: 1`. Future generators should output an `AnimationProject` and pass `projectValidator` before loading. Unknown element types and newer schema versions are rejected instead of executing generated code.
# animation_prototype
