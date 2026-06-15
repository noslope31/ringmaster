import React, { useState } from 'react';
import { Image as ImageIcon, Edit2, Check, X } from 'lucide-react';
import { compressImage, getDisplayValues } from '../utils/helpers';

export default function StockTable({ items, setItems }) {
  const [editingName, setEditingName] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', imageUrl: '' });

  const startEdit = (originalName, currentImageUrl) => {
    setEditingName(originalName);
    setEditForm({ name: originalName, imageUrl: currentImageUrl || '' });
  };

  const saveEdit = () => {
    setItems(items.map(item => {
      if (item.name === editingName) {
        return { ...item, name: editForm.name, imageUrl: editForm.imageUrl };
      }
      return item;
    }));
    setEditingName(null);
  };

  // Aggregate logic: Group by Name + Size
  const aggregatedData = {};

  items.forEach(item => {
    // Treat items with no size as a distinct group for that name
    const key = `${item.name}___${item.size || 'NO_SIZE'}`;
    
    if (!aggregatedData[key]) {
      aggregatedData[key] = {
        name: item.name,
        size: item.size || '-',
        imageUrl: item.imageUrl || '',
        totalStockIn: 0,
        totalStockOut: 0,
        totalReturns: 0,
        totalInventory: 0,
        totalCostTaxQ: 0, // for weighted average cost
        totalRevenue: 0, // for average sale price
        totalProfit: 0,
        remarks: new Set()
      };
    }

    const group = aggregatedData[key];
    const stockIn = item.quantity || 0;
    const stockOut = item.sales || 0;
    const returns = item.returns || 0;
    
    const display = getDisplayValues(item);
    group.totalInventory += display.inventory;

    const costTaxQ = item.isReturnRecord ? 0 : (item.unitCostAfterTax || 0) * stockIn;
    group.totalCostTaxQ += costTaxQ;
    
    if (!item.isReturnRecord) {
      group.totalStockIn += stockIn;
    }
    group.totalStockOut += stockOut;
    group.totalReturns += returns;
    
    const priceQ = (item.unitPrice || 0) * stockOut;
    group.totalRevenue += priceQ;
    
    const returnedTotal = (item.returnedPrice || 0) * (item.returns || 0);
    const actualReturnedTotal = (item.returnStatus === 'Returned' || item.returnStatus === 'Return in progress') ? returnedTotal : 0;
    group.totalProfit += (priceQ - costTaxQ + actualReturnedTotal);

    if (item.remark && item.remark.trim() !== '') {
      group.remarks.add(item.remark.trim());
    }
    
    // If an image wasn't set yet but we found one, use it
    if (!group.imageUrl && item.imageUrl) {
      group.imageUrl = item.imageUrl;
    }
  });

  const sortedGroups = Object.values(aggregatedData).sort((a, b) => {
    // Sort by name first
    const nameCompare = a.name.localeCompare(b.name);
    if (nameCompare !== 0) return nameCompare;
    // Then sort by size
    const numA = parseFloat(a.size);
    const numB = parseFloat(b.size);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(a.size).localeCompare(String(b.size));
  });

  // Calculate Grand Totals
  let grandTotalInventory = 0;
  let grandTotalCost = 0;
  let grandTotalStockIn = 0;
  let grandTotalStockOut = 0;
  let grandTotalRevenue = 0;
  let grandTotalProfit = 0;

  return (
    <div className="glass-panel p-6 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Current Stock (Aggregated)
        </h2>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ring Name</th>
              <th>Size</th>
              <th className="text-warning">Total Inventory</th>
              <th className="text-purple-400">Avg Cost+Tax</th>
              <th className="text-blue-400">Avg Sale Price</th>
              <th className="text-blue-400">Total Profit</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {sortedGroups.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-muted">No stock data available.</td>
              </tr>
            ) : (
              <>
                {sortedGroups.map((group, index) => {
                  const inventory = group.totalInventory;
                  const avgCost = group.totalStockIn > 0 ? (group.totalCostTaxQ / group.totalStockIn) : 0;
                  const avgPrice = group.totalStockOut > 0 ? (group.totalRevenue / group.totalStockOut) : 0;
                  
                  grandTotalInventory += inventory;
                  grandTotalCost += group.totalCostTaxQ;
                  // We also need grandTotalStockIn and grandTotalStockOut for grand averages
                  grandTotalStockIn += group.totalStockIn;
                  grandTotalStockOut += group.totalStockOut;
                  grandTotalRevenue += group.totalRevenue;
                  grandTotalProfit += group.totalProfit;

                  // To group ring names visually like InventoryTable, we check if previous row had same name
                  const showNameAndImage = index === 0 || sortedGroups[index - 1].name !== group.name;
                  
                  // Calculate how many rows this name spans
                  let rowSpan = 1;
                  if (showNameAndImage) {
                    for (let i = index + 1; i < sortedGroups.length; i++) {
                      if (sortedGroups[i].name === group.name) rowSpan++;
                      else break;
                    }
                  }

                  return (
                    <tr key={`${group.name}-${group.size}`} className={inventory > 0 ? "bg-white/5" : ""}>
                      {showNameAndImage && (
                        <td rowSpan={rowSpan} className="font-bold border-r border-white/10 align-top bg-black/20" style={{ padding: '0.5rem', minWidth: '100px', maxWidth: '120px' }}>
                          {editingName === group.name ? (
                            <div className="flex flex-col items-center justify-start h-full gap-2">
                              <label className="relative cursor-pointer group flex flex-col items-center w-full">
                                {editForm.imageUrl ? (
                                  <>
                                    <img src={editForm.imageUrl} alt="Ring" className="w-14 h-14 object-cover rounded border border-white/20 shadow-sm group-hover:opacity-50 transition-opacity flex-shrink-0" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Edit2 size={14} className="text-white" />
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-14 h-14 rounded border border-dashed border-white/20 flex flex-col items-center justify-center hover:bg-white/5 hover:border-white/40 transition-colors text-muted hover:text-white" title="Add Photo">
                                    <ImageIcon size={14} className="mb-1" />
                                    <span className="text-[9px]">Add Photo</span>
                                  </div>
                                )}
                                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (file) {
                                    try {
                                      const compressed = await compressImage(file);
                                      setEditForm({...editForm, imageUrl: compressed});
                                    } catch (err) {
                                      console.error("Failed to compress image", err);
                                    }
                                  }
                                }} />
                              </label>
                              <input 
                                type="text" 
                                className="input-field py-1 px-2 w-full text-center text-xs" 
                                value={editForm.name} 
                                onChange={e => setEditForm({...editForm, name: e.target.value})} 
                                autoFocus
                              />
                              <div className="flex gap-1 mt-1">
                                <button className="btn btn-primary p-1" onClick={saveEdit} title="Save changes">
                                  <Check size={14} />
                                </button>
                                <button className="btn btn-outline p-1" onClick={() => setEditingName(null)} title="Cancel">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-start h-full gap-2 relative group w-full">
                              <button 
                                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-white transition-opacity bg-black/60 rounded-full z-10"
                                onClick={() => startEdit(group.name, group.imageUrl)}
                                title="Edit Ring Details"
                              >
                                <Edit2 size={12} />
                              </button>
                              {group.imageUrl ? (
                                <img src={group.imageUrl} alt="Ring" className="w-14 h-14 object-cover rounded border border-white/20 shadow-sm flex-shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded border border-dashed border-white/20 flex flex-col items-center justify-center text-muted">
                                  <ImageIcon size={14} className="mb-1" />
                                  <span className="text-[9px]">No Photo</span>
                                </div>
                              )}
                              <span className="text-xs text-center leading-tight break-words w-full">
                                {group.name}
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                      <td className="font-bold text-center">{group.size}</td>
                      <td className={`text-center font-bold ${inventory > 0 ? 'text-gold' : 'text-muted'}`}>{inventory}</td>
                      <td>{avgCost ? avgCost.toFixed(2) : '-'}</td>
                      <td className="text-center">{avgPrice ? avgPrice.toFixed(2) : '-'}</td>
                      <td>{group.totalProfit ? group.totalProfit.toFixed(2) : '0.00'}</td>
                      <td>
                        <span className="text-xs text-muted max-w-[200px] block break-words">
                          {Array.from(group.remarks).join(' | ') || '-'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-blue-600/20 font-bold text-blue-200">
                  <td colSpan="2" className="text-center py-3">Total Grand Stock</td>
                  <td className="text-center">{grandTotalInventory}</td>
                  <td>{grandTotalStockIn > 0 ? (grandTotalCost / grandTotalStockIn).toFixed(2) : '-'}</td>
                  <td className="text-center">{grandTotalStockOut > 0 ? (grandTotalRevenue / grandTotalStockOut).toFixed(2) : '-'}</td>
                  <td>{grandTotalProfit.toFixed(2)}</td>
                  <td></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
