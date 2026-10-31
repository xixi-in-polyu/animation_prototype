# Story and choreography grammar

Read this reference for new animations or substantial scene redesigns.

## Build the story spine

Turn the input into a change in understanding, not a list of facts:

1. Opening: establish a question, tension, surprising claim, or destination.
2. Orientation: give the minimum model the audience needs.
3. Development: reveal sequence, comparison, mechanism, evidence, or consequence.
4. Synthesis: connect the pieces and state why the relationship matters.
5. Closing: leave one memorable takeaway or next action.

Not every short animation needs all five as separate scenes. Merge stages when the content is small. Split a scene when it has two independent claims, more than one dominant diagram, or more visible items than can be scanned comfortably.

## Scene selection

Choose a template by the scene's communication job:

- `opening`: hook and promise; usually a title plus one strong visual
- `concept`: definition, principle, or mental model
- `process`: ordered steps or causal flow
- `comparison`: alternatives, before/after, or tension between ideas
- `incident`: unfolding event, failure, or case narrative
- `architecture`: system components and relationships
- `closing`: synthesis and memorable ending

Give each scene one dominant visual. Supporting text should clarify it rather than compete with it. Use a title plus one main structured element as the default composition; add a badge or short text only when it adds a distinct layer.

## Pacing

Estimate narration from the requested language and delivery style, then assign explicit scene durations. As a starting point, allow roughly 3–6 seconds for a short statement and enough time to scan structured items after they appear. Prefer a quiet final beat over ending narration exactly on the last frame.

Keep narration segments semantically complete. Align segment boundaries with visual changes. Do not divide timing evenly when ideas differ substantially in complexity.

## Visual mapping

- sequence or dependency → `flow`
- recurrence → `lifecycle`
- parallel categories → `cards`
- opposition or before/after → `comparison`
- chronological change → `timeline`
- quantities and KPIs → `metrics`
- system relationships → `topology`
- equation or calculation → `formula`
- thesis, qualifier, or key takeaway → `title`, `text`, or `badge`

Prefer direct labels. Put explanation in narration, not in dense on-screen paragraphs. Vary scene composition intentionally, but do not switch visual types merely for novelty.

## Motion mapping

Use motion to reveal meaning:

- `draw` + `trace` for flows, timelines, and topologies
- `spring-scale` + `count-up` for metrics and formulas
- `fade-rise` + `lift` for cards and comparisons
- `spring-scale` + `glow` for lifecycle emphasis
- `fade-rise` + `pulse` for titles, text, and badges

Trigger the first visual at scene start. Trigger explanatory beats from the narration segment that discusses the corresponding element. Stagger item reveals only when order matters or sequential scanning helps. Use exits sparingly; leave enough time for them to finish. Ambient motion should remain subtle and usually be `none` for text-heavy scenes.

## Review pass

Review the project as a film, not only as JSON:

- Can the scene's claim be understood in one sentence?
- Is every visible item discussed or intentionally contextual?
- Does motion point to the current narration rather than distract from it?
- Are adjacent scenes visually distinguishable without breaking stylistic unity?
- Can all text be read before the next transition?
- Does the closing resolve the opening promise?
