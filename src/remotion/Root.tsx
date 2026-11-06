import { Audio, Composition, Sequence, staticFile } from 'remotion';
import { RemotionProject } from '../components/RemotionProject';
import { createDiagramDemoProject } from '../data/diagramDemoProject';
import { createCodePresentationDemoProject } from '../data/codePresentationDemoProject';
import { createSdlcIncidentProject } from '../data/sdlcIncidentProject';
import { getProjectDuration, secondsToFrames } from '../model/timeline';

const project = createSdlcIncidentProject();

function SdlcVideo() {
  let startFrame = 0;

  return <>
    <RemotionProject project={project} editable={false} previewState="timeline" />
    {project.scenes.map((scene) => {
      const from = startFrame;
      const durationInFrames = secondsToFrames(scene.duration, project.renderConfig.fps);
      startFrame += durationInFrames;
      return <Sequence key={`${scene.id}-audio`} from={from} durationInFrames={durationInFrames}>
        <Audio src={staticFile(`audio/sdlc-v2/${scene.id}.wav`)} volume={0.92} />
      </Sequence>;
    })}
  </>;
}

export function RemotionRoot() {
  return <><Composition
    id="SdlcVideo"
    component={SdlcVideo}
    durationInFrames={secondsToFrames(getProjectDuration(project), project.renderConfig.fps)}
    fps={project.renderConfig.fps}
    width={project.renderConfig.width}
    height={project.renderConfig.height}
  /><Composition
    id="DiagramDemo"
    component={() => <RemotionProject project={createDiagramDemoProject()} editable={false} previewState="timeline" />}
    durationInFrames={660}
    fps={30}
    width={1920}
    height={1080}
  /><Composition
    id="CodePresentationDemo"
    component={() => <RemotionProject project={createCodePresentationDemoProject()} editable={false} previewState="timeline" />}
    durationInFrames={240}
    fps={30}
    width={1920}
    height={1080}
  /></>;
}
