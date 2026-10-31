import { CURRENT_SCHEMA_VERSION, type AnimationProject, type ProjectValidator, type ValidationIssue } from './types';

const supportedElements = new Set([
  'title', 'text', 'cards', 'lifecycle', 'flow', 'comparison', 'timeline',
  'metrics', 'topology', 'formula', 'badge',
]);

export const projectValidator: ProjectValidator = {
  validate(value: unknown): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    if (!value || typeof value !== 'object') {
      return [{ path: '$', message: 'Project must be a JSON object.', severity: 'error' }];
    }
    const project = value as Partial<AnimationProject>;
    if (project.schemaVersion !== CURRENT_SCHEMA_VERSION) {
      issues.push({ path: 'schemaVersion', message: `Expected schema version ${CURRENT_SCHEMA_VERSION}.`, severity: 'error' });
    }
    if (!project.title?.trim()) issues.push({ path: 'title', message: 'Project title is required.', severity: 'error' });
    if (!Array.isArray(project.chapters) || project.chapters.length === 0) {
      issues.push({ path: 'chapters', message: 'At least one chapter is required.', severity: 'error' });
    }
    if (!Array.isArray(project.scenes) || project.scenes.length === 0) {
      issues.push({ path: 'scenes', message: 'At least one scene is required.', severity: 'error' });
      return issues;
    }
    const chapterIds = new Set(project.chapters?.map((chapter) => chapter.id));
    project.scenes.forEach((scene, sceneIndex) => {
      const base = `scenes[${sceneIndex}]`;
      if (!scene.id) issues.push({ path: `${base}.id`, message: 'Scene id is required.', severity: 'error' });
      if (!chapterIds.has(scene.chapterId)) issues.push({ path: `${base}.chapterId`, message: 'Scene references an unknown chapter.', severity: 'error' });
      if (!Number.isFinite(scene.duration) || scene.duration <= 0) issues.push({ path: `${base}.duration`, message: 'Duration must be greater than zero.', severity: 'error' });
      scene.elements?.forEach((element, elementIndex) => {
        if (!supportedElements.has(element.type)) issues.push({ path: `${base}.elements[${elementIndex}].type`, message: `Unsupported element type: ${element.type}.`, severity: 'error' });
        if (element.x < 0 || element.y < 0 || element.x + element.width > 100 || element.y + element.height > 100) {
          issues.push({ path: `${base}.elements[${elementIndex}]`, message: 'Element extends outside the 16:9 canvas.', severity: 'warning' });
        }
      });
      scene.narration?.forEach((segment, segmentIndex) => {
        if (segment.start < 0 || segment.end > scene.duration || segment.end <= segment.start) {
          issues.push({ path: `${base}.narration[${segmentIndex}]`, message: 'Narration timing is outside the scene.', severity: 'error' });
        }
      });
    });
    return issues;
  },
};

export function assertValidProject(project: unknown): asserts project is AnimationProject {
  const errors = projectValidator.validate(project).filter((issue) => issue.severity === 'error');
  if (errors.length) throw new Error(errors.map((issue) => `${issue.path}: ${issue.message}`).join('\n'));
}
