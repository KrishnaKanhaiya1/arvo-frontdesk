import React from 'react';

export const WakeUpScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F6F7F9] text-[#0F172A]">
      <div className="flex flex-col items-center max-w-sm text-center px-4">
        {/* Modern Geometric A Logo */}
        <div className="w-14 h-14 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-lg mb-6 animate-pulse">
          <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="12 2 2 22 22 22" fill="none" />
            <line x1="7" y1="15" x2="17" y2="15" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-[#0F172A] mb-2 tracking-tight">
          Arvo Frontdesk
        </h2>
        
        <p className="text-sm text-[#475569] mb-6">
          Connecting to Arvo Frontdesk workspace...
        </p>

        {/* Pulse indicator */}
        <div className="flex items-center space-x-2 text-xs text-[#94A3B8] font-mono">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#2563EB]"></span>
          </span>
          <span>Waiting for backend cold-start</span>
        </div>
      </div>
    </div>
  );
};
