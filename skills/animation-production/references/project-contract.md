# AnimationProject contract

Use this reference when creating, repairing, or validating project JSON. The canonical definitions remain `src/model/types.ts`, `src/model/validator.ts`, `src/model/motion.ts`, and `src/model/visual.ts`.

## Top-level shape

Every project uses `schemaVersion: 4` and contains:

- identity: `id`, `title`, `description`, `locale`, `createdAt`, `updatedAt`
- rendering: `renderConfig` with positive integer `fps`, `width`, and `height`
- provenance: `sourceDocuments` and `knowledgeNodes`; both may be empty when no sources were supplied
- structure: non-empty `chapters` and `scenes`
- resources: `assets`
- look: `theme`

Default rendering is 30 FPS at 1920×1080. Use ISO-8601 timestamps. IDs must be stable, readable, and unique within their collection. Prefer slug-like IDs such as `scene-problem` and `scene-problem-flow`.

## Scene contract

Each scene requires:

- `id`, a valid `chapterId`, `title`, and one supported `template`
- positive `duration` in seconds
- `elements`, `narration`, and `knowledgeNodeIds` arrays
- `captionMode`: `bottom`, `side`, `keywords`, or `hidden`
- optional `transitionOut`: `fade`, `slide-left`, `slide-up`, or `wipe`, with a positive duration shorter than the scene

Templates are `opening`, `concept`, `process`, `comparison`, `incident`, `architecture`, and `closing`.

Narration segments require `id`, `text`, `start`, and `end`. Keep them inside the scene duration with `end > start`. Motion cues referencing narration must use an existing segment ID.

The final scene normally omits `transitionOut`.

## Element contract

Supported element types:

| Type | Intended use | Typical item count |
| --- | --- | --- |
| `title` | scene thesis or hook | no items |
| `text` | short supporting statement | no items |
| `badge` | compact label or takeaway | no items |
| `cards` | parallel concepts or categories | 3–6 |
| `flow` | ordered process | 3–7; never more than 9 |
| `lifecycle` | recurring loop | 4–7 |
| `comparison` | opposing or paired choices | 2–4 |
| `timeline` | chronological events | 3–7 |
| `metrics` | quantitative signals | 2–5 |
| `topology` | components and architecture | 3–7 |
| `formula` | equation and its terms | 2–5 |

Each element requires `id`, `type`, editable `content`, normalized-percent geometry (`x`, `y`, `width`, `height`), `motion`, and `visual`. `items`, when present, contain stable unique `{id, label}` objects. An element must have non-empty `content` or at least one item.

Keep `x` and `y` non-negative and `x + width <= 100`, `y + height <= 100`. Avoid overlaps even though the structural validator cannot reliably detect them.

Visual variants: `auto`, `grid`, `rail`, `split`, `orbital`, `editorial`, `diagram`, `poster`, `minimal`. Surface styles: `none`, `soft`, `outline`.

## Motion contract

Every element has one `enter`, zero or more `beats`, an optional `exit`, and optional `ambient`.

- enter presets: `fade-rise`, `spring-scale`, `wipe-reveal`, `draw`
- beat presets: `pulse`, `lift`, `focus`, `glow`, `trace`, `count-up`
- exit presets: `fade`, `slide`, `shrink`
- ambient presets: `none`, `drift`, `breathe`, `orbit`

Every cue requires a unique `id`, positive `duration`, supported `preset`, and either `{type: "time", at}` or `{type: "narration", segmentId, offset?}`. The resolved cue interval must remain within the scene.

## Provenance

Only populate `sourceDocuments`, `knowledgeNodes.sourcePages`, or `elements.sourcePages` from actual supplied source data. For an unsourced animation, use empty source collections and omit element source pages. Never convert general model knowledge into fabricated citations.
