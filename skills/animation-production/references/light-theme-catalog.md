# Approved light themes

Use this catalog for every substantial new animation. It intentionally contains only three approved light themes. Keep one theme across the whole project; do not switch themes between chapters.

All three themes use a flat background. Do not add background gradients, blurred orbs, glow fields, vignettes, or chapter-specific background treatments. Scene templates may change layout and information structure, but not the project's font family, canvas treatment, surface material, or palette.

Chapter and element accents must remain inside the selected theme. Use `accent` as the project-wide default and `accentAlt` only for a deliberate secondary distinction. Do not carry arbitrary chapter colors or element accent values from a source project into a newly themed project.

Explicit user direction wins. Otherwise select from subject matter, audience, tone, information density, and source imagery. Record the selected ID, evidence, and closest rejected candidate in the Reel Read. Do not choose randomly or treat palette alone as a rationale.

## Selection

- Choose `indigo-porcelain` for academic research, data or AI analysis, and serious technical briefings that benefit from a contemporary journal character and indigo information hierarchy.
- Choose `monochrome-print` for papers, long-form argument, theory, criticism, and restrained research communication where typography and structure should recede behind the ideas.
- Choose `white-editorial` when the topic has no strong thematic signal, the two academic treatments would overstate the subject, or a neutral reusable teaching surface is preferable. This is the default.

When both academic themes fit, prefer `indigo-porcelain` for diagrams, quantitative evidence, systems, and technical structure; prefer `monochrome-print` for prose, interpretation, literature review, and conceptual argument. Being supplied as a PDF or document is not itself evidence for an academic theme.

## ProjectTheme mappings

These are adaptations for the repository's current single-font, seven-color `ProjectTheme` contract. Use the values exactly unless the user supplies brand requirements. Do not claim they reproduce the richer upstream CSS themes in full.

### `white-editorial`

Neutral default: pure white, black editorial type, restrained blue and rust accents.

```json
{
  "name": "white-editorial",
  "background": "#FFFFFF",
  "surface": "#F6F6F3",
  "foreground": "#111111",
  "muted": "#666666",
  "accent": "#1F4E79",
  "accentAlt": "#8A3B2E",
  "fontFamily": "\"Times New Roman\", Times, serif"
}
```

### `indigo-porcelain`

Academic and serious technical: porcelain paper, indigo ink, quiet hierarchy.

```json
{
  "name": "indigo-porcelain",
  "background": "#FCFBF7",
  "surface": "#F1F0E9",
  "foreground": "#203A72",
  "muted": "#697083",
  "accent": "#2C55A2",
  "accentAlt": "#9A7440",
  "fontFamily": "\"Times New Roman\", Times, serif"
}
```

### `monochrome-print`

Restrained research and long-form argument: warm print surface, near-black ink, a single muted ink-blue accent.

```json
{
  "name": "monochrome-print",
  "background": "#FAF9F5",
  "surface": "#F0EFEA",
  "foreground": "#181818",
  "muted": "#66645F",
  "accent": "#27394E",
  "accentAlt": "#827B70",
  "fontFamily": "\"Times New Roman\", Times, serif"
}
```

Times New Roman is a system-font preference, not a bundled font asset. Keep the fallback stack intact and report when the preview or export environment substitutes another serif. Components that hard-code their own font may not inherit the project theme; report that as a product limitation rather than silently modifying renderer code.

## Attribution

`indigo-porcelain` and `monochrome-print` are adapted from the light-theme concepts in ConardLi's MIT-licensed `garden-skills` `web-video-presentation` theme gallery and theme reference:

- https://github.com/ConardLi/garden-skills/blob/main/skills/web-video-presentation/README.md#theme-gallery
- https://github.com/ConardLi/garden-skills/blob/main/skills/web-video-presentation/references/THEMES.md

The mappings above are local adaptations to Storyline Studio's smaller `ProjectTheme` schema, not copies of the upstream CSS token implementations.
