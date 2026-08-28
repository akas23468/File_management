import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { sounds } from '../utils/soundEffects';
import { 
  Settings, 
  Sun, 
  Moon, 
  Volume2, 
  VolumeX, 
  Bell, 
  HardDrive, 
  DownloadCloud, 
  Wifi, 
  WifiOff, 
  Check, 
  Play,
  ShieldCheck
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    currentUser, 
    setToastMessage,
    isSimulatedOffline,
    toggleSimulateOffline,
    cachedDocumentIds,
    precacheAllDocumentsForUnderground,
    documents
  } = useApp();

  // 1. Theme Setting (Light / Dark)
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('minemind_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-amber', 'theme-contrast');
    if (isDark) {
      root.classList.add('dark');
      try { localStorage.setItem('minemind_theme', 'dark'); } catch {}
    } else {
      try { localStorage.setItem('minemind_theme', 'light'); } catch {}
    }
  }, [isDark]);

  // 2. Sound Effects
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => sounds.isEnabled());
  const [soundVolume, setSoundVolume] = useState<number>(() => sounds.getVolume());

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    sounds.setEnabled(enabled);
    if (enabled) {
      sounds.playSuccess();
    }
  };

  const handleVolumeChange = (vol: number) => {
    setSoundVolume(vol);
    sounds.setVolume(vol);
  };

  // 3. Notifications
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('minemind_notifs_enabled') !== 'false';
    } catch {
      return true;
    }
  });

  const handleToggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    try {
      localStorage.setItem('minemind_notifs_enabled', enabled ? 'true' : 'false');
    } catch {}
    if (enabled) {
      sounds.playSuccess();
      setToastMessage({
        type: 'info',
        text: 'In-app notifications enabled.',
      });
    }
  };

  return (
    <div id="settings-view" className="p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#FAF8F3] border border-[#E4E0D6] flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#C8892E]" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-lg text-[#141C2B]">
              Settings & Preferences
            </h2>
            <p className="text-xs text-[#64748B]">
              Manage display theme, sound feedback, notifications, and offline access.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-[#16A34A]" />
          <span>Active Session: {currentUser.role === 'admin' ? 'Admin' : 'Officer'}</span>
        </div>
      </div>

      {/* Main Settings List */}
      <div className="space-y-4">
        {/* 1. Theme / Appearance */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Sun className="w-4 h-4 text-[#C8892E]" />
                <span>Appearance Theme</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Switch between standard light view and low-glare dark view.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#FAF8F3] p-1 rounded-lg border border-[#E4E0D6]">
              <button
                type="button"
                onClick={() => {
                  setIsDark(false);
                  sounds.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  !isDark 
                    ? 'bg-white text-[#141C2B] shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#141C2B]'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-[#C8892E]" />
                <span>Light Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsDark(true);
                  sounds.playClick();
                }}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-[#141C2B] text-white shadow-xs font-bold' 
                    : 'text-[#64748B] hover:text-[#141C2B]'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-[#C8892E]" />
                <span>Dark Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* 2. Sound Effects */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-[#C8892E]" />
                <span>Sound & Audio Effects</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Play acoustic feedback for button actions, successful filings, and notifications.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggleSound(!soundEnabled)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-[#166534] text-white'
                  : 'bg-[#FAF8F3] text-[#64748B] border border-[#E4E0D6]'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#86EFAC]" /> : <VolumeX className="w-4 h-4" />}
              <span>{soundEnabled ? 'Sound Enabled' : 'Muted'}</span>
            </button>
          </div>

          {soundEnabled && (
            <div className="pt-3 border-t border-[#EFEBE2] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 max-w-sm">
                <span className="text-xs font-semibold text-[#141C2B]">Volume</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={soundVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 accent-[#C8892E] cursor-pointer"
                />
                <span className="text-xs font-mono font-bold text-[#C8892E] w-8">
                  {Math.round(soundVolume * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() => sounds.playSuccess()}
                className="px-3 py-1.5 bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border border-[#E4E0D6] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
              >
                <Play className="w-3 h-3 text-[#16A34A]" />
                <span>Test Sound</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Notifications */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#C8892E]" />
                <span>In-App Notifications & Alerts</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Display banner alerts for urgent safety circulars, approvals, and report completions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleToggleNotifications(!notificationsEnabled)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                notificationsEnabled
                  ? 'bg-[#141C2B] text-[#C8892E]'
                  : 'bg-[#FAF8F3] text-[#64748B] border border-[#E4E0D6]'
              }`}
            >
              <Check className={`w-4 h-4 ${notificationsEnabled ? 'text-[#C8892E]' : 'text-transparent'}`} />
              <span>{notificationsEnabled ? 'Enabled' : 'Disabled'}</span>
            </button>
          </div>
        </div>

        {/* 4. Offline Pit Cache */}
        <div className="bg-white border border-[#E4E0D6] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-[#141C2B] flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#C8892E]" />
                <span>Offline Pit & Shaft Cache</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Store documents locally in browser storage for use inside deep mine pits without internet.
              </p>
            </div>

            <div className="text-xs font-mono font-bold text-[#166534] bg-[#F0FDF4] border border-[#BBF7D0] px-3 py-1.5 rounded-lg self-start sm:self-auto">
              {cachedDocumentIds.length} of {documents.length} Docs Offline Ready
            </div>
          </div>

          <div className="pt-3 border-t border-[#EFEBE2] flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => {
                precacheAllDocumentsForUnderground();
                sounds.playSuccess();
              }}
              className="px-3.5 py-2 bg-[#166534] hover:bg-[#14532D] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <DownloadCloud className="w-3.5 h-3.5 text-[#86EFAC]" />
              <span>Pre-cache All Documents</span>
            </button>

            <button
              type="button"
              onClick={() => {
                toggleSimulateOffline();
                sounds.playClick();
              }}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isSimulatedOffline 
                  ? 'bg-[#141C2B] text-white border-[#141C2B]' 
                  : 'bg-[#FAF8F3] hover:bg-[#EFEBE2] text-[#141C2B] border-[#E4E0D6]'
              }`}
            >
              {isSimulatedOffline ? <WifiOff className="w-3.5 h-3.5 text-[#F59E0B]" /> : <Wifi className="w-3.5 h-3.5 text-[#16A34A]" />}
              <span>{isSimulatedOffline ? 'Simulating Offline Mode' : 'Test Offline Disconnect'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
