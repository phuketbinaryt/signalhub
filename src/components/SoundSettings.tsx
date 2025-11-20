'use client';

import { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Settings } from 'lucide-react';

interface SoundSettingsProps {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

export function SoundSettings({ soundEnabled, setSoundEnabled, volume, setVolume }: SoundSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded text-sm font-medium transition-colors"
        title="Sound Settings"
      >
        {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        <Settings className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-50 p-4">
          <h3 className="text-sm font-semibold mb-3">Sound Notifications</h3>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-muted-foreground">Enable Sounds</span>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                soundEnabled ? 'bg-primary' : 'bg-secondary'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-muted-foreground">Volume</span>
              <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              disabled={!soundEnabled}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: soundEnabled
                  ? `linear-gradient(to right, var(--primary) 0%, var(--primary) ${volume * 100}%, var(--secondary) ${volume * 100}%, var(--secondary) 100%)`
                  : undefined
              }}
            />
          </div>

          {/* Sound Legend */}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Sound Effects:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>🟢 Entry - Notification chime</li>
              <li>🎯 Take Profit - Jackpot sound</li>
              <li>🛑 Stop Loss - Alert tone</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
