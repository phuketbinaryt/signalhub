'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, Trash2, CheckCircle, Pencil } from 'lucide-react';

interface Trade {
  id: number;
  ticker: string;
  direction: string;
  entryPrice: number;
  status: string;
  quantity: number;
  exitPrice?: number | null;
  exitReason?: string | null;
  pnl?: number | null;
}

interface ActionsDropdownProps {
  trade: Trade;
  onDelete: () => void;
  onComplete: (tradeId: number, exitPrice: number, pnl: number, exitReason: string) => void;
  onEdit?: (tradeId: number, data: { exitPrice?: number; exitReason?: string; pnl?: number }) => Promise<void>;
}

export function ActionsDropdown({ trade, onDelete, onComplete, onEdit }: ActionsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [exitPrice, setExitPrice] = useState('');
  const [pnl, setPnl] = useState('');
  const [exitReason, setExitReason] = useState('take_profit');
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // Calculate P&L when exit price changes
  useEffect(() => {
    if (exitPrice && trade.entryPrice) {
      const exit = parseFloat(exitPrice);
      if (!isNaN(exit)) {
        let calculatedPnl: number;
        if (trade.direction === 'long') {
          calculatedPnl = (exit - trade.entryPrice) * (trade.quantity || 1);
        } else {
          calculatedPnl = (trade.entryPrice - exit) * (trade.quantity || 1);
        }
        setPnl(calculatedPnl.toFixed(2));
      }
    }
  }, [exitPrice, trade.entryPrice, trade.direction, trade.quantity]);

  const handleComplete = async () => {
    if (!exitPrice || !pnl) {
      alert('Please enter exit price and P&L');
      return;
    }

    setIsSubmitting(true);
    try {
      await onComplete(trade.id, parseFloat(exitPrice), parseFloat(pnl), exitReason);
      setShowCompleteModal(false);
      setExitPrice('');
      setPnl('');
      setExitReason('take_profit');
    } catch (error) {
      console.error('Error completing trade:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = () => {
    setExitPrice(trade.exitPrice?.toString() || '');
    setPnl(trade.pnl?.toString() || '');
    setExitReason(trade.exitReason || 'take_profit');
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    setIsSubmitting(true);
    try {
      const updateData: { exitPrice?: number; exitReason?: string; pnl?: number; status?: string } = {};

      if (exitPrice !== '') {
        updateData.exitPrice = parseFloat(exitPrice);
      }
      if (exitReason !== '') {
        updateData.exitReason = exitReason;
      }
      if (pnl !== '') {
        updateData.pnl = parseFloat(pnl);
      }

      // If trade is open and we're adding exit data, close it
      if (trade.status === 'open' && (updateData.exitPrice || updateData.pnl)) {
        updateData.status = 'closed';
      }

      const response = await fetch(`/api/trades/${trade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update trade');
      }

      setShowEditModal(false);
      // Trigger a refresh by calling onEdit if provided, otherwise reload
      if (onEdit) {
        await onEdit(trade.id, updateData);
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error editing trade:', error);
      alert('Failed to update trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOpenTrade = trade.status === 'open';
  const isClosedTrade = trade.status === 'closed';

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#2a2a2a] border border-[#333] text-white rounded text-xs font-medium transition-colors"
          title="Actions"
        >
          <MoreVertical className="w-3 h-3" />
          Actions
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-40 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-lg z-50">
            {isOpenTrade && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCompleteModal(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-400 hover:bg-[#2a2a2a] transition-colors rounded-t-lg"
              >
                <CheckCircle className="w-3 h-3" />
                Complete Trade
              </button>
            )}
            {isClosedTrade && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  openEditModal();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-[#2a2a2a] transition-colors rounded-t-lg"
              >
                <Pencil className="w-3 h-3" />
                Edit Trade
              </button>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-[#2a2a2a] transition-colors rounded-b-lg"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Complete Trade Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowCompleteModal(false)}>
          <div className="bg-[#111111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Complete Trade</h2>

            <div className="space-y-4">
              {/* Trade Info */}
              <div className="bg-[#1a1a1a] rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Ticker:</span>
                  <span className="text-white font-medium">{trade.ticker}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Direction:</span>
                  <span className={trade.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}>
                    {trade.direction?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Entry Price:</span>
                  <span className="text-cyan-400">${trade.entryPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity:</span>
                  <span className="text-white">{trade.quantity || 1}</span>
                </div>
              </div>

              {/* Exit Reason */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Exit Reason</label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="take_profit">Take Profit</option>
                  <option value="stop_loss">Stop Loss</option>
                  <option value="manual">Manual Close</option>
                  <option value="breakeven">Breakeven</option>
                </select>
              </div>

              {/* Exit Price */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Exit Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="Enter exit price"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* P&L */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">P&L ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value)}
                  placeholder="Enter P&L (auto-calculated from exit price)"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  P&L is auto-calculated when you enter exit price. You can override it manually.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting || !exitPrice || !pnl}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Completing...' : 'Complete Trade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trade Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div className="bg-[#111111] border border-[#333] rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold text-white mb-4">Edit Trade</h2>

            <div className="space-y-4">
              {/* Trade Info */}
              <div className="bg-[#1a1a1a] rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Ticker:</span>
                  <span className="text-white font-medium">{trade.ticker}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Direction:</span>
                  <span className={trade.direction === 'long' ? 'text-emerald-400' : 'text-red-400'}>
                    {trade.direction?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Entry Price:</span>
                  <span className="text-cyan-400">${trade.entryPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Quantity:</span>
                  <span className="text-white">{trade.quantity || 1}</span>
                </div>
              </div>

              {/* Exit Reason */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Exit Reason</label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                >
                  <option value="take_profit">Take Profit</option>
                  <option value="stop_loss">Stop Loss</option>
                  <option value="manual">Manual Close</option>
                  <option value="breakeven">Breakeven</option>
                </select>
              </div>

              {/* Exit Price */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Exit Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  placeholder="Enter exit price"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* P&L */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">P&L ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value)}
                  placeholder="Enter P&L"
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary/50"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white rounded-lg text-sm hover:bg-[#2a2a2a] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
