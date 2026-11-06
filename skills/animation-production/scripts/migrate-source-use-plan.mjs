#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [planArg, projectArg, outputArg] = process.argv.slice(2);
if (!planArg || !projectArg || !outputArg) {
  console.error('Usage: node migrate-source-use-plan.mjs <v1-plan.json> <project.json> <v2-plan.json>');
  process.exit(2);
}

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const [plan, project] = await Promise.all([readJson(planArg), readJson(projectArg)]);
if (plan.sourceUsePlanVersion === 2) {
  await writeFile(resolve(outputArg), `${JSON.stringify(plan, null, 2)}\n`);
  console.log('Plan is already version 2; copied without changes.');
  process.exit(0);
}
if (plan.sourceUsePlanVersion !== 1) throw new Error('Only SourceUsePlan version 1 can be migrated.');

const elements = new Map();
for (const scene of project.scenes ?? []) for (const element of scene.elements ?? []) elements.set(element.id, element);

const migrated = {
  ...plan,
  sourceUsePlanVersion: 2,
  status: 'final',
  items: (plan.items ?? []).map((item) => {
    const elementIds = item.projectElementIds ?? [];
    const wantsImagePrimary = ['original', 'crop', 'show-then-reconstruct'].includes(item.chosenMode);
    const primaryElementId = elementIds.find((id) => wantsImagePrimary ? elements.get(id)?.type === 'image' : elements.get(id)?.type !== 'image') ?? elementIds[0];
    const { targetSceneIds = [], projectAssetIds = [], projectElementIds: _projectElementIds, finalDisposition, ...planned } = item;
    return {
      ...planned,
      plannedSceneIds: [...targetSceneIds],
      implementation: {
        targetSceneIds,
        projectAssetIds,
        ...(primaryElementId ? { primaryElementId } : {}),
        companionElementIds: elementIds.filter((id) => id !== primaryElementId),
        finalDisposition,
      },
    };
  }),
};

await writeFile(resolve(outputArg), `${JSON.stringify(migrated, null, 2)}\n`);
console.log(`Migrated ${migrated.items.length} plan item(s) to SourceUsePlan version 2.`);
