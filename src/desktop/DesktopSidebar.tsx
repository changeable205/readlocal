import { useState, useMemo } from 'react';
import { Search, FileText, ChevronRight, ChevronDown, Folder, FolderOpen, X, HardDrive } from 'lucide-react';
import { Theme } from '../types';
import { DiskNode } from './types';

interface SidebarProps {
  rootPath: string | null;
  tree: DiskNode | null;
  selectedAbsPath: string | null;
  theme: Theme;
  onSelectFile: (absPath: string) => void;
  onChangeFolder: () => void;
}

function countFiles(node: DiskNode): number {
  if (node.kind === 'file') return 1;
  return node.children.reduce((sum, c) => sum + countFiles(c), 0);
}

function flattenFiles(node: DiskNode, out: DiskNode[] = []): DiskNode[] {
  for (const c of node.children) {
    if (c.kind === 'file') out.push(c);
    else flattenFiles(c, out);
  }
  return out;
}

interface NodeProps {
  node: DiskNode;
  depth: number;
  selectedAbsPath: string | null;
  dark: boolean;
  onSelectFile: (absPath: string) => void;
}

function TreeItem({ node, depth, selectedAbsPath, dark, onSelectFile }: NodeProps) {
  const [open, setOpen] = useState(true);

  if (node.kind === 'file') {
    const selected = node.absPath === selectedAbsPath;
    return (
      <button
        onClick={() => onSelectFile(node.absPath)}
        role="treeitem"
        aria-selected={selected}
        title={node.relPath}
        className={`
          w-full relative flex items-center gap-2 rounded-lg mx-1 my-[1px]
          transition-all duration-150 cursor-pointer select-none text-left
          ${selected
            ? dark
              ? 'bg-teal-900/30 text-teal-300 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.2)]'
              : 'bg-teal-50 text-teal-800 shadow-[inset_0_0_0_1px_rgba(20,184,166,0.15)]'
            : dark
              ? 'text-ink-300 hover:bg-white/[0.05] hover:text-cream-200'
              : 'text-ink-600 hover:bg-ink-100/80 hover:text-ink-800'
          }
        `}
        style={{ paddingLeft: `${10 + depth * 14}px`, paddingRight: 8, paddingTop: 7, paddingBottom: 7 }}
      >
        {selected && (
          <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full ${dark ? 'bg-teal-400' : 'bg-teal-500'}`} />
        )}
        <FileText size={11} strokeWidth={2} className={`flex-shrink-0 ${selected ? (dark ? 'text-teal-400' : 'text-teal-500') : dark ? 'text-ink-600' : 'text-ink-300'}`} />
        <span className="text-[12.5px] font-sans font-medium truncate flex-1 leading-none">
          {node.name.replace(/\.(md|markdown|mdx|txt)$/i, '')}
        </span>
      </button>
    );
  }

  return (
    <div role="group">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-1.5 py-[7px] pr-3 rounded-lg text-[11px] font-sans font-semibold uppercase tracking-[0.07em] transition-all duration-150 ${dark ? 'text-ink-500 hover:text-ink-300 hover:bg-white/[0.04]' : 'text-ink-400 hover:text-ink-600 hover:bg-ink-100/70'}`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
      >
        {open ? <ChevronDown size={11} strokeWidth={2.5} /> : <ChevronRight size={11} strokeWidth={2.5} />}
        {open
          ? <FolderOpen size={13} className={dark ? 'text-gold-500 flex-shrink-0' : 'text-gold-600 flex-shrink-0'} />
          : <Folder size={13} className={dark ? 'text-gold-500 flex-shrink-0' : 'text-gold-600 flex-shrink-0'} />}
        <span className="truncate text-left">{node.name}</span>
      </button>
      {open && node.children.map((child) => (
        <TreeItem
          key={child.absPath}
          node={child}
          depth={depth + 1}
          selectedAbsPath={selectedAbsPath}
          dark={dark}
          onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

export default function DesktopSidebar({
  rootPath, tree, selectedAbsPath, theme, onSelectFile, onChangeFolder,
}: SidebarProps) {
  const dark = theme === 'dark';
  const [query, setQuery] = useState('');

  const total = useMemo(() => (tree ? countFiles(tree) : 0), [tree]);
  const searchResults = useMemo(() => {
    if (!tree || !query.trim()) return [];
    const q = query.toLowerCase();
    return flattenFiles(tree).filter(
      (f) => f.name.toLowerCase().includes(q) || f.relPath.toLowerCase().includes(q)
    );
  }, [tree, query]);

  const rootName = rootPath ? rootPath.split('/').filter(Boolean).pop() ?? rootPath : null;

  return (
    <aside className={`flex flex-col h-full w-full border-r transition-colors duration-300 ${dark ? 'bg-ink-950 border-white/[0.06]' : 'bg-cream-50 border-ink-200/60'}`}>
      {/* Current folder */}
      <div className={`px-3 pt-3 pb-2 border-b ${dark ? 'border-white/[0.05]' : 'border-ink-100'}`}>
        <button
          onClick={onChangeFolder}
          title={rootPath ?? 'Open a folder'}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors duration-150 ${dark ? 'bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07]' : 'bg-white hover:bg-cream-100 border border-ink-200/60 shadow-inner-sm'}`}
        >
          <HardDrive size={13} className={dark ? 'text-teal-400' : 'text-teal-600'} strokeWidth={2} />
          <span className={`text-[12px] font-sans font-semibold truncate flex-1 ${dark ? 'text-cream-200' : 'text-ink-800'}`}>
            {rootName ?? 'Open folder'}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className={`px-3 pt-2 pb-2 border-b ${dark ? 'border-white/[0.05]' : 'border-ink-100'}`}>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors duration-150 ${dark ? 'bg-white/[0.05] border border-white/[0.07] focus-within:border-teal-500/40' : 'bg-white border border-ink-200/60 focus-within:border-teal-400/50 shadow-inner-sm'}`}>
          <Search size={12} strokeWidth={2.5} className={dark ? 'text-ink-600' : 'text-ink-300'} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search files…"
            className={`flex-1 text-[12.5px] font-sans bg-transparent outline-none ${dark ? 'text-cream-200 placeholder:text-ink-600' : 'text-ink-700 placeholder:text-ink-300'}`}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear search" className={`rounded ${dark ? 'text-ink-600 hover:text-ink-300' : 'text-ink-300 hover:text-ink-500'}`}>
              <X size={11} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-between px-4 pt-2 pb-1 ${dark ? 'text-ink-500' : 'text-ink-400'}`}>
        <span className="text-[10.5px] font-sans font-semibold uppercase tracking-[0.08em]">Index</span>
      </div>

      {/* Tree / search results */}
      <div className="flex-1 overflow-y-auto py-1 px-2" role="tree" aria-label="Markdown files on disk">
        {!tree ? (
          <div className={`text-center py-10 px-4 text-[12px] font-sans leading-relaxed ${dark ? 'text-ink-700' : 'text-ink-300'}`}>
            Open a folder to browse its Markdown files from disk.
          </div>
        ) : query.trim() ? (
          searchResults.length === 0 ? (
            <div className={`text-center py-10 text-[12px] font-sans ${dark ? 'text-ink-600' : 'text-ink-400'}`}>
              No results for “{query}”
            </div>
          ) : (
            searchResults.map((f) => (
              <TreeItem key={f.absPath} node={f} depth={0} selectedAbsPath={selectedAbsPath} dark={dark} onSelectFile={onSelectFile} />
            ))
          )
        ) : (
          tree.children.map((child) => (
            <TreeItem
              key={child.absPath}
              node={child}
              depth={0}
              selectedAbsPath={selectedAbsPath}
              dark={dark}
              onSelectFile={onSelectFile}
            />
          ))
        )}
      </div>

      {tree && (
        <div className={`px-4 py-2.5 border-t flex items-center gap-1.5 ${dark ? 'border-white/[0.05] text-ink-700' : 'border-ink-100 text-ink-300'}`}>
          <FileText size={10} strokeWidth={2} />
          <span className="text-[11px] font-sans">{total} {total === 1 ? 'document' : 'documents'}</span>
        </div>
      )}
    </aside>
  );
}
