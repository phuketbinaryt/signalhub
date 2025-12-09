'use client';

import { useState } from 'react';

interface Trade {
  id: number;
  ticker: string;
  direction: string;
  entryPrice: number;
  takeProfit?: number | null;
  stopLoss?: number | null;
  quantity: number;
  status: string;
  openedAt: string;
  closedAt?: string | null;
  exitPrice?: number | null;
  exitReason?: string | null;
  pnl?: number | null;
  pnlPercent?: number | null;
}

interface TradeTableProps {
  trades: Trade[];
  onTradeUpdate?: () => void;
}

export default function TradeTable({ trades, onTradeUpdate }: TradeTableProps) {
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    exitPrice: '',
    exitReason: '',
    pnl: '',
  });

  const openEditModal = (trade: Trade) => {
    setEditingTrade(trade);
    setFormData({
      exitPrice: trade.exitPrice?.toString() || '',
      exitReason: trade.exitReason || '',
      pnl: trade.pnl?.toString() || '',
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTrade(null);
    setFormData({ exitPrice: '', exitReason: '', pnl: '' });
  };

  const handleSave = async () => {
    if (!editingTrade) return;

    setIsSaving(true);
    try {
      const updateData: any = {};

      if (formData.exitPrice !== '') {
        updateData.exitPrice = parseFloat(formData.exitPrice);
      }
      if (formData.exitReason !== '') {
        updateData.exitReason = formData.exitReason;
      }
      if (formData.pnl !== '') {
        updateData.pnl = parseFloat(formData.pnl);
      }

      const response = await fetch(`/api/trades/${editingTrade.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error('Failed to update trade');
      }

      closeModal();
      onTradeUpdate?.();
    } catch (error) {
      console.error('Error updating trade:', error);
      alert('Failed to update trade');
    } finally {
      setIsSaving(false);
    }
  };

  if (trades.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Recent Trades</h2>
        <p className="text-gray-500 text-center py-8">No trades to display</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Recent Trades</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticker
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Direction
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Qty
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entry
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  TP
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SL
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Exit
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  P&L %
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {trades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50">
                  <td className="px-3 py-3 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{trade.ticker}</div>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        trade.direction === 'long'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {trade.direction.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trade.quantity}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    ${trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trade.takeProfit ? `$${trade.takeProfit.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trade.stopLoss ? `$${trade.stopLoss.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {trade.exitPrice ? `$${trade.exitPrice.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {trade.exitReason ? (
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          trade.exitReason === 'take_profit'
                            ? 'bg-green-100 text-green-800'
                            : trade.exitReason === 'stop_loss'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {trade.exitReason === 'take_profit' ? 'TP' : trade.exitReason === 'stop_loss' ? 'SL' : trade.exitReason.toUpperCase()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {trade.pnl !== null && trade.pnl !== undefined ? (
                      <span
                        className={`text-sm font-medium ${
                          trade.pnl > 0
                            ? 'text-green-600'
                            : trade.pnl < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        ${trade.pnl.toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {trade.pnlPercent !== null && trade.pnlPercent !== undefined ? (
                      <span
                        className={`text-sm font-medium ${
                          trade.pnlPercent > 0
                            ? 'text-green-600'
                            : trade.pnlPercent < 0
                            ? 'text-red-600'
                            : 'text-gray-500'
                        }`}
                      >
                        {trade.pnlPercent > 0 ? '+' : ''}
                        {trade.pnlPercent.toFixed(2)}%
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(trade.openedAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(trade)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isModalOpen && editingTrade && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Edit Trade #{editingTrade.id} - {editingTrade.ticker}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exit Price
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.exitPrice}
                  onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter exit price"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exit Reason
                </label>
                <select
                  value={formData.exitReason}
                  onChange={(e) => setFormData({ ...formData, exitReason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select reason</option>
                  <option value="take_profit">Take Profit</option>
                  <option value="stop_loss">Stop Loss</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  P&L ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pnl}
                  onChange={(e) => setFormData({ ...formData, pnl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter P&L"
                />
              </div>

              <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                <p><strong>Entry:</strong> ${editingTrade.entryPrice.toFixed(2)}</p>
                <p><strong>Direction:</strong> {editingTrade.direction.toUpperCase()}</p>
                <p><strong>Quantity:</strong> {editingTrade.quantity}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
