import type { Scene } from '../model/types';

export function ScriptPanel({ scene, localTime, visible }: { scene: Scene; localTime: number; visible: boolean }) {
  if (!visible) return null;
  const active = scene.narration.find((item) => localTime >= item.start && localTime < item.end);
  return <div className="script-panel panel">
    <div className="script-meta"><small>LIVE SCRIPT</small><b>{scene.title}</b></div>
    <div className="script-lines">{scene.narration.map((item, index) => <p className={active?.id === item.id ? 'active' : ''} key={item.id}><span>{String(index + 1).padStart(2, '0')}</span>{item.text}</p>)}</div>
  </div>;
}
