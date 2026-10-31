import type { CSSProperties, MouseEvent } from 'react';
import type { AnimationProject, SceneElement } from '../model/types';

interface Props {
  project: AnimationProject;
  sceneId: string;
  localTime: number;
  selectedElementId?: string;
  editable?: boolean;
  onSelectElement?: (id: string) => void;
}

function progressFor(element: SceneElement, localTime: number) {
  return Math.max(0, Math.min(1, (localTime - element.animation.start) / Math.max(.1, element.animation.duration)));
}

function elementMotion(element: SceneElement, localTime: number): CSSProperties {
  const p = progressFor(element, localTime);
  const eased = 1 - Math.pow(1 - p, 3);
  const transform = element.animation.enter === 'rise'
    ? `translateY(${(1 - eased) * 24}px)`
    : element.animation.enter === 'scale'
      ? `scale(${.88 + eased * .12})`
      : 'none';
  return { opacity: p, transform, clipPath: element.animation.enter === 'draw' ? `inset(0 ${100 - eased * 100}% 0 0)` : undefined };
}

function Flow({ items = [] }: { items?: string[] }) {
  return <div className="visual-flow">{items.map((item, index) => <div className="flow-unit" key={item}><span>{String(index + 1).padStart(2, '0')}</span><b>{item}</b>{index < items.length - 1 && <i>→</i>}</div>)}</div>;
}

function Cards({ items = [] }: { items?: string[] }) {
  return <div className="visual-cards">{items.map((item, index) => <div className="visual-card" key={item}><span>{String(index + 1).padStart(2, '0')}</span><p>{item}</p></div>)}</div>;
}

function Lifecycle({ items = [], accent }: { items?: string[]; accent?: string }) {
  return <div className="visual-cycle" style={{ '--element-accent': accent } as CSSProperties}><div className="cycle-core"><small>ITERATE</small><b>SDLC</b></div>{items.map((item, index) => <div key={item} className="cycle-node" style={{ '--index': index, '--count': items.length } as CSSProperties}><span>{item}</span></div>)}</div>;
}

function Comparison({ items = [] }: { items?: string[] }) {
  return <div className="visual-comparison">{items.map((item, index) => { const [label, detail] = item.split(' — '); return <div key={item}><small>0{index + 1}</small><b>{label}</b><p>{detail}</p></div>; })}</div>;
}

function Timeline({ items = [] }: { items?: string[] }) {
  return <div className="visual-timeline">{items.map((item, index) => <div key={item}><span /><b>{item}</b>{index < items.length - 1 && <i />}</div>)}</div>;
}

function Metrics({ items = [] }: { items?: string[] }) {
  return <div className="visual-metrics">{items.map((item) => { const [value, label] = item.split(' · '); return <div key={item}><strong>{value}</strong><span>{label}</span></div>; })}</div>;
}

function Topology({ items = [] }: { items?: string[] }) {
  return <div className="visual-topology">{items.map((item, index) => <div key={item}><span>{['UI', 'API', 'AI', 'DB'][index] || index + 1}</span><b>{item}</b>{index < items.length - 1 && <i>⇄</i>}</div>)}</div>;
}

function Formula({ content, items = [] }: { content: string; items?: string[] }) {
  return <div className="visual-formula"><small>{content}</small><div><b>{items[0]}</b><span>{items[1]}</span><b className="fraction">{items[2]}</b></div></div>;
}

function ElementBody({ element }: { element: SceneElement }) {
  switch (element.type) {
    case 'flow': return <><small className="element-kicker">{element.content}</small><Flow items={element.items} /></>;
    case 'cards': return <><small className="element-kicker">{element.content}</small><Cards items={element.items} /></>;
    case 'lifecycle': return <Lifecycle items={element.items} accent={element.style?.accent} />;
    case 'comparison': return <><small className="element-kicker">{element.content}</small><Comparison items={element.items} /></>;
    case 'timeline': return <><small className="element-kicker">{element.content}</small><Timeline items={element.items} /></>;
    case 'metrics': return <><small className="element-kicker">{element.content}</small><Metrics items={element.items} /></>;
    case 'topology': return <><small className="element-kicker">{element.content}</small><Topology items={element.items} /></>;
    case 'formula': return <Formula content={element.content} items={element.items} />;
    case 'title': return <h1>{element.content.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>;
    case 'badge': return <div className="visual-badge"><i />{element.content}</div>;
    default: return <p className="visual-text">{element.content}</p>;
  }
}

export function SceneRenderer({ project, sceneId, localTime, selectedElementId, editable, onSelectElement }: Props) {
  const scene = project.scenes.find((item) => item.id === sceneId) ?? project.scenes[0];
  const chapter = project.chapters.find((item) => item.id === scene.chapterId) ?? project.chapters[0];
  const sourcePages = [...new Set(scene.elements.flatMap((item) => item.sourcePages ?? []))].sort((a, b) => a - b);

  const select = (event: MouseEvent, id: string) => {
    if (!editable) return;
    event.stopPropagation();
    onSelectElement?.(id);
  };

  return <div className={`scene-canvas template-${scene.template}`} style={{
    '--scene-bg': project.theme.background,
    '--scene-fg': project.theme.foreground,
    '--scene-muted': project.theme.muted,
    '--chapter-color': chapter.color,
    fontFamily: project.theme.fontFamily,
  } as CSSProperties} onClick={() => editable && onSelectElement?.('')}>
    <div className="scene-grid" />
    <div className="scene-orb orb-one" /><div className="scene-orb orb-two" />
    <header className="scene-header"><span>STORYLINE / {chapter.shortTitle.toUpperCase()}</span><span>{String(project.scenes.indexOf(scene) + 1).padStart(2, '0')} / {String(project.scenes.length).padStart(2, '0')}</span></header>
    {scene.elements.map((item) => <div
      key={item.id}
      className={`scene-element type-${item.type} ${selectedElementId === item.id ? 'is-selected' : ''}`}
      style={{
        left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`,
        '--element-accent': item.style?.accent || chapter.color,
        textAlign: item.style?.align,
        ...elementMotion(item, editable ? scene.duration : localTime),
      } as CSSProperties}
      onClick={(event) => select(event, item.id)}
    ><ElementBody element={item} /></div>)}
    <footer className="scene-footer"><span>{scene.title}</span><span>Source pages · {sourcePages.join(', ')}</span></footer>
  </div>;
}
