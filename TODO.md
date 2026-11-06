# Platform TODO

These items belong to Storyline Studio or its engineering APIs. The animation-production skill may call and verify them, but must not emulate them with one-off project scripts.

## P0 — narrated project bundle

- [ ] Import and export a portable narrated-project bundle containing `*.animation.json`, relative image/font/audio assets, `tts-manifest.json`, captions, and `delivery-manifest.json`.
  - Resolve assets relative to the bundle rather than assuming Vite `public/` paths.
  - Bind scene audio from stable `sceneId` and `segmentId` values.
  - Preserve bindings through edit, save, export, and re-import.
  - Regenerate only affected scene audio and caption cues after narration edits.
  - Surface missing, stale, or duration-mismatched audio instead of falling back silently to browser speech.

- [ ] Provide an asynchronous, provider-neutral TTS synthesis API.
  - Accept stable scene and narration-segment IDs, text, locale, a semantic voice profile such as `default-academic`, delivery guidance, and an idempotency key. The LLM submits this content but never receives provider credentials or calls a TTS vendor directly.
  - Resolve semantic voice profiles to provider-specific models and voice IDs inside the platform. Keep Fish Audio or any later provider replaceable without changing existing projects or Skill instructions.
  - Keep provider API keys server-side. Expose queued, running, completed, failed, cancelled, and stale states with progress, retryable errors, and cancellation.
  - Cache by normalized text, voice profile, locale, delivery settings, provider model version, and synthesis options. Regenerate only changed scenes or segments.
  - Persist portable audio, measured duration, provider/model/voice metadata, content hashes, and segment or word alignment used by both captions and narration-triggered motion.
  - Return stable asset IDs and bundle-relative URIs, then update `tts-manifest.json` and caption data atomically so the editor never binds new audio to stale timing.
  - Support development and production provider policies separately, including rate limits, retention, licensing, fallback, and cost reporting.

- [ ] Provide an asynchronous MP4 export API for an immutable project revision.
  - Read the same project, audio, caption, and asset bundle used by editor playback.
  - Burn captions by default while retaining an editable SRT sidecar.
  - Expose preview and final quality profiles, progress, cancellation, failure details, and revision identity.
  - Keep long rendering out of interactive editor requests and Skill execution.

## P0 — source-document API

- [ ] Provide a versioned PDF/document ingestion API backed by private object storage.
  - Persist the original document, SHA-256, MIME type, page count, parser version, renderer version, and OCR version.
  - Produce deterministic page text, reading-order blocks, normalized bounding boxes, thumbnails, high-resolution page images, OCR results, and crops.
  - Recover embedded PDF image XObjects at native pixel dimensions, including object IDs, masks, color metadata, page association, and hashes. Use a high-resolution composite crop when vectors, masks, overlaid text, or several objects form one visual.
  - Record source pixels, planned target pixels, enlargement ratio, reviewed asset identity, and whether essential content remains readable. Mild softness is acceptable; resolution alone blocks source use only when essential content is unrecognizable or enlargement exceeds 2.5×.
  - Cache by document hash plus extraction options and tool versions; never overwrite an older extraction version.
  - Support resumable background jobs, progress, retries, retention, authorization, and explicit cleanup.

- [ ] Let an LLM or reviewer reopen evidence without resending or rediscovering the whole PDF.
  - Fetch a document, page, page image, text, blocks, asset, or crop by stable ID.
  - Search text and return page/block references.
  - Create a crop from normalized coordinates and preserve provenance.
  - Keep provider file references and signed URLs replaceable without changing stable document/page/asset IDs.

- [ ] Store task-specific semantic `SourcePackage` revisions separately from deterministic extraction.
  - A single extraction may support multiple audiences, durations, learning goals, and SourcePackages.
  - Preserve links from claims, nodes, visuals, crops, and final scene elements back to document/page/block/asset IDs.

## P1 — editor and review

- [ ] Add an automated editor import/playback smoke-test surface.
  - Import a bundle, seek to scene/time, capture a screenshot, verify audio binding, edit a field, save, and re-import.
  - Distinguish structural validation, automated preflight, vision review, narrated playback verification, and human approval.

- [ ] Replace theme-name magic strings with a registered theme-preset system.
  - Theme presets own canvas treatment, typography roles, palette, line/card material, and permitted decoration.
  - Bundle or verify fonts used for deterministic preview/export; remove runtime Google Fonts dependence from rendered scenes.
  - Ensure one project theme applies to every chapter and scene while templates vary layout only.

- [ ] Extend editable visual contracts where a schema change is required.
  - Image captions: `overlay | below | none`.
  - Comparison items: separate `label` and `detail` fields.
  - Metric items: separate `value` and `label` fields.
  - Numeric count-up behavior or rename the existing scale-only motion preset.

## Acceptance boundary

Until these APIs exist, the Skill may deliver the editable project plus `tts-request.json`, but it must mark TTS as pending or unavailable and must not claim narrated playback, completed audio synchronization, or MP4 readiness. It may report `ready-for-platform-export` only after the required audio and captions exist in the bundle. A direct TTS-provider call is not a Skill fallback; other local fallbacks, such as approved PDF extraction, require explicit user approval and must record their provider and versions.
