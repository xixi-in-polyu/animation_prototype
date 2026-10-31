export const CURRENT_SCHEMA_VERSION = 4;

export type CaptionMode = 'bottom' | 'side' | 'keywords' | 'hidden';
export type VisualVariant = 'auto' | 'grid' | 'rail' | 'split' | 'orbital' | 'editorial' | 'diagram' | 'poster' | 'minimal';
export type SurfaceStyle = 'none' | 'soft' | 'outline';

export interface ElementVisual {
  variant: VisualVariant;
  surface: SurfaceStyle;
}

export type MotionPreset =
  | 'fade-rise'
  | 'spring-scale'
  | 'wipe-reveal'
  | 'draw'
  | 'pulse'
  | 'lift'
  | 'focus'
  | 'glow'
  | 'trace'
  | 'count-up'
  | 'fade'
  | 'slide'
  | 'shrink';

export type AmbientMotion = 'none' | 'drift' | 'breathe' | 'orbit';

export type MotionTrigger =
  | { type: 'time'; at: number }
  | { type: 'narration'; segmentId: string; offset?: number };

export interface MotionCue {
  id: string;
  preset: MotionPreset;
  trigger: MotionTrigger;
  duration: number;
  stagger?: number;
  intensity?: number;
}

export interface ElementMotion {
  enter: MotionCue;
  beats: MotionCue[];
  exit?: MotionCue;
  ambient?: AmbientMotion;
}

export interface SceneTransition {
  preset: 'fade' | 'slide-left' | 'slide-up' | 'wipe';
  duration: number;
}

export interface RenderConfig {
  fps: number;
  width: number;
  height: number;
}

export type ElementType =
  | 'title'
  | 'text'
  | 'cards'
  | 'lifecycle'
  | 'flow'
  | 'comparison'
  | 'timeline'
  | 'metrics'
  | 'topology'
  | 'formula'
  | 'badge';

export type SceneTemplate =
  | 'opening'
  | 'concept'
  | 'process'
  | 'comparison'
  | 'incident'
  | 'architecture'
  | 'closing';

export interface SourceDocument {
  id: string;
  name: string;
  mimeType: 'application/pdf';
  pageCount: number;
  importedAt: string;
  contentBlocks?: Array<{
    id: string;
    page: number;
    kind: 'heading' | 'paragraph' | 'image' | 'table' | 'formula';
    text?: string;
  }>;
}

export interface KnowledgeNode {
  id: string;
  kind: 'concept' | 'relationship' | 'example' | 'formula';
  title: string;
  summary: string;
  sourceDocumentId: string;
  sourcePages: number[];
  relatedNodeIds?: string[];
}

export interface NarrationSegment {
  id: string;
  text: string;
  start: number;
  end: number;
  voice?: string;
  rate?: number;
}

export interface SceneElement {
  id: string;
  type: ElementType;
  content: string;
  items?: SceneElementItem[];
  x: number;
  y: number;
  width: number;
  height: number;
  style?: {
    accent?: string;
    tone?: 'light' | 'dark' | 'glass' | 'outline';
    align?: 'left' | 'center' | 'right';
  };
  motion: ElementMotion;
  visual: ElementVisual;
  sourcePages?: number[];
}

export interface SceneElementItem {
  id: string;
  label: string;
}

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  template: SceneTemplate;
  duration: number;
  elements: SceneElement[];
  narration: NarrationSegment[];
  knowledgeNodeIds: string[];
  transitionOut?: SceneTransition;
  captionMode: CaptionMode;
}

export interface Chapter {
  id: string;
  title: string;
  shortTitle: string;
  color: string;
}

export interface ProjectTheme {
  name: string;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  accent: string;
  accentAlt: string;
  fontFamily: string;
}

export interface AssetManifestItem {
  id: string;
  name: string;
  kind: 'image' | 'audio' | 'font';
  uri: string;
  embedded: boolean;
}

export interface AnimationProject {
  schemaVersion: number;
  id: string;
  title: string;
  description: string;
  locale: string;
  renderConfig: RenderConfig;
  createdAt: string;
  updatedAt: string;
  sourceDocuments: SourceDocument[];
  knowledgeNodes: KnowledgeNode[];
  chapters: Chapter[];
  scenes: Scene[];
  assets: AssetManifestItem[];
  theme: ProjectTheme;
}

export interface GenerationInput {
  document: SourceDocument;
  knowledgeNodes: KnowledgeNode[];
  targetDuration: number;
  locale: string;
}

export interface GenerationAdapter {
  id: string;
  label: string;
  generate(input: GenerationInput): Promise<AnimationProject>;
}

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ProjectValidator {
  validate(project: unknown): ValidationIssue[];
}
