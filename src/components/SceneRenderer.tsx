import type { CSSProperties, MouseEvent } from 'react';
import type { AnimationProject, SceneElement, SceneElementItem } from '../model/types';
import { compileElementMotion, type CompiledMotion } from '../model/motion';

interface Props {
  project: AnimationProject;
  sceneId: string;
  localTime: number;
  selectedElementId?: string;
  selectedItemId?: string;
  editable?: boolean;
  finalLayout?: boolean;
  onSelectElement?: (id: string, itemId?: string) => void;
}

interface ItemProps {
  items?: SceneElementItem[];
  selectedItemId?: string;
  onSelectItem?: (event: MouseEvent, itemId: string) => void;
  motion: CompiledMotion;
}

function Flow({ items = [], selectedItemId, onSelectItem, motion }: ItemProps) {
  return <div className={`visual-flow ${items.length > 6 ? 'is-dense' : ''}`}>{items.map((item, index) => <div style={motion.itemStyle(index, items.length)} className={`flow-unit ${selectedItemId === item.id ? 'is-selected-item' : ''}`} key={item.id} onClick={(event) => onSelectItem?.(event, item.id)}><span>{String(index + 1).padStart(2, '0')}</span><b>{item.label}</b>{index < items.length - 1 && <i style={{ opacity: motion.lineProgress, transform: `scaleX(${motion.lineProgress})` }}>→</i>}</div>)}</div>;
}

function Cards({ items = [], selectedItemId, onSelectItem, motion }: ItemProps) {
  return <div className="visual-cards">{items.map((item, index) => <div style={motion.itemStyle(index, items.length)} className={`visual-card ${selectedItemId === item.id ? 'is-selected-item' : ''}`} key={item.id} onClick={(event) => onSelectItem?.(event, item.id)}><span>{String(index + 1).padStart(2, '0')}</span><p>{item.label}</p></div>)}</div>;
}

function Lifecycle({ items = [], selectedItemId, onSelectItem, accent, motion }: ItemProps & { accent?: string }) {
  return <div className="visual-cycle" style={{ '--element-accent': accent } as CSSProperties}><div className="cycle-core" style={{ transform: `translate(-50%,-50%) scale(${0.9 + motion.enterProgress * 0.1})` }}><small>ITERATE</small><b>SDLC</b></div>{items.map((item, index) => <div key={item.id} onClick={(event) => onSelectItem?.(event, item.id)} className={`cycle-node ${selectedItemId === item.id ? 'is-selected-item' : ''}`} style={{ '--index': index, '--count': items.length, '--orbit-shift': `${motion.orbitDegrees}deg` } as CSSProperties}><span style={motion.itemStyle(index, items.length)}>{item.label}</span></div>)}</div>;
}

function Comparison({ items = [], selectedItemId, onSelectItem, motion }: ItemProps) {
  return <div className="visual-comparison">{items.map((item, index) => { const [label, detail] = item.label.split(' — '); return <div style={motion.itemStyle(index, items.length)} className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><small>0{index + 1}</small><b>{label}</b><p>{detail}</p></div>; })}</div>;
}

function Timeline({ items = [], selectedItemId, onSelectItem, motion }: ItemProps) {
  return <div className="visual-timeline">{items.map((item, index) => <div style={motion.itemStyle(index, items.length)} className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><span /><b>{item.label}</b>{index < items.length - 1 && <i style={{ transform: `scaleX(${motion.lineProgress})`, transformOrigin: 'left' }} />}</div>)}</div>;
}

function Metrics({ items = [], selectedItemId, onSelectItem, motion }: ItemProps) {
  return <div className="visual-metrics">{items.map((item, index) => { const [value, label] = item.label.split(' · '); return <div style={motion.itemStyle(index, items.length)} className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><strong style={{ transform: `scale(${0.8 + motion.countProgress * 0.2})` }}>{value}</strong><span>{label}</span></div>; })}</div>;
}

function Topology({ items = [], selectedItemId, onSelectItem, motion }: ItemProps) {
  return <div className="visual-topology">{items.map((item, index) => <div style={motion.itemStyle(index, items.length)} className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}><span>{['UI', 'API', 'AI', 'DB'][index] || index + 1}</span><b>{item.label}</b>{index < items.length - 1 && <i style={{ opacity: motion.lineProgress }}>⇄</i>}</div>)}</div>;
}

function Formula({ content, items = [], selectedItemId, onSelectItem, motion }: { content: string } & ItemProps) {
  return <div className="visual-formula"><small>{content}</small><div>{items.map((item, index) => index === 1
    ? <span style={motion.itemStyle(index, items.length)} className={selectedItemId === item.id ? 'is-selected-item' : ''} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}>{item.label}</span>
    : <b style={motion.itemStyle(index, items.length)} className={`${index === 2 ? 'fraction' : ''} ${selectedItemId === item.id ? 'is-selected-item' : ''}`} onClick={(event) => onSelectItem?.(event, item.id)} key={item.id}>{item.label}</b>)}</div></div>;
}

function ElementBody({ element, selectedItemId, onSelectItem, motion }: { element: SceneElement; selectedItemId?: string; onSelectItem?: ItemProps['onSelectItem']; motion: CompiledMotion }) {
  const props = { items: element.items, selectedItemId, onSelectItem, motion };
  switch (element.type) {
    case 'flow': return <><small className="element-kicker">{element.content}</small><Flow {...props} /></>;
    case 'cards': return <><small className="element-kicker">{element.content}</small><Cards {...props} /></>;
    case 'lifecycle': return <Lifecycle {...props} accent={element.style?.accent} />;
    case 'comparison': return <><small className="element-kicker">{element.content}</small><Comparison {...props} /></>;
    case 'timeline': return <><small className="element-kicker">{element.content}</small><Timeline {...props} /></>;
    case 'metrics': return <><small className="element-kicker">{element.content}</small><Metrics {...props} /></>;
    case 'topology': return <><small className="element-kicker">{element.content}</small><Topology {...props} /></>;
    case 'formula': return <Formula content={element.content} {...props} />;
    case 'title': return <h1>{element.content.split('\n').map((line, index, lines) => <span style={motion.itemStyle(index, lines.length)} key={line}>{line}</span>)}</h1>;
    case 'badge': return <div className="visual-badge"><i />{element.content}</div>;
    default: return <p className="visual-text">{element.content.split(' ').map((word, index, words) => <span style={{ display: 'inline-block', marginRight: '.3em', ...motion.itemStyle(index, words.length) }} key={`${word}-${index}`}>{word}</span>)}</p>;
  }
}

export function SceneRenderer({ project, sceneId, localTime, selectedElementId, selectedItemId, editable, finalLayout, onSelectElement }: Props) {
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
    {scene.elements.map((item) => {
      const motion = compileElementMotion(item, scene, localTime, project.renderConfig.fps, finalLayout);
      return <div
      key={item.id}
      className={`scene-element type-${item.type} ${selectedElementId === item.id ? 'is-selected' : ''}`}
      style={{
        left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%`,
        '--element-accent': item.style?.accent || chapter.color,
        textAlign: item.style?.align,
        ...motion.style,
      } as CSSProperties}
      onClick={(event) => select(event, item.id)}
    ><ElementBody element={item} motion={motion} selectedItemId={selectedElementId === item.id ? selectedItemId : undefined} onSelectItem={(event, itemId) => selectItem(event, item.id, itemId)} /></div>})}
    <footer className="scene-footer"><span>{scene.title}</span><span>Source pages · {sourcePages.join(', ')}</span></footer>
  </div>;
}
