import React from 'react';
import { Smartphone, Share, PlusSquare, X } from 'lucide-react';

export default function PWAInstallTip({ onClose }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm w-full bg-white rounded-2xl p-4 warm-shadow border border-[#EFE7DA] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#E8A33D]/10 text-[#E8A33D] flex items-center justify-center">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-[#8B3A3A]">Install Sabha App on Phone</h4>
            <p className="text-[11px] text-[#3A322C]/70">For instant QR scanning & push notifications</p>
          </div>
        </div>
        <button onClick={onClose} className="text-[#3A322C]/40 hover:text-[#3A322C] cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 p-2.5 bg-[#FDFBF7] rounded-xl border border-[#EFE7DA] text-[11px] text-[#3A322C]/80 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-[#8B3A3A]">
          <span>iOS iPhone Safari Tip:</span>
        </div>
        <div className="flex items-center gap-1">
          Tap <Share className="w-3 h-3 text-[#E8A33D]" /> <strong>Share</strong> button, then select <PlusSquare className="w-3 h-3 text-[#E8A33D]" /> <strong>Add to Home Screen</strong>.
        </div>
      </div>
    </div>
  );
}
