import { describe, expect, it } from 'vitest';
import { createSdlcProject } from '../data/sdlcProject';
import { LocalExampleGenerationAdapter } from './generation';
import { migrateProject } from './migrate';
import { framesToSeconds, getProjectDuration, getProjectDurationInFrames, secondsToFrames } from './timeline';
import { projectValidator } from './validator';
import { compileElementMotion } from './motion';
import { cloneScene } from '../components/SceneList';
import { createDiagramDemoProject } from '../data/diagramDemoProject';

describe('project model', () => {
  it('accepts model-authored branching diagrams and rejects broken links', () => {
    const project = createDiagramDemoProject();
    expect(projectValidator.validate(project).filter((issue) => issue.severity === 'error')).toEqual([]);
    const graph = project.scenes[0].elements.find((element) => element.type === 'diagram')?.diagram;
    expect(graph?.edges).toHaveLength(4);
    if (!graph) throw new Error('Missing diagram fixture');
    graph.edges[0].to = 'missing-node';
    expect(projectValidator.validate(project).some((issue) => issue.path.includes('diagram.edges[0]') && issue.severity === 'error')).toBe(true);
  });
  it('validates the SDLC example without errors', () => {
    const errors = projectValidator.validate(createSdlcProject()).filter((issue) => issue.severity === 'error');
    expect(errors).toEqual([]);
  });

  it('covers a 13 minute timeline', () => {
    expect(getProjectDuration(createSdlcProject())).toBe(780);
  });

  it('round trips through JSON migration', () => {
    const project = createSdlcProject();
    const imported = migrateProject(JSON.parse(JSON.stringify(project)));
    expect(imported).toEqual(project);
  });

  it('migrates schema v1 string items into independently editable items', () => {
    const legacy = JSON.parse(JSON.stringify(createSdlcProject()));
    legacy.schemaVersion = 1;
    delete legacy.renderConfig;
    legacy.scenes.forEach((scene: { elements: Array<{ items?: Array<{ label: string }> }> }) => scene.elements.forEach((element) => {
      if (element.items) element.items = element.items.map((item) => item.label) as never;
    }));
    const migrated = migrateProject(legacy);
    const flow = migrated.scenes[1].elements.find((element) => element.type === 'flow');
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.renderConfig).toEqual({ fps: 30, width: 1920, height: 1080 });
    expect(flow?.items?.[0]).toEqual({ id: 's2-flow-item-1', label: 'Requirements' });
    expect(flow?.motion.beats).toHaveLength(4);
  });

  it('migrates schema v2 animation fields into narration-driven motion', () => {
    const legacy = JSON.parse(JSON.stringify(createSdlcProject()));
    legacy.schemaVersion = 2;
    legacy.scenes.forEach((scene: { transitionOut?: unknown; elements: Array<Record<string, unknown>> }) => {
      delete scene.transitionOut;
      scene.elements.forEach((element) => {
        element.animation = { enter: 'rise', start: 1, duration: 1.2 };
        delete element.motion;
      });
    });
    const migrated = migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.scenes[0].transitionOut).toEqual({ preset: 'fade', duration: 0.6 });
    expect(migrated.scenes.at(-1)?.transitionOut).toBeUndefined();
    expect(migrated.scenes[0].elements[0].motion.enter.preset).toBe('fade-rise');
    expect(migrated.scenes[0].elements[0].motion.beats).toHaveLength(4);
  });

  it('migrates schema v3 projects into editable visual grammars and caption layouts', () => {
    const legacy = JSON.parse(JSON.stringify(createSdlcProject()));
    legacy.schemaVersion = 3;
    legacy.scenes.forEach((scene: { captionMode?: unknown; elements: Array<{ visual?: unknown }> }) => {
      delete scene.captionMode;
      scene.elements.forEach((element) => delete element.visual);
    });
    const migrated = migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.scenes[0].captionMode).toBe('bottom');
    expect(migrated.scenes[1].elements.find((element) => element.type === 'flow')?.visual).toEqual({ variant: 'rail', surface: 'none' });
    expect(projectValidator.validate(migrated).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('rejects unsupported visual grammar and caption layout values', () => {
    const project = createSdlcProject();
    project.scenes[0].captionMode = 'floating-everywhere' as never;
    project.scenes[0].elements[0].visual.variant = 'random-html' as never;
    const errors = projectValidator.validate(project).filter((issue) => issue.severity === 'error');
    expect(errors.some((issue) => issue.path.endsWith('captionMode'))).toBe(true);
    expect(errors.some((issue) => issue.path.endsWith('visual.variant'))).toBe(true);
  });

  it('migrates schema v4 projects to schema v5', () => {
    const legacy = JSON.parse(JSON.stringify(createSdlcProject()));
    legacy.schemaVersion = 4;
    const migrated = migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(5);
    expect(projectValidator.validate(migrated).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('validates first-class image and sourced code elements', () => {
    const project = createSdlcProject();
    project.assets.push({
      id: 'asset-slide-image', name: 'Slide image', kind: 'image', uri: 'data:image/png;base64,iVBORw0KGgo=', embedded: true,
      source: { documentId: project.sourceDocuments[0].id, page: 2, extraction: 'native' },
    });
    const base = project.scenes[0].elements[0];
    project.scenes[0].elements.push({
      ...structuredClone(base), id: 'source-image', type: 'image', content: '', assetId: 'asset-slide-image', alt: 'Lifecycle diagram', fit: 'contain',
    }, {
      ...structuredClone(base), id: 'source-code', type: 'code', content: 'const ready = true', language: 'typescript', highlightLines: [1],
      codeSource: { extraction: 'repository', file: 'src/example.ts', startLine: 1, endLine: 1 }, codeVerification: 'exact',
      codePresentation: { theme: 'carbon-dark', windowChrome: 'mac', showLineNumbers: false, backdrop: 'soft-gray-gradient', fontSize: 24, padding: 32, frameInset: 60 },
    });
    expect(projectValidator.validate(project).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('rejects missing image assets and unverifiable code', () => {
    const project = createSdlcProject();
    const base = project.scenes[0].elements[0];
    project.scenes[0].elements.push({ ...structuredClone(base), id: 'bad-image', type: 'image', content: '', assetId: 'missing', alt: '' });
    project.scenes[0].elements.push({ ...structuredClone(base), id: 'bad-code', type: 'code', content: 'x()', language: '', highlightLines: [2] });
    project.scenes[0].elements.push({ ...structuredClone(base), id: 'bad-code-presentation', type: 'code', content: 'x()', language: 'javascript', codeSource: { extraction: 'generated' }, codeVerification: 'syntax', codePresentation: { fontSize: 100, windowChrome: 'window' } as never });
    const errors = projectValidator.validate(project).filter((issue) => issue.severity === 'error');
    expect(errors.some((issue) => issue.path.endsWith('assetId'))).toBe(true);
    expect(errors.some((issue) => issue.path.endsWith('codeSource'))).toBe(true);
    expect(errors.some((issue) => issue.path.includes('highlightLines'))).toBe(true);
    expect(errors.some((issue) => issue.path.includes('codePresentation.fontSize'))).toBe(true);
    expect(errors.some((issue) => issue.path.includes('codePresentation.windowChrome'))).toBe(true);
  });

  it('uses integer frames as the deterministic playback clock', () => {
    const project = createSdlcProject();
    expect(secondsToFrames(1.25, project.renderConfig.fps)).toBe(38);
    expect(framesToSeconds(38, project.renderConfig.fps)).toBeCloseTo(1.2667, 3);
    expect(getProjectDurationInFrames(project)).toBe(23400);
  });

  it('rejects empty visible component items', () => {
    const project = createSdlcProject();
    const flow = project.scenes[1].elements.find((element) => element.type === 'flow');
    if (flow?.items?.[0]) flow.items[0].label = '';
    expect(projectValidator.validate(project)).toContainEqual(expect.objectContaining({
      path: 'scenes[1].elements[1].items[0].label',
      severity: 'error',
    }));
  });

  it('rejects an unsupported element', () => {
    const project = createSdlcProject();
    project.scenes[0].elements[0].type = 'video' as never;
    expect(projectValidator.validate(project).some((issue) => issue.severity === 'error')).toBe(true);
  });

  it('rejects unknown motion presets and narration references', () => {
    const project = createSdlcProject();
    project.scenes[0].elements[0].motion.beats[0].preset = 'spin-wildly' as never;
    project.scenes[0].elements[0].motion.beats[1].trigger = { type: 'narration', segmentId: 'missing' };
    const errors = projectValidator.validate(project).filter((issue) => issue.severity === 'error');
    expect(errors.some((issue) => issue.message.includes('Unsupported motion preset'))).toBe(true);
    expect(errors.some((issue) => issue.message.includes('unknown narration segment'))).toBe(true);
  });

  it('computes deterministic motion for the same frame', () => {
    const project = createSdlcProject();
    const scene = project.scenes[1];
    const element = scene.elements.find((item) => item.type === 'flow')!;
    const cue = element.motion.beats[1];
    const trigger = cue.trigger;
    const cueStart = trigger.type === 'narration'
      ? scene.narration.find((item) => item.id === trigger.segmentId)!.start + (trigger.offset ?? 0)
      : trigger.at;
    const sampleTime = cueStart + cue.duration / 2;
    const first = compileElementMotion(element, scene, sampleTime, project.renderConfig.fps);
    const second = compileElementMotion(element, scene, sampleTime, project.renderConfig.fps);
    expect(first.style).toEqual(second.style);
    expect(first.itemStyle(1, element.items?.length ?? 0)).toEqual(second.itemStyle(1, element.items?.length ?? 0));
    expect(first.activeBeatIndex).toBe(1);
  });

  it('gives every supported component narration-driven choreography', () => {
    const project = createSdlcProject();
    const types = new Set(project.scenes.flatMap((scene) => scene.elements.map((element) => element.type)));
    expect(types.size).toBe(11);
    project.scenes.flatMap((scene) => scene.elements).forEach((element) => {
      expect(element.motion.enter).toBeDefined();
      expect(element.motion.beats.length).toBeGreaterThan(0);
    });
  });

  it('duplicates scenes with fresh narration and motion cue references', () => {
    const project = createSdlcProject();
    const copy = cloneScene(project.scenes[1]);
    const combined = { ...project, scenes: [...project.scenes, { ...copy, transitionOut: undefined }] };
    const sourceNarrationIds = new Set(project.scenes[1].narration.map((item) => item.id));
    expect(copy.narration.every((item) => !sourceNarrationIds.has(item.id))).toBe(true);
    copy.elements.flatMap((element) => element.motion.beats).forEach((cue) => {
      const trigger = cue.trigger;
      if (trigger.type === 'narration') expect(copy.narration.some((item) => item.id === trigger.segmentId)).toBe(true);
    });
    expect(projectValidator.validate(combined).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('proves the generation adapter can feed the same renderer model', async () => {
    const source = createSdlcProject();
    const adapter = new LocalExampleGenerationAdapter(createSdlcProject);
    const generated = await adapter.generate({
      document: source.sourceDocuments[0],
      knowledgeNodes: source.knowledgeNodes,
      targetDuration: 780,
      locale: 'en-US',
    });
    expect(generated.scenes).toHaveLength(12);
    expect(projectValidator.validate(generated).filter((issue) => issue.severity === 'error')).toEqual([]);
  });
});
