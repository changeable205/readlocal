import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import type { DiskNode, FsChangedEvent } from './types';

/** True when running inside the Tauri webview (not a plain browser / `vite dev` tab). */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Native folder picker → absolute directory path. */
export async function pickFolder(): Promise<string | null> {
  const selected = await open({ directory: true, multiple: false, title: 'Open a Markdown folder' });
  if (typeof selected === 'string') return selected;
  return null;
}

/** Native multi-file picker → absolute .md/.markdown paths. */
export async function pickMarkdownFiles(): Promise<string[]> {
  const selected = await open({
    multiple: true,
    title: 'Open Markdown files',
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] }],
  });
  if (Array.isArray(selected)) return selected;
  if (typeof selected === 'string') return [selected];
  return [];
}

/** Recursively scan a directory, returning only Markdown files + their parent dirs. */
export function scanDirectory(root: string): Promise<DiskNode> {
  return invoke<DiskNode>('scan_directory', { root });
}

/** Read a UTF-8 text file straight from disk (no upload, in-process Rust read). */
export function readTextFile(absPath: string): Promise<string> {
  return invoke<string>('read_text_file', { path: absPath });
}

/** Persist edited text back to disk. */
export function writeTextFile(absPath: string, contents: string): Promise<void> {
  return invoke<void>('write_text_file', { path: absPath, contents });
}

/** File path passed on the command line at cold launch (double-click association). */
export function getLaunchFile(): Promise<string | null> {
  return invoke<string | null>('get_launch_file');
}

/** Subscribe to backend filesystem-watcher events for the opened folder. */
export async function onFsChanged(cb: (e: FsChangedEvent) => void): Promise<UnlistenFn> {
  return listen<FsChangedEvent>('fs-changed', (event) => cb(event.payload));
}

/** Subscribe to macOS "open with" / Finder double-click events while running. */
export async function onOpenFile(cb: (absPath: string) => void): Promise<UnlistenFn> {
  return listen<string>('open-file', (event) => cb(event.payload));
}
