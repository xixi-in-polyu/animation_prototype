import { CURRENT_SCHEMA_VERSION, type AnimationProject } from './types';
import { assertValidProject } from './validator';

export function migrateProject(input: unknown): AnimationProject {
  if (!input || typeof input !== 'object') throw new Error('The selected file is not a project.');
  const candidate = structuredClone(input) as Record<string, unknown>;
  if (candidate.schemaVersion === undefined) candidate.schemaVersion = 1;
  if (typeof candidate.schemaVersion !== 'number' || candidate.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error('This project was created by a newer version of Storyline Studio.');
  }
  if (candidate.schemaVersion === 1) {
    candidate.renderConfig = { fps: 30, width: 1920, height: 1080 };
    const scenes = Array.isArray(candidate.scenes) ? candidate.scenes as Array<Record<string, unknown>> : [];
    scenes.forEach((scene) => {
      const elements = Array.isArray(scene.elements) ? scene.elements as Array<Record<string, unknown>> : [];
      elements.forEach((element) => {
        if (!Array.isArray(element.items)) return;
        element.items = element.items.map((item, index) => typeof item === 'string'
          ? { id: `${String(element.id)}-item-${index + 1}`, label: item }
          : item);
      });
    });
    candidate.schemaVersion = 2;
  }
  assertValidProject(candidate);
  return candidate;
}
