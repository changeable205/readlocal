import { X, FileText } from 'lucide-react';

export interface TabInfo {
  path: string;
  dirty: boolean;
}

interface TabsProps {
  tabs: TabInfo[];
  activePath: string | null;
  dark: boolean;
  onSelect: (path: string) => void;
  onClose: (path: string) => void;
}

function basename(p: string): string {
  const parts = p.split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

/** Horizontal document tab strip; one window hosts every open file as a tab. */
export default function DesktopTabs({ tabs, activePath, dark, onSelect, onClose }: TabsProps) {
  if (tabs.length === 0) return null;
  return (
    <div
      className={`flex items-stretch flex-shrink-0 overflow-x-auto border-b print:hidden ${
        dark ? 'bg-ink-900 border-white/[0.06]' : 'bg-cream-100 border-ink-200/60'
      }`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.path === activePath;
        return (
          <div
            key={tab.path}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(tab.path)}
            className={`group flex items-center gap-2 pl-3 pr-2 min-w-[120px] max-w-[220px] cursor-pointer select-none
              border-r transition-colors duration-150 ${
              dark ? 'border-white/[0.05]' : 'border-ink-200/60'
            } ${
              active
                ? dark
                  ? 'bg-ink-950 text-cream-100'
                  : 'bg-white text-ink-900'
                : dark
                  ? 'text-ink-400 hover:text-cream-200 hover:bg-white/[0.03]'
                  : 'text-ink-500 hover:text-ink-800 hover:bg-cream-50'
            }`}
          >
            <FileText
              size={12}
              strokeWidth={2}
              className={`flex-shrink-0 ${active ? (dark ? 'text-teal-400' : 'text-teal-600') : dark ? 'text-ink-600' : 'text-ink-300'}`}
            />
            <span className="truncate text-[12.5px] font-sans font-medium flex-1 leading-none py-2.5">
              {basename(tab.path).replace(/\.(md|markdown|mdx|txt)$/i, '')}
            </span>
            {tab.dirty && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dark ? 'bg-gold-400' : 'bg-gold-500'}`} />}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(tab.path); }}
              aria-label={`Close ${basename(tab.path)} tab`}
              className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded
                opacity-60 hover:opacity-100 ${
                dark ? 'hover:bg-white/[0.1] text-ink-300' : 'hover:bg-ink-200/70 text-ink-500'
              }`}
            >
              <X size={12} strokeWidth={2.2} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
