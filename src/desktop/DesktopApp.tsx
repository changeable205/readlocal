import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { FolderOpen, FilePlus2, BookOpenText, RefreshCw } from 'lucide-react';
import { Theme, FontSize, ReadingWidth, MarkdownFile } from '../types';
import DesktopHeader from './DesktopHeader';
import DesktopSidebar from './DesktopSidebar';
import SourcePreviewSplit, { EditableSource } from './SourcePreviewSplit';
import MarkdownPreview from '../components/MarkdownPreview';
import { ToastContainer, ToastMessage } from '../components/Toast';
import { DiskNode, ViewMode, FsChangedEvent } from './types';
import {
  isTauri, pickFolder, pickMarkdownFiles, scanDirectory, readTextFile, writeTextFile,
  getLaunchFile, onFsChanged, onOpenFile,
} from './tauriApi';
import { exportHtml, exportPdf } from './exportUtils';

function useLocalStorage<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key);
      return s ? (JSON.parse(s) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((v: T) => {
    setValue(v);
    try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ }
  }, [key]);
  return [value, set];
}

function basename(p: string): string {
  return p.split('/').pop() ?? p;
}
function dirname(p: string): string {
  const i = p.lastIndexOf('/');
  return i >= 0 ? p.slice(0, i) : '';
}
function isMarkdownPath(p: string): boolean {
  return /\.(md|markdown|mdx|txt)$/i.test(p);
}

/** Build a flat synthetic tree from individually opened files. */
function syntheticTree(files: { absPath: string }[]): DiskNode {
  return {
    name: '', absPath: '', relPath: '', kind: 'dir', size: 0,
    children: files.map((f) => ({
      name: basename(f.absPath), absPath: f.absPath, relPath: basename(f.absPath),
      kind: 'file' as const, size: 0, children: [],
    })),
  };
}

export default function DesktopApp() {
  const [theme, setTheme] = useLocalStorage<Theme>('rld-theme', 'light');
  const [fontSize, setFontSize] = useLocalStorage<FontSize>('rld-font', 'md');
  const [readingWidth, setReadingWidth] = useLocalStorage<ReadingWidth>('rld-width', 'medium');
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('rld-view', 'split');
  const [lastFolder, setLastFolder] = useLocalStorage<string | null>('rld-last-folder', null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<DiskNode | null>(null);
  const [currentPath, setCurrentPath] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [externalReload, setExternalReload] = useState(false);

  const dark = theme === 'dark';
  const tauri = isTauri();
  const cacheRef = useRef<Map<string, string>>(new Map());
  const rescanTimer = useRef<number | null>(null);
  const reloadTimer = useRef<number | null>(null);
  const currentPathRef = useRef<string | null>(null);
  const rootPathRef = useRef<string | null>(null);
  const contentRef = useRef<string>('');
  currentPathRef.current = currentPath;
  rootPathRef.current = rootPath;
  contentRef.current = content;

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.body.style.backgroundColor = dark ? '#100e0b' : '#faf7ef';
  }, [dark]);

  /** Load a file's text (cached) and make it the current document. */
  const openPath = useCallback(async (absPath: string) => {
    try {
      let text = cacheRef.current.get(absPath);
      if (text === undefined) {
        text = await readTextFile(absPath);
        cacheRef.current.set(absPath, text);
      }
      setCurrentPath(absPath);
      setContent(text);
    } catch (err) {
      showToast(`Could not open ${basename(absPath)}: ${String(err)}`);
    }
  }, [showToast]);

  // Live typing in the source pane updates content → preview re-renders.
  const editContent = useCallback((text: string) => {
    setContent(text);
  }, []);

  // Persist the current document to disk (Cmd/Ctrl+S).
  const saveCurrent = useCallback(async () => {
    const path = currentPathRef.current;
    if (!path) return;
    const text = contentRef.current;
    try {
      await writeTextFile(path, text);
      cacheRef.current.set(path, text);
      showToast(`Saved ${basename(path)}`, 'success');
    } catch (err) {
      showToast(`Save failed: ${String(err)}`);
    }
  }, [showToast]);

  const firstFile = useCallback((node: DiskNode): DiskNode | null => {
    for (const c of node.children) {
      if (c.kind === 'file') return c;
      const deep = firstFile(c);
      if (deep) return deep;
    }
    return null;
  }, []);

  const openFolder = useCallback(async (folder?: string) => {
    try {
      const root = folder ?? await pickFolder();
      if (!root) return;
      setLoading(true);
      const scanned = await scanDirectory(root); // backend also (re)starts the watcher
      setRootPath(root);
      setTree(scanned);
      setLastFolder(root);
      setSidebarOpen(true);
      cacheRef.current.clear();
      const first = firstFile(scanned);
      if (first) await openPath(first.absPath);
      else { setCurrentPath(null); setContent(''); }
    } catch (err) {
      showToast(`Failed to scan folder: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [firstFile, openPath, setLastFolder, showToast]);

  const openLooseFiles = useCallback(async (paths?: string[]) => {
    try {
      const picked = paths ?? await pickMarkdownFiles();
      if (picked.length === 0) return;
      const md = picked.filter(isMarkdownPath);
      await Promise.all(md.map(async (p) => {
        cacheRef.current.set(p, await readTextFile(p));
      }));
      setRootPath(null);
      setTree(syntheticTree(md.map((p) => ({ absPath: p }))));
      setSidebarOpen(true);
      await openPath(md[0]);
    } catch (err) {
      showToast(`Failed to open files: ${String(err)}`);
    }
  }, [openPath, showToast]);

  // Re-scan the current folder (debounced) for structural changes.
  const scheduleRescan = useCallback(() => {
    if (rescanTimer.current) window.clearTimeout(rescanTimer.current);
    rescanTimer.current = window.setTimeout(async () => {
      const root = rootPathRef.current;
      if (!root) return;
      try { setTree(await scanDirectory(root)); } catch { /* ignore */ }
    }, 450);
  }, []);

  // Re-read the current file when it changes on disk (debounced auto-refresh).
  const scheduleReloadCurrent = useCallback((path: string) => {
    if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
    reloadTimer.current = window.setTimeout(async () => {
      try {
        const text = await readTextFile(path);
        cacheRef.current.set(path, text);
        if (currentPathRef.current === path) {
          setContent(text);
          setExternalReload(true);
          window.setTimeout(() => setExternalReload(false), 1600);
        }
      } catch { /* file may have been removed */ }
    }, 300);
  }, []);

  // Subscribe to backend filesystem events + macOS open-with events.
  useEffect(() => {
    if (!tauri) return;
    let unlistenFs: (() => void) | undefined;
    let unlistenOpen: (() => void) | undefined;
    (async () => {
      unlistenFs = await onFsChanged((e: FsChangedEvent) => {
        const cur = currentPathRef.current;
        if (cur && e.path === cur && /modify|create/i.test(e.kind)) {
          scheduleReloadCurrent(cur);
        } else if (!isMarkdownPath(e.path) || /create|remove|rename/i.test(e.kind)) {
          scheduleRescan();
        }
      });
      unlistenOpen = await onOpenFile((absPath) => {
        // Finder double-click / "Open with" while the app is running.
        if (isMarkdownPath(absPath)) openLooseFiles([absPath]);
      });
    })();
    return () => { unlistenFs?.(); unlistenOpen?.(); };
  }, [tauri, scheduleReloadCurrent, scheduleRescan, openLooseFiles]);

  // Cold launch: open an association path if present (poll briefly because the
  // macOS open-document Apple event can arrive just after the webview mounts),
  // otherwise restore the last opened folder.
  useEffect(() => {
    if (!tauri) return;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      let launchFile: string | null = null;
      for (let i = 0; i < 5 && !launchFile; i++) {
        launchFile = await getLaunchFile().catch(() => null);
        if (!launchFile) await sleep(300);
      }
      if (launchFile && isMarkdownPath(launchFile)) {
        const parent = dirname(launchFile);
        if (parent) {
          await openFolder(parent);
          await openPath(launchFile);
        } else {
          await openLooseFiles([launchFile]);
        }
        return;
      }
      if (lastFolder) openFolder(lastFolder).catch(() => {});
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentFile: MarkdownFile | null = useMemo(() => {
    if (!currentPath) return null;
    const rel = rootPath ? currentPath.slice(rootPath.length + 1) : basename(currentPath);
    return {
      id: currentPath,
      name: basename(currentPath),
      path: rel,
      folder: dirname(rel),
      content,
      size: content.length,
    };
  }, [currentPath, rootPath, content]);

  const handleExportHtml = useCallback(() => {
    if (!currentFile) return;
    exportHtml(currentFile.name, document.querySelector('[data-printable]') as HTMLElement | null)
      .catch((err) => showToast(`HTML export failed: ${String(err)}`));
  }, [currentFile, showToast]);

  const handleExportPdf = useCallback(() => {
    if (!currentFile) return;
    exportPdf(currentFile.name, theme).catch((err) => showToast(`PDF export failed: ${String(err)}`));
  }, [currentFile, theme, showToast]);

  if (!tauri) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-center px-8 bg-cream-50 text-ink-700 font-sans">
        <BookOpenText size={36} className="text-teal-600" />
        <h1 className="text-xl font-bold">ReadLocal Desktop runs inside Tauri</h1>
        <p className="max-w-md text-sm leading-relaxed text-ink-500">
          The browser preview cannot access your disk. Start the desktop app with
          <code className="mx-1 px-1.5 py-0.5 rounded bg-ink-100 font-mono text-[12px]">npm run tauri:dev</code>
          (or build a .app with <code className="mx-1 px-1.5 py-0.5 rounded bg-ink-100 font-mono text-[12px]">npm run tauri:build</code>).
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen overflow-hidden font-sans transition-colors duration-300 ${dark ? 'bg-ink-950 text-cream-200' : 'bg-cream-50 text-ink-800'}`}>
      <DesktopHeader
        theme={theme}
        sidebarOpen={sidebarOpen}
        hasFile={!!currentFile}
        viewMode={viewMode}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenFolder={() => openFolder()}
        onOpenFiles={() => openLooseFiles()}
        onViewMode={setViewMode}
        onExportHtml={handleExportHtml}
        onExportPdf={handleExportPdf}
        onToggleTheme={() => setTheme(dark ? 'light' : 'dark')}
      />

      <div className="flex flex-1 overflow-hidden">
        <div
          style={{ width: sidebarOpen ? 264 : 0 }}
          className="flex-shrink-0 overflow-hidden transition-[width] duration-300 ease-in-out"
        >
          <div className="w-[264px] h-full">
            <DesktopSidebar
              rootPath={rootPath}
              tree={tree}
              selectedAbsPath={currentPath}
              theme={theme}
              onSelectFile={openPath}
              onChangeFolder={() => openFolder()}
            />
          </div>
        </div>

        <main className="flex flex-col flex-1 overflow-hidden min-w-0 relative">
          {externalReload && (
            <div className={`absolute top-3 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-sans shadow-luxury ${dark ? 'bg-teal-900/60 text-teal-300' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
              <RefreshCw size={11} strokeWidth={2.5} /> Reloaded from disk
            </div>
          )}

          {loading && (
            <div className={`absolute inset-0 z-40 flex items-center justify-center ${dark ? 'bg-ink-950/60' : 'bg-cream-50/60'}`}>
              <div className="w-6 h-6 rounded-full border-2 border-teal-500 border-t-transparent animate-spin" />
            </div>
          )}

          {!currentFile ? (
            <div className={`flex-1 flex flex-col items-center justify-center gap-7 text-center px-10 ${dark ? 'bg-ink-950' : 'bg-cream-50'}`}>
              <div className="relative w-16 h-20 rounded-xl border flex flex-col items-center justify-center shadow-luxury-md bg-white border-ink-200/60">
                <BookOpenText size={22} className="text-ink-400" strokeWidth={1.5} />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>Open a Markdown folder</h1>
                <p className={`text-[13.5px] max-w-sm ${dark ? 'text-ink-400' : 'text-ink-400'}`}>
                  Browse a real folder tree on disk, read raw source beside the rendered preview, and export to HTML or PDF. Files never leave your Mac.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => openFolder()} className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13.5px] font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-[0_4px_16px_rgba(20,184,166,0.3)]">
                  <FolderOpen size={15} strokeWidth={2} /> Open Folder
                </button>
                <button onClick={() => openLooseFiles()} className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[13.5px] font-semibold border shadow-luxury ${dark ? 'bg-white/[0.07] border-white/[0.10] text-cream-200' : 'bg-white border-ink-200/70 text-ink-700'}`}>
                  <FilePlus2 size={15} strokeWidth={2} /> Open Files
                </button>
              </div>
            </div>
          ) : viewMode === 'split' ? (
            <SourcePreviewSplit
              file={currentFile}
              theme={theme}
              fontSize={fontSize}
              readingWidth={readingWidth}
              onEdit={editContent}
              onSave={saveCurrent}
            />
          ) : viewMode === 'source' ? (
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <EditableSource
                file={currentFile}
                theme={theme}
                fontSize={fontSize}
                onEdit={editContent}
                onSave={saveCurrent}
              />
            </div>
          ) : (
            <MarkdownPreview
              file={currentFile}
              theme={theme}
              fontSize={fontSize}
              readingWidth={readingWidth}
              tocEnabled={false}
              showControls
              onFontSizeChange={setFontSize}
              onWidthChange={setReadingWidth}
              onTocToggle={() => {}}
            />
          )}
        </main>
      </div>

      <ToastContainer
        messages={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}
