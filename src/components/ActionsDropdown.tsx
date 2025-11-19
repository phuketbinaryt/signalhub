'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2 } from 'lucide-react';

interface ActionsDropdownProps {
  onDelete: () => void;
}

export function ActionsDropdown({ onDelete }: ActionsDropdownProps) {
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
        className="inline-flex items-center gap-1 px-3 py-1.5 bg-secondary hover:bg-secondary/80 border border-border text-foreground rounded text-xs font-medium transition-colors"
        title="Actions"
      >
        <MoreVertical className="w-3 h-3" />
        Actions
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-card border border-border rounded-lg shadow-lg z-50">
          <button
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
