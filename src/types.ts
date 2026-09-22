export interface MarkdownFile {
  id: string;
  name: string;
  path: string;
  folder: string;
  content: string;
  size: number;
  handle?: FileSystemFileHandle;
}

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
  files: MarkdownFile[];
}

export type Theme = 'light' | 'dark';
export type FontSize = 'sm' | 'md' | 'lg';
export type ReadingWidth = 'narrow' | 'medium' | 'wide' | 'full';

// Editor types
export type EditorMode = 'view' | 'edit';

export interface EditorState {
  mode: EditorMode;
  editingFileId: string | null;
  unsavedChanges: Set<string>;
  originalContent: Map<string, string>;
}
