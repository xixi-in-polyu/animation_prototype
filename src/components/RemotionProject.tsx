import { AbsoluteFill, Series, useCurrentFrame, useVideoConfig } from 'remotion';
import type { AnimationProject } from '../model/types';
import { secondsToFrames } from '../model/timeline';
import { SceneRenderer } from './SceneRenderer';

export interface RemotionProjectProps extends Record<string, unknown> {
  project: AnimationProject;
  editable: boolean;
  selectedElementId?: string;
  selectedItemId?: string;
  onSelectElement?: (elementId: string, itemId?: string) => void;
}

function SceneClip({ project, sceneId, editable, selectedElementId, selectedItemId, onSelectElement }: RemotionProjectProps & { sceneId: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <SceneRenderer
    project={project}
    sceneId={sceneId}
    localTime={frame / fps}
    editable={editable}
    selectedElementId={selectedElementId}
    selectedItemId={selectedItemId}
    onSelectElement={onSelectElement}
  />;
}

export function RemotionProject(props: RemotionProjectProps) {
  const fps = props.project.renderConfig.fps;
  return <AbsoluteFill>
    <Series>
      {props.project.scenes.map((scene) => <Series.Sequence key={scene.id} durationInFrames={secondsToFrames(scene.duration, fps)} name={scene.title}>
        <SceneClip {...props} sceneId={scene.id} />
      </Series.Sequence>)}
    </Series>
  </AbsoluteFill>;
}
