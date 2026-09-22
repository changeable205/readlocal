import { BookOpen, Sun, Moon, PanelLeftClose, PanelLeft, FolderOpen, FilePlus2, Columns2, BookOpenText, Code2, FileCode2, FileDown } from 'lucide-react';
import { Theme } from '../types';
import { ViewMode } from './types';

interface HeaderProps {
  theme: Theme;
  sidebarOpen: boolean;
  hasFile: boolean;
  viewMode: ViewMode;
  onToggleSidebar: () => void;
  onOpenFolder: () => void;
  onOpenFiles: () => void;
  onViewMode: (m: ViewMode) => void;
  onExportHtml: () => void;
  onExportPdf: () => void;
  onToggleTheme: () => void;
}

export default function DesktopHeader({
  theme, sidebarOpen, hasFile, viewMode,
  onToggleSidebar, onOpenFolder, onOpenFiles, onViewMode, onExportHtml, onExportPdf, onToggleTheme,
}: HeaderProps) {
  const dark = theme === 'dark';
  const ghost = dark
    ? 'hover:bg-white/[0.08] text-ink-300 hover:text-cream-200'
    : 'hover:bg-ink-100 text-ink-500 hover:text-ink-800';
  const activeCls = dark ? 'bg-teal-900/50 text-teal-300' : 'bg-teal-50 text-teal-700';

  return (
    <header
      className={`h-[52px] flex items-center px-3 gap-2 flex-shrink-0 z-20 border-b transition-colors duration-300 ${
        dark ? 'bg-ink-950/95 border-white/[0.06] text-cream-100' : 'bg-cream-50/95 border-ink-200/60 text-ink-900'
      }`}
    >
      {/* Clear the macOS traffic-light buttons (close/min/max) */}
      <div className="w-[70px] flex-shrink-0" />

      <div className="flex items-center gap-2.5 mr-1">
        <div className="relative w-8 h-8 flex-shrink-0">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-teal-400 to-teal-700 shadow-[0_2px_10px_rgba(20,184,166,0.40)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen size={15} className="text-white" strokeWidth={2.2} />
          </div>
        </div>
        <span
          className="text-[14px] font-bold tracking-[0.12em] uppercase leading-none hidden sm:block"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", letterSpacing: '0.14em' }}
        >
          READ<span className={dark ? 'text-teal-400' : 'text-teal-600'}>LOCAL</span>
        </span>
      </div>

      {/* Sidebar toggle moved here (past the traffic lights), replaces the old "desktop" tag */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Collapse file tree' : 'Expand file tree'}
        aria-label={sidebarOpen ? 'Collapse file tree' : 'Expand file tree'}
        className={`flex items-center px-2 py-1.5 rounded-lg transition-all duration-150 ${ghost} ${sidebarOpen ? activeCls : ''}`}
      >
        {sidebarOpen ? <PanelLeftClose size={16} strokeWidth={1.75} /> : <PanelLeft size={16} strokeWidth={1.75} />}
      </button>

      <div className={`h-5 w-px ${dark ? 'bg-white/[0.08]' : 'bg-ink-200'}`} />

      <button
        onClick={onOpenFolder}
        title="Open a folder from disk"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-medium ${ghost}`}
      >
        <FolderOpen size={14} strokeWidth={2} /><span className="hidden md:inline">Folder</span>
      </button>
      <button
        onClick={onOpenFiles}
        title="Open individual .md files"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-medium ${ghost}`}
      >
        <FilePlus2 size={14} strokeWidth={2} /><span className="hidden md:inline">Files</span>
      </button>

      {/* View mode segmented control */}
      <div className={`ml-2 flex items-center rounded-lg p-0.5 ${dark ? 'bg-white/[0.05]' : 'bg-ink-100/70'}`}>
        <button
          onClick={() => onViewMode('split')}
          title="Source + Preview (split)"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-medium transition-colors ${viewMode === 'split' ? activeCls : ghost}`}
        >
          <Columns2 size={12} strokeWidth={2} /><span className="hidden lg:inline">Split</span>
        </button>
        <button
          onClick={() => onViewMode('source')}
          title="Raw Markdown source only"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-medium transition-colors ${viewMode === 'source' ? activeCls : ghost}`}
        >
          <Code2 size={12} strokeWidth={2} /><span className="hidden lg:inline">Source</span>
        </button>
        <button
          onClick={() => onViewMode('preview')}
          title="Rendered preview only"
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-sans font-medium transition-colors ${viewMode === 'preview' ? activeCls : ghost}`}
        >
          <BookOpenText size={12} strokeWidth={2} /><span className="hidden lg:inline">Preview</span>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={onExportHtml}
          disabled={!hasFile}
          title="Export standalone HTML"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-medium disabled:opacity-35 ${ghost}`}
        >
          <FileCode2 size={14} strokeWidth={2} /><span className="hidden md:inline">HTML</span>
        </button>
        <button
          onClick={onExportPdf}
          disabled={!hasFile}
          title="Export PDF"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-medium disabled:opacity-35 ${ghost}`}
        >
          <FileDown size={14} strokeWidth={2} /><span className="hidden md:inline">PDF</span>
        </button>
        <div className={`h-5 w-px mx-1 ${dark ? 'bg-white/[0.08]' : 'bg-ink-200'}`} />
        <button
          onClick={onToggleTheme}
          title={dark ? 'Switch to light' : 'Switch to dark'}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-sans font-medium ${ghost}`}
        >
          {dark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
        </button>
      </div>
    </header>
  );
}
