// Disk tree node returned by the Rust backend (scan_directory).
export type DiskNodeKind = 'dir' | 'file';

export interface DiskNode {
  name: string;
  /** Absolute path on disk — the stable identity used for open / watch. */
  absPath: string;
  /** Path relative to the opened folder root (uses '/'). */
  relPath: string;
  kind: DiskNodeKind;
  /** File size in bytes (0 for dirs). */
  size: number;
  /** Direct children (dirs first, then files), sorted alphabetically. */
  children: DiskNode[];
}

export interface FlatFile {
  name: string;
  absPath: string;
  relPath: string;
  size: number;
}

export type ViewMode = 'split' | 'preview' | 'source';

// Payload emitted by the Rust filesystem watcher.
export interface FsChangedEvent {
  /** "create" | "remove" | "modify" | "rename" */
  kind: string;
  /** Absolute path that changed. */
  path: string;
}
