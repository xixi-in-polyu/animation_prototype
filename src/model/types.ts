export const CURRENT_SCHEMA_VERSION = 1;

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
  items?: string[];
  x: number;
  y: number;
  width: number;
  height: number;
  style?: {
    accent?: string;
    tone?: 'light' | 'dark' | 'glass' | 'outline';
    align?: 'left' | 'center' | 'right';
  };
  animation: {
    enter: 'fade' | 'rise' | 'scale' | 'draw';
    start: number;
    duration: number;
  };
  sourcePages?: number[];
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
