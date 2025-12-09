'use client';

import { useState, useEffect, useRef } from 'react';
import { Filter, Check, X } from 'lucide-react';

interface StrategyVisibilityFilterProps {
  strategies: string[];
  visibleStrategies: string[];
  onVisibilityChange: (strategies: string[]) => void;
}

const STORAGE_KEY = 'dashboard-visible-strategies';

export function loadVisibleStrategies(): string[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error loading visible strategies:', error);
  }
  return null;
}

export function saveVisibleStrategies(strategies: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
  } catch (error) {
    console.error('Error saving visible strategies:', error);
  }
}

export function StrategyVisibilityFilter({
  strategies,
  visibleStrategies,
  onVisibilityChange,
}: StrategyVisibilityFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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

  const toggleStrategy = (strategy: string) => {
    const newVisible = visibleStrategies.includes(strategy)
      ? visibleStrategies.filter(s => s !== strategy)
      : [...visibleStrategies, strategy];
    onVisibilityChange(newVisible);
    saveVisibleStrategies(newVisible);
  };

  const selectAll = () => {
    onVisibilityChange([...strategies]);
    saveVisibleStrategies([...strategies]);
  };

  const deselectAll = () => {
    onVisibilityChange([]);
    saveVisibleStrategies([]);
  };

  const isAllSelected = strategies.length > 0 && visibleStrategies.length === strategies.length;
  const isNoneSelected = visibleStrategies.length === 0;
  const selectedCount = visibleStrategies.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
          isAllSelected
            ? 'bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] text-gray-400'
            : 'bg-primary/20 hover:bg-primary/30 border border-primary/50 text-primary'
        }`}
        title="Filter visible strategies"
      >
        <Filter className="w-3 h-3" />
        {isAllSelected ? 'All Strategies' : `${selectedCount} of ${strategies.length}`}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#111111] border border-[#333] rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#222] flex items-center justify-between">
            <span className="text-sm font-medium text-white">Visible Strategies</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-b border-[#222] flex gap-2">
            <button
              onClick={selectAll}
              disabled={isAllSelected}
              className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Select All
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={deselectAll}
              disabled={isNoneSelected}
              className="text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Deselect All
            </button>
          </div>

          {/* Strategy List */}
          <div className="max-h-64 overflow-y-auto">
            {strategies.length === 0 ? (
              <div className="px-4 py-6 text-center text-gray-500 text-sm">
                No strategies found
              </div>
            ) : (
              <div className="py-1">
                {strategies.map((strategy) => {
                  const isSelected = visibleStrategies.includes(strategy);
                  return (
                    <button
                      key={strategy}
                      onClick={() => toggleStrategy(strategy)}
                      className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#1a1a1a] transition-colors text-left"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-primary border-primary'
                            : 'border-[#444] bg-transparent'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm ${isSelected ? 'text-white' : 'text-gray-500'}`}>
                        {strategy}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-[#222] bg-[#0a0a0a]">
            <p className="text-xs text-gray-500">
              {selectedCount === 0
                ? 'No strategies visible - showing no trades'
                : `Showing trades from ${selectedCount} ${selectedCount === 1 ? 'strategy' : 'strategies'}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
