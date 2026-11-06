import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createSdlcProject } from '../data/sdlcProject';
import { getActiveWordIndex, ScriptPanel, tokenizeTranscript } from './ScriptPanel';

describe('ScriptPanel read-along transcript', () => {
  it('maps speech boundaries and timeline progress to individual words', () => {
    expect(tokenizeTranscript('alpha beta gamma', 'en-US').filter((token) => token.isWord).map((token) => token.text)).toEqual(['alpha', 'beta', 'gamma']);
    expect(getActiveWordIndex('alpha beta gamma', 'en-US', 0.1, 6)).toBe(1);
    expect(getActiveWordIndex('alpha beta gamma', 'en-US', 0.95)).toBe(2);
  });

  it('renders the complete scene transcript outside the canvas and highlights one word', () => {
    const project = createSdlcProject();
    const scene = project.scenes[0];
    const markup = renderToStaticMarkup(<ScriptPanel scene={scene} localTime={1} locale={project.locale} visible spokenCharIndex={0} />);
    expect(markup).toContain('PAGE TRANSCRIPT');
    expect((markup.match(/script-segment/g) ?? [])).toHaveLength(scene.narration.length);
    expect(markup).toContain('feedback');
    expect(markup).toContain('script-word is-speaking');
    expect((markup.match(/is-speaking/g) ?? [])).toHaveLength(1);
    expect(renderToStaticMarkup(<ScriptPanel scene={scene} localTime={1} locale={project.locale} visible={false} />)).toBe('');
  });
});
