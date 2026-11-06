# Visual explanation from source material

Use this reference when a document, slide deck, or PDF supplies the knowledge for an animation. The aim is to make the source's ideas understandable on screen, not to reproduce its page layout. The amount of coverage depends on the requested duration and learning goal; no fixed image count or image-to-text ratio applies.

## Map before composing

For each important concept, jot down four things: the source page or section, the claim the viewer should understand, the evidence or example that supports it, and the best visual explanation. Rank concepts by teaching value and available time. A short video may develop one mechanism deeply; a longer one can connect several mechanisms. Do not compress a rich diagram into a name-only card merely to mention every topic.

Choose the visual form by what the viewer needs to see:

| Teaching job | Useful forms |
| --- | --- |
| Where something goes or who interacts | topology, annotated source diagram, data or traffic path |
| How a state changes | before/after, staged reveal, timeline, state diagram |
| How alternatives differ | aligned diagrams using the same scale and labels, comparison with consequences |
| Why a result occurs | causal chain, trace, worked example, highlighted evidence |
| How a quantity is derived | chart, formula with values, calculation steps |
| What code does | editable code with the relevant lines highlighted and a visible input/output or effect |

## Diagram grammar for video

For a tree, flow, architecture, causal chain, or state machine, write the underlying graph before styling it: entities or states as nodes; parentage, direction, dependency, data, or traffic as typed links; and the starting and ending states when they differ. A tree needs visible branching and hierarchy. A flow needs arrow direction and any real decision branches. A system diagram needs meaningful component shapes or internal marks, plus labels on the connections when the connections carry the lesson. Avoid reducing these relationships to evenly spaced boxes joined by generic arrows.

Lay out the graph so direction and grouping are evident at video size. Route links around labels, connect to the relevant object edges, and keep color meanings stable across scenes. Use a consistent frame and vocabulary for before/after or option comparisons. Do not add nodes, arrows, percentages, or capacity claims absent from the source unless clearly marked as a teaching example.

The in-conversation visualization approach transfers as a drawing method, not as a runtime dependency. For a video, render the graph with local SVG/HTML/React elements or a project asset, using the project's fixed canvas, fonts, and colors. Make visual state a deterministic function of video time. Replace hover, clicks, responsive host styles, and browser-only data loading with visible labels and narration-timed focus or reveals. Keep assets local so preview and final render match.

Storyline Studio now has a `diagram` element with explicit nodes, edges, and scene-relative `revealAt` times. Use it for editable branching trees and multi-path systems. Use the simpler `flow` and `topology` components for genuinely linear sequences. A source crop remains useful when its original illustration communicates more clearly than a reconstruction. See [project-contract.md](project-contract.md) for the graph fields.

Use a source visual when its structure and labels survive cropping and scaling. Rebuild it with editable elements when the source is blurry, crowded, or needs staged explanation. Use `show-then-reconstruct` when the original supplies evidence or source identity and the reconstruction supplies staged understanding. Preserve the source's meaning and provenance in every case. A decorative picture is not a replacement for the causal or structural diagram a concept needs. Generated teaching examples must be identified as such.

## Pace information, not pages

Let the narration reveal or focus the relevant part as it is explained: establish the entities, then draw or emphasize the relevant link, then show the resulting state or consequence. Give the viewer time to inspect labels before changing the state. If several alternatives need comparison, keep their visual grammar consistent so differences are legible. Divide a dense source figure across beats or scenes when its labels cannot be read at the delivered resolution. Use a full page only when its layout itself matters and remains readable.

Visible copy should carry definitions, distinctions, values, and consequences that help the viewer follow the picture. It need not transcribe the narration. A title plus several short labels is insufficient when the source contains a mechanism the viewer should learn.

## Review question

At representative moments, ask: after hearing the narration and looking at this frame, can a viewer explain the mechanism or distinction in their own words? Check whether the visual shows the relevant entities, links, direction, state, or evidence; whether its labels can be read at normal playback size; and whether its appearance matches the narration beat. If the answer depends on reading a tiny source crop or on narration alone, enlarge, crop, reconstruct, or split the explanation.
