# AnimationProject contract

Use this reference when creating, repairing, or validating project JSON. The canonical definitions remain `src/model/types.ts`, `src/model/validator.ts`, `src/model/motion.ts`, and `src/model/visual.ts`.

## Top-level shape

Every project uses `schemaVersion: 5` and contains:

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
- `captionMode`: retained for import compatibility. The editor presents the complete scene transcript outside the 16:9 video frame rather than burning captions into the composition.
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
| `image` | sourced picture, diagram, or rendered crop | no items; requires `assetId` and `alt` |
| `code` | editable, syntax-highlighted source code | no items; requires language and provenance |
| `cards` | parallel concepts or categories | 3–6 |
| `flow` | ordered process | 3–7; never more than 9 |
| `lifecycle` | recurring loop | 4–7 |
| `comparison` | opposing or paired choices | 2–4 |
| `timeline` | chronological events | 3–7 |
| `metrics` | quantitative signals | 2–5; three items use a three-column layout |
| `topology` | components and architecture | 3–7 |
| `diagram` | explicit tree, branching flow, or multi-path graph | nodes and edges, paced by reveal time |
| `formula` | equation and its terms | 2–5 |

Each element requires `id`, `type`, editable `content`, normalized-percent geometry (`x`, `y`, `width`, `height`), `motion`, and `visual`. `items`, when present, contain stable unique `{id, label}` objects. An element must have non-empty `content` or at least one item.

An `image` element may use empty `content` when it has an asset reference; `content` acts as an optional visible caption. The current renderer overlays a nonempty caption at the bottom of the image, so leave `content` empty when that overlay would obscure source evidence and preserve the explanation in `alt`, narration, or a separate text element. It requires `assetId`, `alt`, optional `fit: contain | cover`, and optional normalized `crop`. A future caption-position field is tracked as platform work.

Until comparison and metric items gain structured fields, use the renderer's exact interim label forms: `Heading — detail` for `comparison` and `value · label` for `metrics`. Use an em dash and middle dot with one space on both sides. Do not rely on this encoding outside the current schema version.

A `code` element stores code in `content` and requires `language`, `codeSource`, and `codeVerification: exact | syntax | display-only`. `highlightLines` uses one-based line numbers. It may include an editable `codePresentation` object:

```json
{
  "theme": "carbon-dark",
  "windowChrome": "mac",
  "showLineNumbers": false,
  "backdrop": "soft-gray-gradient",
  "fontSize": 24,
  "padding": 32,
  "frameInset": 60,
  "frameInsetY": 100
}
```

Supported themes are `github-dark` and `carbon-dark`; window chrome is `toolbar`, `mac`, or `none`; backdrop is `none`, `soft-gray`, or `soft-gray-gradient`. Font size is 12–36 pixels, padding 0–72, horizontal frame inset 0–240, and vertical frame inset 0–300. Omitted fields use the existing editor-style defaults, so older projects remain visually stable.

A `diagram` element stores a `diagram` object with nonempty `nodes` and an `edges` array. Each node has a stable `id`, `label`, and `x`, `y`, `width`, `height` in 0–100 percent coordinates relative to the diagram element; it may set `revealAt` in scene seconds and `tone: primary | secondary | neutral`. Each edge has a stable `id`, `from`, `to` referencing distinct node IDs, optional `label`, `revealAt`, and `kind: directed | undirected`. Use it when the graph's actual branching or routing is the lesson. Keep graph positions and labels readable at the final video resolution. Source page references belong on the diagram element when it reconstructs a sourced relationship.

Keep `x` and `y` non-negative and `x + width <= 100`, `y + height <= 100`. Avoid overlaps even though the structural validator cannot reliably detect them.

Visual variants: `auto`, `grid`, `rail`, `split`, `orbital`, `editorial`, `diagram`, `poster`, `minimal`. Surface styles: `none`, `soft`, `outline`.

## Motion contract

Every element has one `enter`, zero or more `beats`, an optional `exit`, and optional `ambient`.

- enter presets: `fade-rise`, `spring-scale`, `wipe-reveal`, `draw`
- beat presets: `pulse`, `lift`, `focus`, `glow`, `trace`, `count-up`
- exit presets: `fade`, `slide`, `shrink`
- ambient presets: `none`, `drift`, `breathe`, `orbit`

Every cue requires a unique `id`, positive `duration`, supported `preset`, and either `{type: "time", at}` or `{type: "narration", segmentId, offset?}`. The resolved cue interval must remain within the scene.

The current `count-up` preset scales a metric for emphasis; it does not interpolate numeric text. Do not promise animated numeric counting. A numeric implementation or preset rename is tracked as platform work.

## Provenance

Only populate `sourceDocuments`, `knowledgeNodes.sourcePages`, or `elements.sourcePages` from actual supplied source data. For an unsourced animation, use empty source collections and omit element source pages. Never convert general model knowledge into fabricated citations.

Image assets may record `sha256`, pixel dimensions, and `source` containing document, page/slide, object ID, normalized crop, and extraction method. Asset URIs must never be absolute filesystem paths. The current repository preview resolves non-data image URIs from Vite/Remotion `public/`; place a preview copy there and record that limitation in delivery. Portable bundle-relative resolution is platform work tracked in `TODO.md`. Repository code provenance records a project-relative file, line range, and commit when available.
