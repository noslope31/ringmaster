import { useState, useMemo } from 'react';
import { Image as ImageIcon, ArrowLeft, Edit2, Check, X, Trash2 } from 'lucide-react';
import { getDisplayValues } from '../utils/helpers';

const sortSizes = (a, b) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return String(a).localeCompare(String(b));
};

const emptyEditForm = {
  size: '', quantity: 0, sales: 0, returns: 0, unitCost: 0, unitCostAfterTax: 0,
  unitPrice: 0, returnedPrice: 0, returnStatus: '', remark: '', orderDate: '', deliveryDate: ''
};

export default function RingGallery({ items, setItems }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedRing, setSelectedRing] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditForm({
      size: item.size || '', quantity: item.quantity || 0, sales: item.sales || 0, returns: item.returns || 0,
      unitCost: item.unitCost || 0, unitCostAfterTax: item.unitCostAfterTax || 0, unitPrice: item.unitPrice || 0,
      returnedPrice: item.returnedPrice || 0, returnStatus: item.returnStatus || '', remark: item.remark || '',
      orderDate: item.orderDate || '', deliveryDate: item.deliveryDate || ''
    });
  };

  const handleEditCostChange = (e) => {
    const val = e.target.value;
    const numVal = val === '' ? '' : Number(val);
    const afterTax = val === '' ? '' : Number((numVal * 1.12).toFixed(2));
    setEditForm({ ...editForm, unitCost: numVal, unitCostAfterTax: afterTax });
  };

  const saveEdit = (id) => {
    setItems(items.map(item => item.id === id ? {
      ...item,
      size: editForm.size,
      quantity: Number(editForm.quantity) || 0,
      sales: Number(editForm.sales) || 0,
      returns: Number(editForm.returns) || 0,
      unitCost: Number(editForm.unitCost) || 0,
      unitCostAfterTax: Number(editForm.unitCostAfterTax) || 0,
      unitPrice: Number(editForm.unitPrice) || 0,
      returnedPrice: Number(editForm.returnedPrice) || 0,
      returnStatus: editForm.returnStatus,
      remark: editForm.remark,
      orderDate: editForm.orderDate,
      deliveryDate: editForm.deliveryDate
    } : item));
    setEditingItemId(null);
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this record? This cannot be undone.')) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const ringsByName = useMemo(() => {
    const map = new Map();

    items.forEach(item => {
      if (!item.name) return;
      if (!map.has(item.name)) {
        map.set(item.name, { name: item.name, imageUrl: item.imageUrl || '', sizes: new Map() });
      }
      const ring = map.get(item.name);
      if (!ring.imageUrl && item.imageUrl) ring.imageUrl = item.imageUrl;

      const sizeKey = item.size || '-';
      if (!ring.sizes.has(sizeKey)) {
        ring.sizes.set(sizeKey, { size: sizeKey, inventory: 0, costTaxQ: 0, stockIn: 0, stockOut: 0, revenue: 0, profit: 0 });
      }
      const sizeGroup = ring.sizes.get(sizeKey);
      const display = getDisplayValues(item);
      sizeGroup.inventory += display.inventory;

      const stockIn = item.quantity || 0;
      const stockOut = item.sales || 0;
      if (!item.isReturnRecord) sizeGroup.stockIn += stockIn;
      sizeGroup.stockOut += stockOut;

      const costTaxQ = item.isReturnRecord ? 0 : (item.unitCostAfterTax || 0) * stockIn;
      sizeGroup.costTaxQ += costTaxQ;

      const priceQ = (item.unitPrice || 0) * stockOut;
      sizeGroup.revenue += priceQ;

      const returnedTotal = (item.returnedPrice || 0) * (item.returns || 0);
      const actualReturnedTotal = (item.returnStatus === 'Returned' || item.returnStatus === 'Return in progress') ? returnedTotal : 0;
      sizeGroup.profit += (priceQ - costTaxQ + actualReturnedTotal);
    });

    return map;
  }, [items]);

  const allSizes = useMemo(() => {
    const set = new Set();
    ringsByName.forEach(ring => ring.sizes.forEach((_, size) => set.add(size)));
    return Array.from(set).sort(sortSizes);
  }, [ringsByName]);

  const totalInventoryFor = (ring) => Array.from(ring.sizes.values()).reduce((sum, s) => sum + s.inventory, 0);

  const ringList = useMemo(() => {
    let list = Array.from(ringsByName.values());
    if (selectedSize) {
      list = list.filter(ring => ring.sizes.has(selectedSize) && ring.sizes.get(selectedSize).inventory > 0);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [ringsByName, selectedSize]);

  // --- Detail view for a single ring ---
  if (selectedRing && ringsByName.has(selectedRing)) {
    const ring = ringsByName.get(selectedRing);
    const sizesSorted = Array.from(ring.sizes.values()).sort((a, b) => sortSizes(a.size, b.size));
    const relatedItems = [...items]
      .filter(i => i.name === selectedRing)
      .sort((a, b) => new Date(b.orderDate || 0) - new Date(a.orderDate || 0));

    return (
      <div className="glass-panel p-6 animate-fade-in">
        <button className="btn btn-outline text-xs mb-4 flex items-center gap-2" onClick={() => setSelectedRing(null)}>
          <ArrowLeft size={14} /> Back to Gallery
        </button>

        <div className="flex items-center gap-4 mb-6">
          {ring.imageUrl ? (
            <img src={ring.imageUrl} alt={ring.name} className="w-20 h-20 object-cover rounded border border-white/20 shadow-sm flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded border border-dashed border-white/20 flex items-center justify-center text-muted flex-shrink-0">
              <ImageIcon size={22} />
            </div>
          )}
          <h2 className="text-2xl font-bold break-words">{ring.name}</h2>
        </div>

        <h3 className="text-xs font-semibold mb-2 text-secondary uppercase tracking-wider">Sizes &amp; Inventory</h3>
        <div className="table-container mb-8">
          <table className="data-table">
            <thead>
              <tr>
                <th>Size</th>
                <th className="text-warning">Inventory</th>
                <th className="text-purple-400">Avg Cost+Tax</th>
                <th className="text-blue-400">Avg Sale Price</th>
                <th className="text-blue-400">Profit</th>
              </tr>
            </thead>
            <tbody>
              {sizesSorted.map(s => (
                <tr key={s.size} className={s.inventory > 0 ? "bg-white/5" : ""}>
                  <td className="font-bold text-center">{s.size}</td>
                  <td className={`text-center font-bold ${s.inventory > 0 ? 'text-gold' : 'text-muted'}`}>{s.inventory}</td>
                  <td>{s.stockIn > 0 ? (s.costTaxQ / s.stockIn).toFixed(2) : '-'}</td>
                  <td className="text-center">{s.stockOut > 0 ? (s.revenue / s.stockOut).toFixed(2) : '-'}</td>
                  <td>{s.profit.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3 className="text-xs font-semibold mb-2 text-secondary uppercase tracking-wider">Order History</h3>
        <div className="table-container">
          <table className="data-table text-sm">
            <thead>
              <tr>
                <th>Size</th>
                <th>Stock-In</th>
                <th>Stock-Out</th>
                <th className="text-purple-400">Cost</th>
                <th className="text-purple-400">Cost+Tax</th>
                <th className="text-blue-400">Unit Price</th>
                <th>Return Status</th>
                <th>Remark</th>
                <th>Date</th>
                <th>Delivery Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {relatedItems.length === 0 ? (
                <tr><td colSpan="11" className="text-center py-6 text-muted">No records found.</td></tr>
              ) : relatedItems.map(item => {
                const isEditing = editingItemId === item.id;
                return (
                  <tr key={item.id} onKeyDown={(e) => { if (e.key === 'Enter' && isEditing) saveEdit(item.id); }}>
                    <td className="font-bold text-center">
                      {isEditing ? (
                        <input type="text" className="input-field py-1 px-2 w-16 text-xs text-center" value={editForm.size} onChange={e => setEditForm({ ...editForm, size: e.target.value })} />
                      ) : (item.size || '-')}
                    </td>
                    <td className="text-center">
                      {isEditing ? (
                        <input type="number" min="0" className="input-field py-1 px-2 w-16 text-xs text-center" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} />
                      ) : (item.quantity || 0)}
                    </td>
                    <td className="text-center">
                      {isEditing ? (
                        <input type="number" min="0" className="input-field py-1 px-2 w-16 text-xs text-center" value={editForm.sales} onChange={e => setEditForm({ ...editForm, sales: e.target.value })} />
                      ) : (item.sales || 0)}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="number" step="0.01" className="input-field py-1 px-2 w-20 text-xs" value={editForm.unitCost} onChange={handleEditCostChange} />
                      ) : (item.unitCost != null ? item.unitCost.toFixed(2) : '-')}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="number" step="0.01" className="input-field py-1 px-1 w-20 text-xs" value={editForm.unitCostAfterTax} onChange={e => setEditForm({ ...editForm, unitCostAfterTax: e.target.value })} />
                      ) : (item.unitCostAfterTax != null ? item.unitCostAfterTax.toFixed(2) : '-')}
                    </td>
                    <td className="text-center">
                      {isEditing ? (
                        <input type="number" step="0.01" className="input-field py-1 px-2 w-20 text-xs" value={editForm.unitPrice} onChange={e => setEditForm({ ...editForm, unitPrice: e.target.value })} />
                      ) : (item.unitPrice != null ? item.unitPrice.toFixed(2) : '-')}
                    </td>
                    <td>
                      {isEditing ? (
                        <select className="input-field py-1 px-1 text-xs" value={editForm.returnStatus} onChange={e => setEditForm({ ...editForm, returnStatus: e.target.value })}>
                          <option value="">-</option>
                          <option value="Return in progress">In progress</option>
                          <option value="Returned">Returned</option>
                          <option value="No Return">No Return</option>
                        </select>
                      ) : (item.returnStatus || '-')}
                    </td>
                    <td>
                      {isEditing ? (
                        <input type="text" className="input-field py-1 px-2 w-full text-xs" value={editForm.remark} onChange={e => setEditForm({ ...editForm, remark: e.target.value })} placeholder="Remark" />
                      ) : (
                        <span className="text-xs text-muted max-w-[150px] break-words block" title={item.remark}>{item.remark || '-'}</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap">
                      {isEditing ? (
                        <input type="date" className="input-field py-1 px-2 w-[130px] text-xs" value={editForm.orderDate} onChange={e => setEditForm({ ...editForm, orderDate: e.target.value })} />
                      ) : (item.orderDate || '-')}
                    </td>
                    <td className="whitespace-nowrap">
                      {isEditing ? (
                        <input type="date" className="input-field py-1 px-2 w-[130px] text-xs" value={editForm.deliveryDate} onChange={e => setEditForm({ ...editForm, deliveryDate: e.target.value })} />
                      ) : (item.deliveryDate || '-')}
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {isEditing ? (
                          <>
                            <button className="btn btn-primary p-1" onClick={() => saveEdit(item.id)} title="Save changes">
                              <Check size={14} />
                            </button>
                            <button className="btn btn-outline p-1" onClick={() => setEditingItemId(null)} title="Cancel">
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-outline p-1" onClick={() => startEdit(item)} title="Edit Record">
                              <Edit2 size={14} />
                            </button>
                            <button className="btn btn-danger btn-outline p-1" onClick={() => handleDeleteItem(item.id)} title="Delete Record">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- Main gallery grid ---
  return (
    <div className="glass-panel p-6 animate-fade-in">
      <h2 className="text-xl font-bold mb-4">Ring Gallery</h2>

      <div className="mb-6">
        <p className="text-[10px] text-secondary uppercase tracking-wider mb-2">Filter by Size</p>
        <div className="flex flex-wrap gap-2">
          <button
            className={`btn text-xs py-1 px-3 ${!selectedSize ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setSelectedSize(null)}
          >
            All
          </button>
          {allSizes.map(size => (
            <button
              key={size}
              className={`btn text-xs py-1 px-3 ${selectedSize === size ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setSelectedSize(selectedSize === size ? null : size)}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {ringList.length === 0 ? (
        <p className="text-center text-muted py-8">No rings found{selectedSize ? ` available in size ${selectedSize}` : ''}.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {ringList.map(ring => {
            const totalInv = totalInventoryFor(ring);
            const sizesSorted = Array.from(ring.sizes.values()).sort((a, b) => sortSizes(a.size, b.size));
            const totalSold = sizesSorted.reduce((sum, s) => sum + s.stockOut, 0);
            return (
              <button
                key={ring.name}
                className="glass-panel p-2.5 flex flex-col items-center gap-1 hover:border-gold/40 transition-colors text-center"
                onClick={() => setSelectedRing(ring.name)}
              >
                {ring.imageUrl ? (
                  <img src={ring.imageUrl} alt={ring.name} className="w-full aspect-square object-cover rounded border border-white/10" />
                ) : (
                  <div className="w-full aspect-square rounded border border-dashed border-white/20 flex items-center justify-center text-muted">
                    <ImageIcon size={24} />
                  </div>
                )}
                <span className="text-xs font-semibold leading-tight break-words w-full">{ring.name}</span>
                <div className="flex items-center justify-center gap-1 text-[9px] uppercase tracking-wider leading-none">
                  <span className={`font-bold ${totalInv > 0 ? 'text-gold' : 'text-muted'}`}>{totalInv} in stock</span>
                  <span className="text-muted">·</span>
                  <span className="font-bold text-blue-400">{totalSold} sold</span>
                </div>
                <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 w-full leading-none">
                  {sizesSorted.map(s => (
                    <span key={s.size} className={`text-[9px] ${s.inventory > 0 ? 'text-gold' : 'text-muted'}`}>
                      {s.size}:{s.inventory}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
