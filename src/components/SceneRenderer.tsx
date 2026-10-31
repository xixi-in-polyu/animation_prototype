import type { CSSProperties, MouseEvent } from 'react';
import type { AnimationProject, SceneElement, SceneElementItem } from '../model/types';

interface Props {
  project: AnimationProject;
  sceneId: string;
  localTime: number;
  selectedElementId?: string;
  selectedItemId?: string;
  editable?: boolean;
  onSelectElement?: (id: string, itemId?: string) => void;
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

interface ItemProps {
  items?: SceneElementItem[];
  selectedItemId?: string;
  onSelectItem?: (event: MouseEvent, itemId: string) => void;
}

function Flow({ items = [], selectedItemId, onSelectItem }: ItemProps) {
  return <div className={`visual-flow ${items.length > 6 ? 'is-dense' : ''}`}>{items.map((item, index) => <div className={`flow-unit ${selectedItemId === item.id ? 'is-selected-item' : ''}`} key={item.id} onClick={(event) => onSelectItem?.(event, item.id)}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.label}</b>{index < items.length - 1 && <i>→</i>}</div>)}</div>;
}

function Cards({ items = [], selectedItemId, onSelectItem }: ItemProps) {
  return <div className="visual-cards">{items.map((item, index) => <div className={`visual-card ${selectedItemId === item.id ? 'is-selected-item' : ''}`} key={item.id} onClick={(event) => onSelectItem?.(event, item.id)}><span>{String(index + 1).padStart(2, '0')}</span><p>{item.label}</p></div>)}</div>;
}

function Lifecycle({ items = [], selectedItemId, onSelectItem, accent }: ItemProps & { accent?: string }) {
  return <div className="visual-cycle" style={{ '--element-accent': accent } as CSSProperties}><div className="cycle-core"><small>ITERATE</small><b>SDLC</b></div>{items.map((item, index) => <div key={item.id} onClick={(event) => onSelectItem?.(event, item.id)} className={`cycle-node ${selectedItemId === item.id ? 'is-selected-item' : ''}`} style={{ '--index': index, '--count': items.length } as CSSProperties}><span>{item.label}</span></div>)}</div>;
}

function Comparison({ items = [], selectedItemId, onSelectItem }: ItemProps) {
  return <div className="visual-comparison">{items.map((item, index) => { const [label, detail] = item.label.split(' — '); return <div className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><small>0{index + 1}</small><b>{label}</b><p>{detail}</p></div>; })}</div>;
}

function Timeline({ items = [], selectedItemId, onSelectItem }: ItemProps) {
  return <div className="visual-timeline">{items.map((item, index) => <div className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><span /><b>{item.label}</b>{index < items.length - 1 && <i />}</div>)}</div>;
}

function Metrics({ items = [], selectedItemId, onSelectItem }: ItemProps) {
  return <div className="visual-metrics">{items.map((item) => { const [value, label] = item.label.split(' · '); return <div className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><strong>{value}</strong><span>{label}</span></div>; })}</div>;
}

function Topology({ items = [], selectedItemId, onSelectItem }: ItemProps) {
  return <div className="visual-topology">{items.map((item, index) => <div className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><span>{['UI', 'API', 'AI', 'DB'][index] || index + 1}</span><b>{item.label}</b>{index < items.length - 1 && <i>⇄</i>}</div>)}</div>;
}

function Formula({ content, items = [], selectedItemId, onSelectItem }: { content: string } & ItemProps) {
  return <div className="visual-formula"><small>{content}</small><div>{items.map((item, index) => index === 1
    ? <span className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}>{item.label}</span>
    : <b className={`${index === 2 ? 'fraction' : ''} ${selectedItemId === item.id ? 'is-selected-item' : ''}`} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}>{item.label}</b>)}</div></div>;
}

function ElementBody({ element, selectedItemId, onSelectItem }: { element: SceneElement; selectedItemId?: string; onSelectItem?: ItemProps['onSelectItem'] }) {
  const props = { items: element.items, selectedItemId, onSelectItem };
  switch (element.type) {
    case 'flow': return <><small className="element-kicker">{element.content}</small><Flow {...props} /></>;
    case 'cards': return <><small className="element-kicker">{element.content}</small><Cards {...props} /></>;
    case 'lifecycle': return <Lifecycle {...props} accent={element.style?.accent} />;
    case 'comparison': return <><small className="element-kicker">{element.content}</small><Comparison {...props} /></>;
    case 'timeline': return <><small className="element-kicker">{element.content}</small><Timeline {...props} /></>;
    case 'metrics': return <><small className="element-kicker">{element.content}</small><Metrics {...props} /></>;
    case 'topology': return <><small className="element-kicker">{element.content}</small><Topology {...props} /></>;
    case 'formula': return <Formula content={element.content} {...props} />;
    case 'title': return <h1>{element.content.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>;
    case 'badge': return <div className="visual-badge"><i />{element.content}</div>;
    default: return <p className="visual-text">{element.content}</p>;
  }
}

export function SceneRenderer({ project, sceneId, localTime, selectedElementId, selectedItemId, editable, onSelectElement }: Props) {
  const scene = project.scenes.find((item) => item.id === sceneId) ?? project.scenes[0];
  const chapter = project.chapters.find((item) => item.id === scene.chapterId) ?? project.chapters[0];
  const sourcePages = [...new Set(scene.elements.flatMap((item) => item.sourcePages ?? []))].sort((a, b) => a - b);

  const select = (event: MouseEvent, id: string) => {
    if (!editable) return;
    event.stopPropagation();
    onSelectElement?.(id);
  };

  const selectItem = (event: MouseEvent, elementId: string, itemId: string) => {
    if (!editable) return;
    event.stopPropagation();
    onSelectElement?.(elementId, itemId);
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
    ><ElementBody element={item} selectedItemId={selectedElementId === item.id ? selectedItemId : undefined} onSelectItem={(event, itemId) => selectItem(event, item.id, itemId)} /></div>)}
    <footer className="scene-footer"><span>{scene.title}</span><span>Source pages · {sourcePages.join(', ')}</span></footer>
  </div>;
}
