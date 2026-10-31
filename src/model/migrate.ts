import { CURRENT_SCHEMA_VERSION, type AnimationProject } from './types';
import { assertValidProject } from './validator';

export function migrateProject(input: unknown): AnimationProject {
  if (!input || typeof input !== 'object') throw new Error('The selected file is not a project.');
  const candidate = structuredClone(input) as Record<string, unknown>;
  if (candidate.schemaVersion === undefined) candidate.schemaVersion = CURRENT_SCHEMA_VERSION;
  if (typeof candidate.schemaVersion !== 'number' || candidate.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error('This project was created by a newer version of Storyline Studio.');
  }
  assertValidProject(candidate);
  return candidate;
}
