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
    if (!project.renderConfig || !Number.isInteger(project.renderConfig.fps) || project.renderConfig.fps <= 0) {
      issues.push({ path: 'renderConfig.fps', message: 'Render FPS must be a positive integer.', severity: 'error' });
    }
    if (!project.renderConfig || project.renderConfig.width <= 0 || project.renderConfig.height <= 0) {
      issues.push({ path: 'renderConfig', message: 'Render dimensions must be greater than zero.', severity: 'error' });
    }
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
        const elementBase = `${base}.elements[${elementIndex}]`;
        if (!supportedElements.has(element.type)) issues.push({ path: `${base}.elements[${elementIndex}].type`, message: `Unsupported element type: ${element.type}.`, severity: 'error' });
        if (!element.id?.trim()) issues.push({ path: `${elementBase}.id`, message: 'Every visible element needs a stable id.', severity: 'error' });
        if (!element.content?.trim() && !element.items?.length) issues.push({ path: elementBase, message: 'Element has no editable content.', severity: 'error' });
        const itemIds = new Set<string>();
        element.items?.forEach((item, itemIndex) => {
          if (!item.id?.trim()) issues.push({ path: `${elementBase}.items[${itemIndex}].id`, message: 'Every visible item needs a stable id.', severity: 'error' });
          if (!item.label?.trim()) issues.push({ path: `${elementBase}.items[${itemIndex}].label`, message: 'Visible item text cannot be empty.', severity: 'error' });
          if (itemIds.has(item.id)) issues.push({ path: `${elementBase}.items[${itemIndex}].id`, message: 'Item ids must be unique inside an element.', severity: 'error' });
          itemIds.add(item.id);
        });
        if (element.type === 'flow' && (element.items?.length ?? 0) > 9) {
          issues.push({ path: `${elementBase}.items`, message: 'Flow supports at most 9 readable steps; split this content into multiple scenes.', severity: 'warning' });
        }
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
