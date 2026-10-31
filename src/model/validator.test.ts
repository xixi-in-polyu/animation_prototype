import { describe, expect, it } from 'vitest';
import { createSdlcProject } from '../data/sdlcProject';
import { LocalExampleGenerationAdapter } from './generation';
import { migrateProject } from './migrate';
import { getProjectDuration } from './timeline';
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
