import { describe, expect, it } from 'vitest';
import { createSdlcProject } from '../data/sdlcProject';
import { LocalExampleGenerationAdapter } from './generation';
import { migrateProject } from './migrate';
import { framesToSeconds, getProjectDuration, getProjectDurationInFrames, secondsToFrames } from './timeline';
import { projectValidator } from './validator';

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
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.renderConfig).toEqual({ fps: 30, width: 1920, height: 1080 });
    expect(flow?.items?.[0]).toEqual({ id: 's2-flow-item-1', label: 'Requirements' });
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
