import { mkdir, writeFile } from 'node:fs/promises';
import { createDiagramDemoProject } from '../src/data/diagramDemoProject';

await mkdir('output/diagram-demo', { recursive: true });
await writeFile('output/diagram-demo/editable-diagrams.animation.json', `${JSON.stringify(createDiagramDemoProject(), null, 2)}\n`);
