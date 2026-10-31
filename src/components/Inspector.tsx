import type { AnimationProject, ElementType, Scene, SceneElement, SceneTemplate } from '../model/types';

interface Props {
  project: AnimationProject;
  scene: Scene;
  element?: SceneElement;
  onUpdateScene: (patch: Partial<Scene>) => void;
  onUpdateElement: (patch: Partial<SceneElement>) => void;
  onUpdateTheme: (key: keyof AnimationProject['theme'], value: string) => void;
}

const templates: SceneTemplate[] = ['opening', 'concept', 'process', 'comparison', 'incident', 'architecture', 'closing'];
const elementTypes: ElementType[] = ['title', 'text', 'cards', 'lifecycle', 'flow', 'comparison', 'timeline', 'metrics', 'topology', 'formula', 'badge'];

export function Inspector({ project, scene, element, onUpdateScene, onUpdateElement, onUpdateTheme }: Props) {
  return <aside className="inspector panel">
    <div className="panel-heading"><div><small>INSPECTOR</small><h2>{element ? 'Element' : 'Scene'}</h2></div><span>{element?.type ?? scene.template}</span></div>
    <div className="inspector-scroll">
      {!element ? <>
        <Field label="Scene title"><input value={scene.title} onChange={(event) => onUpdateScene({ title: event.target.value })} /></Field>
        <div className="field-row">
          <Field label="Duration"><input type="number" min="5" max="300" value={scene.duration} onChange={(event) => onUpdateScene({ duration: Number(event.target.value) })} /></Field>
          <Field label="Template"><select value={scene.template} onChange={(event) => onUpdateScene({ template: event.target.value as SceneTemplate })}>{templates.map((item) => <option key={item}>{item}</option>)}</select></Field>
        </div>
        <Field label="Chapter"><select value={scene.chapterId} onChange={(event) => onUpdateScene({ chapterId: event.target.value })}>{project.chapters.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></Field>
        <hr />
        <div className="subheading"><small>NARRATION SCRIPT</small><span>{scene.narration.length} segments</span></div>
        {scene.narration.map((segment, index) => <div className="narration-editor" key={segment.id}>
          <span>{String(index + 1).padStart(2, '0')} · {Math.round(segment.start)}–{Math.round(segment.end)}s</span>
          <textarea value={segment.text} rows={4} onChange={(event) => onUpdateScene({ narration: scene.narration.map((item) => item.id === segment.id ? { ...item, text: event.target.value } : item) })} />
        </div>)}
        <hr />
        <div className="subheading"><small>THEME</small><span>{project.theme.name}</span></div>
        <div className="color-grid">
          <ColorField label="Background" value={project.theme.background} onChange={(value) => onUpdateTheme('background', value)} />
          <ColorField label="Accent" value={project.theme.accent} onChange={(value) => onUpdateTheme('accent', value)} />
          <ColorField label="Text" value={project.theme.foreground} onChange={(value) => onUpdateTheme('foreground', value)} />
          <ColorField label="Muted" value={project.theme.muted} onChange={(value) => onUpdateTheme('muted', value)} />
        </div>
      </> : <>
        <div className="field-row">
          <Field label="Type"><select value={element.type} onChange={(event) => onUpdateElement({ type: event.target.value as ElementType })}>{elementTypes.map((item) => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Entry"><select value={element.animation.enter} onChange={(event) => onUpdateElement({ animation: { ...element.animation, enter: event.target.value as SceneElement['animation']['enter'] } })}><option>rise</option><option>fade</option><option>scale</option><option>draw</option></select></Field>
        </div>
        <Field label="Content"><textarea rows={5} value={element.content} onChange={(event) => onUpdateElement({ content: event.target.value })} /></Field>
        <Field label="Items — one per line"><textarea rows={6} value={(element.items ?? []).join('\n')} onChange={(event) => onUpdateElement({ items: event.target.value.split('\n').filter(Boolean) })} /></Field>
        <div className="geometry-grid">
          {(['x', 'y', 'width', 'height'] as const).map((key) => <Field key={key} label={`${key.toUpperCase()} %`}><input type="number" min="0" max="100" value={element[key]} onChange={(event) => onUpdateElement({ [key]: Number(event.target.value) })} /></Field>)}
        </div>
        <div className="field-row">
          <Field label="Start"><input type="number" min="0" step=".5" value={element.animation.start} onChange={(event) => onUpdateElement({ animation: { ...element.animation, start: Number(event.target.value) } })} /></Field>
          <Field label="Speed"><input type="number" min=".1" max="5" step=".1" value={element.animation.duration} onChange={(event) => onUpdateElement({ animation: { ...element.animation, duration: Number(event.target.value) } })} /></Field>
        </div>
        <ColorField label="Accent" value={element.style?.accent ?? project.theme.accent} onChange={(value) => onUpdateElement({ style: { ...element.style, accent: value } })} />
        <Field label="Source pages"><input value={(element.sourcePages ?? []).join(', ')} onChange={(event) => onUpdateElement({ sourcePages: event.target.value.split(',').map(Number).filter(Number.isFinite) })} /></Field>
      </>}
    </div>
  </aside>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="color-field"><span>{label}</span><div><input type="color" value={value} onChange={(event) => onChange(event.target.value)} /><input value={value} onChange={(event) => onChange(event.target.value)} /></div></label>;
}
