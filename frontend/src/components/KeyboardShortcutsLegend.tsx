import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface KeyboardShortcutsLegendProps {
  onClose: () => void;
}

const shortcuts = [
  { key: 'J', description: 'Next ticket in list' },
  { key: 'K', description: 'Previous ticket in list' },
  { key: 'R', description: 'Switch to Public Reply tab' },
  { key: 'N', description: 'Switch to Internal Note tab' },
  { key: '?', description: 'Toggle this keyboard shortcuts help' },
];

export const KeyboardShortcutsLegend: React.FC<KeyboardShortcutsLegendProps> = ({ onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-[380px] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#0F172A]">Keyboard Shortcuts</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
            <X className="w-4 h-4 text-[#475569]" />
          </button>
        </div>

        <div className="p-5 space-y-2">
          {shortcuts.map(({ key, description }) => (
            <div key={key} className="flex items-center justify-between py-1.5">
              <span className="text-sm text-[#475569]">{description}</span>
              <kbd className="font-mono text-xs font-semibold bg-[#F1F5F9] border border-[#CBD5E1] text-[#475569] px-2.5 py-1 rounded-md shadow-[inset_0_-1px_0_#CBD5E1]">
                {key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E5E7EB] text-center">
          <p className="text-[11px] text-[#94A3B8]">
            Press <kbd className="font-mono font-semibold bg-white border border-[#E5E7EB] px-1 rounded">?</kbd> or click anywhere outside to close
          </p>
        </div>
      </div>
    </div>
  );
};
