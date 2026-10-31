import { describe, expect, it } from 'vitest';
import { createSdlcProject } from '../data/sdlcProject';
import { LocalExampleGenerationAdapter } from './generation';
import { migrateProject } from './migrate';
import { framesToSeconds, getProjectDuration, getProjectDurationInFrames, secondsToFrames } from './timeline';
import { projectValidator } from './validator';
import { compileElementMotion } from './motion';
import { cloneScene } from '../components/SceneList';

describe('project model', () => {
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
    expect(migrated.schemaVersion).toBe(3);
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
    expect(migrated.schemaVersion).toBe(3);
    expect(migrated.scenes[0].transitionOut).toEqual({ preset: 'fade', duration: 0.6 });
    expect(migrated.scenes.at(-1)?.transitionOut).toBeUndefined();
    expect(migrated.scenes[0].elements[0].motion.enter.preset).toBe('fade-rise');
    expect(migrated.scenes[0].elements[0].motion.beats).toHaveLength(4);
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
    const first = compileElementMotion(element, scene, 16.8, project.renderConfig.fps);
    const second = compileElementMotion(element, scene, 16.8, project.renderConfig.fps);
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
