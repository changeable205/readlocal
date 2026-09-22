import { BookOpen } from 'lucide-react';
import { Theme } from '../types';

export default function EmptyPreview({ theme }: { theme: Theme }) {
  const dark = theme === 'dark';

  return (
    <div className={`flex-1 flex flex-col items-center justify-center gap-6 transition-colors duration-300 ${dark ? 'bg-ink-950' : 'bg-cream-50'}`}>
      <div className="relative">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${dark ? 'bg-ink-900 border border-white/[0.07] shadow-luxury' : 'bg-white border border-ink-200/50 shadow-luxury'}`}>
          <BookOpen size={26} strokeWidth={1.25} className={dark ? 'text-ink-600' : 'text-ink-300'} />
        </div>
        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 ${dark ? 'bg-ink-950 border-gold-500/30' : 'bg-cream-50 border-gold-400/40'}`} />
      </div>

      <div className="text-center space-y-2">
        <p className={`text-[17px] font-semibold leading-tight ${dark ? 'text-ink-500' : 'text-ink-300'}`} style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          Select a document
        </p>
        <p className={`text-[12px] font-sans ${dark ? 'text-ink-700' : 'text-ink-300'}`}>
          Choose a file from the sidebar to begin reading
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className={`h-px w-12 ${dark ? 'bg-white/[0.05]' : 'bg-ink-200/60'}`} />
        <div className={`w-1 h-1 rounded-full ${dark ? 'bg-gold-500/30' : 'bg-gold-400/50'}`} />
        <div className={`h-px w-12 ${dark ? 'bg-white/[0.05]' : 'bg-ink-200/60'}`} />
      </div>
    </div>
  );
}
