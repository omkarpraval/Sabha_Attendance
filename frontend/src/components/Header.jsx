import React from 'react';
import { Flame, LogOut, UserCheck, Shield, Award, Smartphone, RefreshCw } from 'lucide-react';

export default function Header({ user, onLogout, onSwitchAccount, onInstallPWA, deferredPrompt }) {
  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-[#EFE7DA] sticky top-0 z-40 px-4 py-3 shadow-xs">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#8B3A3A] flex items-center justify-center text-[#E8A33D] shadow-sm">
            <Flame className="w-6 h-6 animate-diya-flame" />
          </div>
          <div>
            <h1 className="font-serif-accent text-xl md:text-2xl font-bold text-[#8B3A3A] leading-tight">
              Sabha Attendance
            </h1>
            <p className="text-xs text-[#3A322C]/70 font-medium">Automatic QR & Geofence System</p>
          </div>
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div className="flex items-center gap-3">
            {/* Role Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FDFBF7] border border-[#EFE7DA] text-[#3A322C]">
              {user.role === 'admin' && <Shield className="w-3.5 h-3.5 text-[#8B3A3A]" />}
              {user.role === 'karyakar' && <Award className="w-3.5 h-3.5 text-[#E8A33D]" />}
              {user.role === 'user' && <UserCheck className="w-3.5 h-3.5 text-[#5B8C5B]" />}
              <span className="capitalize">{user.role}</span>
            </div>

            {/* PWA Prompt button if available */}
            {deferredPrompt && (
              <button
                onClick={onInstallPWA}
                className="hidden lg:flex items-center gap-1.5 bg-[#E8A33D] hover:bg-[#D98A2B] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all shadow-xs"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Install App
              </button>
            )}

            {/* Logout */}
            <button
              onClick={onLogout}
              className="p-2 text-[#3A322C]/70 hover:text-[#C1554A] hover:bg-[#FDFBF7] rounded-lg transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="text-xs font-medium text-[#3A322C]/70">
            Welcome to Sabha Portal
          </div>
        )}
      </div>
    </header>
  );
}
