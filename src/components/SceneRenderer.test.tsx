import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSdlcProject } from '../data/sdlcProject';
import { SceneRenderer } from './SceneRenderer';
import { createDiagramDemoProject } from '../data/diagramDemoProject';

describe('SceneRenderer sourced media', () => {
  it('renders model-authored branches with time-based node and edge reveals', () => {
    const project = createDiagramDemoProject();
    const scene = project.scenes[0];
    const early = renderToStaticMarkup(<SceneRenderer project={project} sceneId={scene.id} localTime={1} />);
    const late = renderToStaticMarkup(<SceneRenderer project={project} sceneId={scene.id} localTime={10} />);
    expect(early).toContain('data-node="big-bang"');
    expect(early).toMatch(/data-node="big-bang"[^>]*opacity:0/);
    expect(late).toMatch(/data-node="big-bang"[^>]*opacity:1/);
    expect(late).toContain('data-edge="all"');
    expect(late).toContain('marker-end="url(#tree-graph-arrow)"');
  });
  it('renders image assets and Shiki-highlighted editable code', () => {
    const project = createSdlcProject();
    const scene = project.scenes[0];
    const base = scene.elements[0];
    project.assets.push({
      id: 'fixture-image', name: 'Fixture', kind: 'image', uri: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E', embedded: true,
      source: { documentId: project.sourceDocuments[0].id, page: 1, extraction: 'native' },
    });
    scene.elements = [{
      ...structuredClone(base), id: 'image', type: 'image', content: 'Source diagram', assetId: 'fixture-image', alt: 'Source diagram', fit: 'contain',
    }, {
      ...structuredClone(base), id: 'code', type: 'code', content: 'const ready: boolean = true', language: 'typescript', highlightLines: [1], codeVerification: 'syntax',
      codeSource: { extraction: 'generated' },
      codePresentation: { theme: 'carbon-dark', windowChrome: 'mac', showLineNumbers: false, backdrop: 'soft-gray-gradient', fontSize: 24, padding: 32, frameInset: 60 },
    }];
    const markup = renderToStaticMarkup(<SceneRenderer project={project} sceneId={scene.id} localTime={5} finalLayout />);
    expect(markup).toContain('class="visual-image"');
    expect(markup).toContain('src="data:image/svg+xml');
    expect(markup).toContain('class="visual-code ');
    expect(markup).toContain('code-backdrop-soft-gray-gradient');
    expect(markup).toContain('code-theme-carbon-dark code-chrome-mac is-without-line-numbers');
    expect(markup).toContain('code-dot-red');
    expect(markup).not.toContain('code-line-number');
    expect(markup).toContain('code-line is-highlighted');
    expect(markup).toContain('color:');
  });
  it('keeps approved editorial themes flat and inside the project palette', () => {
    const project = createSdlcProject();
    const scene = project.scenes[0];
    project.theme = {
      name: 'indigo-porcelain',
      background: '#FCFBF7',
      surface: '#F1F0E9',
      foreground: '#203A72',
      muted: '#697083',
      accent: '#2C55A2',
      accentAlt: '#9A7440',
      fontFamily: '"Times New Roman", Times, serif',
    };
    project.chapters[0].color = '#FF00FF';
    scene.elements[0].style = { ...scene.elements[0].style, accent: '#00FF00' };

    const markup = renderToStaticMarkup(<SceneRenderer project={project} sceneId={scene.id} localTime={5} finalLayout />);
    expect(markup).toContain('theme-light-editorial');
    expect(markup).toContain('--chapter-color:#2C55A2');
    expect(markup).toContain('--element-accent:#2C55A2');
    expect(markup).not.toContain('#FF00FF');
    expect(markup).not.toContain('#00FF00');
  });
  it('uses a balanced three-column metrics layout for three values', () => {
    const project = createSdlcProject();
    const scene = project.scenes[0];
    const base = structuredClone(scene.elements[0]);
    scene.elements = [{
      ...base,
      id: 'three-metrics',
      type: 'metrics',
      content: 'Three metrics',
      items: [
        { id: 'one', label: '1 · First' },
        { id: 'two', label: '2 · Second' },
        { id: 'three', label: '3 · Third' },
      ],
    }];
    const markup = renderToStaticMarkup(<SceneRenderer project={project} sceneId={scene.id} localTime={5} finalLayout />);
    expect(markup).toContain('visual-metrics items-3');
  });
});
