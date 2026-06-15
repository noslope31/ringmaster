import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Edit2, AlertCircle, Check, X, ShoppingCart, Image as ImageIcon, Undo2, PackageSearch, ListOrdered, ChevronUp, ChevronDown } from 'lucide-react';
import { calculateRevenue, calculateNetProfit, getReturnDeadlineInfo, compressImage, getDisplayValues } from '../utils/helpers';
import { format, addDays } from 'date-fns';

export default function InventoryTable({ items, setItems, logs, setLogs }) {
  const [isAdding, setIsAdding] = useState(false);
  const [isReturningGlobal, setIsReturningGlobal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({ 
    sales: 0, returns: 0, unitPrice: 0, remark: '', returnedPrice: 0, returnStatus: '',
    size: '', quantity: 0, unitCost: 0, unitCostAfterTax: 0, orderDate: '', deliveryDate: ''
  });

  // Data Repair: Fix corrupted date strings that were saved during the timezone bug
  useMemo(() => {
    let changed = false;
    const repairedItems = items.map(item => {
      let newItem = { ...item };
      let itemChanged = false;

      ['orderDate', 'deliveryDate'].forEach(key => {
        const val = item[key];
        // If it looks like "May 10, 2026"
        if (val && typeof val === 'string' && val.includes(',') && !val.includes('-')) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            newItem[key] = `${yyyy}-${mm}-${dd}`;
            itemChanged = true;
            changed = true;
          }
        }
      });

      return itemChanged ? newItem : item;
    });

    if (changed) {
      // Use a timeout to avoid updating during render
      setTimeout(() => setItems(repairedItems), 0);
    }
  }, [items, setItems]);
  const [sellingItemId, setSellingItemId] = useState(null);
  const [sellForm, setSellForm] = useState({ qty: 1, price: 0 });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [editingRingName, setEditingRingName] = useState(null);
  const [editRingNameForm, setEditRingNameForm] = useState('');
  const [filters, setFilters] = useState({
    name: [], size: [], quantity: [], sales: [], returns: [], inventory: [],
    unitCost: [], unitCostAfterTax: [], unitPrice: [], priceQ: [], 
    returnedPrice: [], returnedTotal: [], profit: [],
    orderDate: [], deliveryDate: [], returnStatus: [], remark: []
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const startRingNameEdit = (originalName) => {
    setEditingRingName(originalName);
    setEditRingNameForm(originalName);
  };

  const saveRingNameEdit = () => {
    setItems(items.map(item => {
      if (item.name === editingRingName) {
        return { ...item, name: editRingNameForm };
      }
      return item;
    }));
    setEditingRingName(null);
  };

  const [orderData, setOrderData] = useState({
    orderDate: '',
    deliveryDate: ''
  });

  const [returnOrderData, setReturnOrderData] = useState({
    returnDate: '',
    deliveryDate: ''
  });

  const emptySizeEntry = () => ({ id: uuidv4(), size: '', quantity: 1, unitCost: '', unitCostAfterTax: '', remark: '' });

  const emptyRingEntry = () => ({
    id: uuidv4(),
    name: '',
    imageUrl: '',
    sizes: [emptySizeEntry()]
  });

  const [rings, setRings] = useState([emptyRingEntry()]);
  const [returnRings, setReturnRings] = useState([emptyRingEntry()]);

  const handleOrderDateChange = (e) => {
    setOrderData({ ...orderData, [e.target.name]: e.target.value });
  };

  const handleReturnDateChange = (e) => {
    setReturnOrderData({ ...returnOrderData, [e.target.name]: e.target.value });
  };

  const handleRingChange = (id, field, value) => {
    setRings(rings.map(ring => {
      if (ring.id === id) {
        return { ...ring, [field]: value };
      }
      return ring;
    }));
  };

  const existingUniqueRings = items.reduce((acc, item) => {
    if (item.name) {
      const existing = acc.find(r => r.name === item.name);
      if (!existing) {
        acc.push({ name: item.name, imageUrl: item.imageUrl });
      } else if (!existing.imageUrl && item.imageUrl) {
        existing.imageUrl = item.imageUrl;
      }
    }
    return acc;
  }, []);

  const handleRingNameChange = (id, newName) => {
    setRings(rings.map(ring => {
      if (ring.id === id) {
        const updated = { ...ring, name: newName };
        const existingRing = existingUniqueRings.find(r => r.name === newName);
        if (existingRing && existingRing.imageUrl) {
          updated.imageUrl = existingRing.imageUrl;
        }
        return updated;
      }
      return ring;
    }));
  };

  const handleSizeChange = (ringId, sizeId, field, value, isReturn = false) => {
    const ringList = isReturn ? returnRings : rings;
    const setRingList = isReturn ? setReturnRings : setRings;

    setRingList(ringList.map(ring => {
      if (ring.id === ringId) {
        return {
          ...ring,
          sizes: ring.sizes.map(s => {
            if (s.id === sizeId) {
              const processedValue = ['quantity', 'unitCost', 'unitCostAfterTax', 'returnedPrice'].includes(field)
                ? (value === '' ? '' : Number(value)) : value;
                
              const updatedSize = { ...s, [field]: processedValue };
              
              if (field === 'unitCost' && value !== '') {
                 updatedSize.unitCostAfterTax = Number((Number(value) * 1.12).toFixed(2));
              } else if (field === 'unitCost' && value === '') {
                 updatedSize.unitCostAfterTax = '';
              }
              
              return updatedSize;
            }
            return s;
          })
        };
      }
      return ring;
    }));
  };

  const uniqueValues = useMemo(() => {
    const values = {
      name: new Set(), size: new Set(), quantity: new Set(), sales: new Set(), returns: new Set(), inventory: new Set(),
      unitCost: new Set(), unitCostAfterTax: new Set(), unitPrice: new Set(), priceQ: new Set(), 
      returnedPrice: new Set(), returnedTotal: new Set(), profit: new Set(),
      orderDate: new Set(), deliveryDate: new Set(), returnStatus: new Set(), remark: new Set()
    };

    items.forEach(item => {
      const display = getDisplayValues(item);
      Object.keys(values).forEach(key => {
        const val = display[key];
        if (val !== undefined && val !== null && val !== '') {
          values[key].add(String(val));
        }
      });
    });

    const sortedValues = {};
    Object.entries(values).forEach(([key, set]) => {
      const arr = Array.from(set);
      if (['quantity', 'sales', 'returns', 'inventory', 'unitCost', 'unitCostAfterTax', 'unitPrice', 'priceQ', 'returnedPrice', 'returnedTotal', 'profit'].includes(key)) {
        arr.sort((a, b) => Number(a) - Number(b));
      } else {
        arr.sort();
      }
      sortedValues[key] = arr;
    });
    return sortedValues;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const display = getDisplayValues(item);
      return Object.entries(filters).every(([key, selectedValues]) => {
        if (!selectedValues || selectedValues.length === 0) return true;
        const itemValue = String(display[key] || '');
        return selectedValues.includes(itemValue);
      });
    });
  }, [items, filters]);

  const handleFilterToggle = (key, value) => {
    setFilters(prev => {
      const current = prev[key] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      name: [], size: [], quantity: [], sales: [], returns: [], inventory: [],
      unitCost: [], unitCostAfterTax: [], unitPrice: [], priceQ: [], 
      returnedPrice: [], returnedTotal: [], profit: [],
      orderDate: [], deliveryDate: [], returnStatus: [], remark: []
    });
  };

  const handleImageUpload = async (ringId, file) => {
    if (!file) return;
    try {
      const compressedDataUrl = await compressImage(file);
      handleRingChange(ringId, 'imageUrl', compressedDataUrl);
    } catch (err) {
      console.error('Failed to compress image', err);
    }
  };

  const addRing = () => {
    setRings([...rings, emptyRingEntry()]);
  };

  const removeRing = (id) => {
    if (rings.length > 1) {
      setRings(rings.filter(r => r.id !== id));
    }
  };

  const addSizeToRing = (ringId) => {
    setRings(rings.map(ring => {
      if (ring.id === ringId) {
        return { ...ring, sizes: [...ring.sizes, emptySizeEntry()] };
      }
      return ring;
    }));
  };

  const removeSizeFromRing = (ringId, sizeId) => {
    setRings(rings.map(ring => {
      if (ring.id === ringId && ring.sizes.length > 1) {
        return { ...ring, sizes: ring.sizes.filter(s => s.id !== sizeId) };
      }
      return ring;
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newItems = rings.flatMap(ring => 
      ring.sizes.map(s => ({
        id: uuidv4(),
        orderDate: orderData.orderDate,
        deliveryDate: orderData.deliveryDate,
        name: ring.name,
        size: s.size,
        quantity: Number(s.quantity) || 0,
        unitCost: Number(s.unitCost) || 0,
        unitCostAfterTax: Number(s.unitCostAfterTax) || 0,
        unitPrice: 0,
        sales: 0,
        returns: 0,
        imageUrl: ring.imageUrl || '',
        remark: s.remark || '',
        returnStatus: ''
      }))
    );

    setItems([...newItems, ...items]);
    
    // Save to Submission Logs
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'Order',
      summary: `Order: ${rings.map(r => r.name).join(', ')}`,
      rawData: { orderData, rings }
    };
    setLogs(prev => [...prev, logEntry]);

    setIsAdding(false);
    setOrderData({ orderDate: '', deliveryDate: '' });
    setRings([emptyRingEntry()]);
  };

  const handleReturnSubmit = (e) => {
    e.preventDefault();
    const newReturnItems = returnRings.flatMap(ring => 
      ring.sizes.map(s => ({
        id: uuidv4(),
        orderDate: returnOrderData.returnDate,
        deliveryDate: returnOrderData.deliveryDate,
        name: ring.name,
        size: s.size,
        quantity: Number(s.quantity) || 0,
        unitCost: Number(s.unitCost) || 0,
        unitCostAfterTax: Number(s.unitCostAfterTax) || 0,
        unitPrice: 0,
        sales: 0,
        returns: Number(s.quantity) || 0,
        returnedPrice: Number(s.returnedPrice) || 0,
        imageUrl: ring.imageUrl || '',
        remark: s.remark || '',
        returnStatus: s.returnStatus || 'Return in progress',
        isReturnRecord: true
      }))
    );

    setItems([...newReturnItems, ...items]);

    // Save to Submission Logs
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'Return',
      summary: `Return: ${returnRings.map(r => r.name).join(', ')}`,
      rawData: { returnOrderData, returnRings }
    };
    setLogs(prev => [...prev, logEntry]);

    setIsReturningGlobal(false);
    setReturnOrderData({ returnDate: '', deliveryDate: '' });
    setReturnRings([emptyRingEntry()]);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record? This cannot be undone.')) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `ringmaster_inventory_${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (Array.isArray(importedData)) {
          if (window.confirm(`Found ${importedData.length} records. This will ADD them to your current inventory. Continue?`)) {
            setItems([...importedData, ...items]);
          }
        }
      } catch (err) {
        alert('Failed to import file. Please make sure it is a valid JSON backup.');
      }
    };
    reader.readAsText(file);
  };

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditForm({ 
      sales: item.sales || 0, returns: item.returns || 0, unitPrice: item.unitPrice || 0, remark: item.remark || '', returnedPrice: item.returnedPrice || 0, returnStatus: item.returnStatus || '',
      size: item.size || '', quantity: item.quantity || 0, unitCost: item.unitCost || 0, unitCostAfterTax: item.unitCostAfterTax || 0, orderDate: item.orderDate || '', deliveryDate: item.deliveryDate || ''
    });
  };

  const handleEditCostChange = (e) => {
    const val = e.target.value;
    const numVal = val === '' ? '' : Number(val);
    let afterTax = editForm.unitCostAfterTax;
    if (val !== '') {
      afterTax = Number((numVal * 1.12).toFixed(2));
    } else {
      afterTax = '';
    }
    setEditForm({ ...editForm, unitCost: numVal, unitCostAfterTax: afterTax });
  };

  const saveEdit = (id) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          sales: Number(editForm.sales) || 0,
          returns: Number(editForm.returns) || 0,
          returnedPrice: Number(editForm.returnedPrice) || 0,
          returnStatus: editForm.returnStatus,
          unitPrice: Number(editForm.unitPrice) || 0,
          remark: editForm.remark,
          size: editForm.size,
          quantity: Number(editForm.quantity) || 0,
          unitCost: Number(editForm.unitCost) || 0,
          unitCostAfterTax: Number(editForm.unitCostAfterTax) || 0,
          orderDate: editForm.orderDate,
          deliveryDate: editForm.deliveryDate
        };
      }
      return item;
    }));
    setEditingItemId(null);
  };

  const startSell = (item) => {
    setSellingItemId(item.id);
    setSellForm({ qty: 1, price: item.unitPrice || 0 });
  };

  const saveSell = (id) => {
    setItems(items.map(item => {
      if (item.id === id) {
        return {
          ...item,
          sales: (item.sales || 0) + (Number(sellForm.qty) || 0),
          unitPrice: Number(sellForm.price) || item.unitPrice || 0
        };
      }
      return item;
    }));
    setSellingItemId(null);
  };

  const startReturn = (item) => {
    setIsReturningGlobal(true);
    setReturnRings([{
      ...emptyRingEntry(),
      name: item.name,
      imageUrl: item.imageUrl,
      sizes: [{ ...emptySizeEntry(), size: item.size, quantity: 1, returnedPrice: item.unitCostAfterTax }]
    }]);
  };

  const getStatusBadge = (orderDateStr) => {
    const [y, m, d] = orderDateStr.split('-').map(Number);
    const orderDate = new Date(y, m - 1, d);
    if (isNaN(orderDate.getTime())) return null;
    const info = getReturnDeadlineInfo(orderDateStr);
    if (!info.deadline) return null;
    
    if (info.isOverdue) {
      return <span className="badge badge-danger">Overdue ({Math.abs(info.daysRemaining)}d ago)</span>;
    }
    if (info.isUrgent) {
      return <span className="badge badge-warning">Return soon ({info.daysRemaining}d left)</span>;
    }
    return <span className="badge badge-info">{info.daysRemaining}d to return</span>;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, 'MMM dd, yyyy');
  };

  const grandTotals = useMemo(() => {
    return filteredItems.reduce((acc, item) => {
      const display = getDisplayValues(item);
      acc.stockIn += display.quantity;
      acc.stockOut += (item.sales || 0);
      acc.returns += (item.returns || 0);
      acc.inventory += display.inventory;
      acc.costTaxQ += (item.isReturnRecord ? 0 : (item.unitCostAfterTax || 0) * (item.quantity || 0));
      acc.priceQ += display.priceQ;
      acc.returnedTotal += display.returnedTotal;
      acc.profit += display.profit;
      return acc;
    }, { stockIn: 0, stockOut: 0, returns: 0, inventory: 0, costTaxQ: 0, priceQ: 0, returnedTotal: 0, profit: 0 });
  }, [filteredItems]);

  const { stockIn: grandTotalStockIn, stockOut: grandTotalStockOut, returns: grandTotalReturn, inventory: grandTotalInventory, costTaxQ: grandTotalCostTaxQ, priceQ: grandTotalPriceQ, returnedTotal: grandTotalReturnedTotal, profit: grandTotalProfit } = grandTotals;

  const MultiSelectFilter = ({ columnKey, options, label }) => {
    const isOpen = activeDropdown === columnKey;
    const selected = filters[columnKey] || [];
    
    return (
      <div className="relative inline-block w-full">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(isOpen ? null : columnKey);
          }}
          className={`filter-dropdown-btn ${selected.length > 0 ? 'active' : ''}`}
        >
          <span className="truncate">{selected.length > 0 ? `${selected.length} selected` : 'All'}</span>
          <Plus size={10} className={`transform transition-transform ${isOpen ? 'rotate-45' : ''}`} />
        </button>
        
        {isOpen && (
          <div className="filter-dropdown-menu" onClick={e => e.stopPropagation()}>
            <div className="max-h-60 overflow-y-auto px-1 custom-scrollbar">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted">No values</div>
              ) : (
                options.map(opt => (
                  <label key={opt} className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded cursor-pointer transition-colors group">
                    <input 
                      type="checkbox" 
                      className="custom-checkbox" 
                      checked={selected.includes(opt)}
                      onChange={() => handleFilterToggle(columnKey, opt)}
                    />
                    <span className="text-xs text-white/80 group-hover:text-white truncate">
                      {columnKey === 'orderDate' || columnKey === 'deliveryDate' ? formatDate(opt) : opt}
                    </span>
                  </label>
                ))
              )}
            </div>
            {selected.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/10 px-2 flex justify-end">
                <button 
                  onClick={() => setFilters(prev => ({ ...prev, [columnKey]: [] }))}
                  className="text-[10px] text-gold hover:underline"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-panel p-6 animate-fade-in" onClick={() => setActiveDropdown(null)}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          Inventory Data
        </h2>
        <div className="flex gap-2">
          <label className="btn btn-outline border-white/10 text-xs py-1.5 flex items-center gap-2 cursor-pointer">
            <PackageSearch size={14} /> Import Backup
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={handleExport} className="btn btn-outline border-white/10 text-xs py-1.5 flex items-center gap-2">
            <ListOrdered size={14} /> Export Backup
          </button>
          <button className="btn btn-outline border-orange-400 text-orange-400 hover:bg-orange-400/10 text-xs py-1.5 flex items-center gap-2" onClick={() => setIsReturningGlobal(!isReturningGlobal)}>
            <Undo2 size={14} /> New Return
          </button>
          <button className="btn btn-primary text-xs py-1.5 flex items-center gap-2" onClick={() => setIsAdding(!isAdding)}>
            <Plus size={14} /> New Order
          </button>
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-8 p-6 bg-white/5 rounded-lg border border-white/10 animate-slide-down">
          <h3 className="text-lg font-semibold mb-4 text-gold">Order Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
            <div className="input-group">
              <label className="input-label">Order Date</label>
              <input type="date" name="orderDate" required value={orderData.orderDate} onChange={handleOrderDateChange} className="input-field bg-black/40" />
            </div>
            <div className="input-group">
              <label className="input-label">Delivery Date</label>
              <input type="date" name="deliveryDate" value={orderData.deliveryDate} onChange={handleOrderDateChange} className="input-field bg-black/40" />
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Rings in this Order</h3>
            <button type="button" className="btn btn-outline text-xs" onClick={addRing}>
              <Plus size={14} /> Add Ring
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {rings.map((ring, index) => (
              <div key={ring.id} className="p-4 bg-black/20 rounded-lg border border-white/5 relative">
                {rings.length > 1 && (
                  <button type="button" onClick={() => removeRing(ring.id)} className="absolute top-2 right-2 text-muted hover:text-danger">
                    <X size={16} />
                  </button>
                )}
                <div className="mb-4 flex gap-4 items-start">
                  {ring.imageUrl ? (
                    <div className="relative w-14 h-14 rounded border border-white/10 overflow-hidden flex-shrink-0 bg-black/40">
                      <img src={ring.imageUrl} alt="Ring preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRingChange(ring.id, 'imageUrl', '')} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:text-danger">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <label className="w-14 h-14 rounded border border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-white/40 flex-shrink-0 transition-colors text-muted hover:text-white group">
                      <ImageIcon size={14} className="mb-0.5" />
                      <span className="text-[8px] text-center px-0.5">Add Photo</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(ring.id, e.target.files[0])} />
                    </label>
                  )}
                  <div className="input-group flex-1 relative">
                    <label className="input-label text-xs">Ring Name / SKU</label>
                    <input 
                      required 
                      type="text" 
                      value={ring.name} 
                      onFocus={() => setActiveDropdown(ring.id)}
                      onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                      onChange={(e) => handleRingNameChange(ring.id, e.target.value)} 
                      className="input-field py-1.5" 
                      placeholder="Gold Signet" 
                    />
                    {activeDropdown === ring.id && existingUniqueRings.length > 0 && (
                      <div className="absolute top-[calc(100%+4px)] left-0 w-full max-h-48 overflow-y-auto bg-[#1a1a1a] border border-white/20 rounded shadow-xl z-50">
                        {existingUniqueRings.filter(r => r.name.toLowerCase().includes(ring.name.toLowerCase())).map(r => (
                          <div 
                            key={r.name} 
                            className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                            onMouseDown={(e) => {
                              // prevent onBlur from firing before click
                              e.preventDefault();
                              handleRingNameChange(ring.id, r.name);
                              setActiveDropdown(null);
                            }}
                          >
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt={r.name} className="w-8 h-8 object-cover rounded border border-white/10 flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 flex items-center justify-center bg-black/40 border border-white/10 rounded flex-shrink-0">
                                <ImageIcon size={14} className="text-muted" />
                              </div>
                            )}
                            <span className="text-sm truncate">{r.name}</span>
                          </div>
                        ))}
                        {existingUniqueRings.filter(r => r.name.toLowerCase().includes(ring.name.toLowerCase())).length === 0 && (
                          <div className="p-3 text-sm text-muted text-center">No existing matching rings</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="input-label text-xs font-semibold text-gold">Sizes, Quantities & Costs</label>
                    <button type="button" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1" onClick={() => addSizeToRing(ring.id)}>
                      <Plus size={12} /> Add Size
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {ring.sizes.map((s) => (
                      <div key={s.id} className="flex gap-2 items-end">
                        <div className="input-group mb-0 flex-1">
                          <input type="text" value={s.size} onChange={(e) => handleSizeChange(ring.id, s.id, 'size', e.target.value)} className="input-field py-1 text-sm" placeholder="Size" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" required min="1" value={s.quantity} onChange={(e) => handleSizeChange(ring.id, s.id, 'quantity', e.target.value)} className="input-field py-1 text-sm" placeholder="Qty" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" step="0.01" value={s.unitCost} onChange={(e) => handleSizeChange(ring.id, s.id, 'unitCost', e.target.value)} className="input-field py-1 text-sm" placeholder="Cost" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" step="0.01" value={s.unitCostAfterTax} onChange={(e) => handleSizeChange(ring.id, s.id, 'unitCostAfterTax', e.target.value)} className="input-field py-1 text-sm" placeholder="Tax Cost" />
                        </div>
                        <div className="input-group mb-0 flex-[1.5]">
                          <input type="text" value={s.remark} onChange={(e) => handleSizeChange(ring.id, s.id, 'remark', e.target.value)} className="input-field py-1 text-sm" placeholder="Remark (Optional)" />
                        </div>
                        {ring.sizes.length > 1 ? (
                          <button type="button" onClick={() => removeSizeFromRing(ring.id, s.id)} className="btn btn-outline p-1.5 mb-0.5 border-danger text-danger hover:bg-danger/20">
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <div className="w-[30px]"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-outline" onClick={() => setIsAdding(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Order</button>
          </div>
        </form>
      )}

      {isReturningGlobal && (
        <form onSubmit={handleReturnSubmit} className="mb-8 p-6 bg-white/5 rounded-lg border border-orange-400/30 animate-slide-down">
          <h3 className="text-lg font-semibold mb-4 text-orange-400">Return Details</h3>
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-white/10">
            <div className="input-group">
              <label className="input-label">Return Date</label>
              <input type="date" name="returnDate" required value={returnOrderData.returnDate} onChange={handleReturnDateChange} className="input-field bg-black/40" />
            </div>
            <div className="input-group">
              <label className="input-label">Deadline / Delivery Date</label>
              <input type="date" name="deliveryDate" value={returnOrderData.deliveryDate} onChange={handleReturnDateChange} className="input-field bg-black/40" />
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Rings being Returned</h3>
            <button type="button" className="btn btn-outline text-xs border-orange-400/50 text-orange-400" onClick={() => setReturnRings([...returnRings, emptyRingEntry()])}>
              <Plus size={14} /> Add Ring
            </button>
          </div>

          <div className="flex flex-col gap-6">
            {returnRings.map((ring, index) => (
              <div key={ring.id} className="p-4 bg-black/20 rounded-lg border border-white/5 relative">
                {returnRings.length > 1 && (
                  <button type="button" onClick={() => setReturnRings(returnRings.filter(r => r.id !== ring.id))} className="absolute top-2 right-2 text-muted hover:text-danger">
                    <X size={16} />
                  </button>
                )}
                <div className="mb-4 flex gap-4 items-start">
                  {ring.imageUrl ? (
                    <div className="relative w-14 h-14 rounded border border-white/10 overflow-hidden flex-shrink-0 bg-black/40">
                      <img src={ring.imageUrl} alt="Ring preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => {
                        setReturnRings(returnRings.map(r => r.id === ring.id ? { ...r, imageUrl: '' } : r));
                      }} className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:text-danger">
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded border border-dashed border-white/20 flex flex-col items-center justify-center flex-shrink-0 text-muted">
                      <ImageIcon size={14} className="mb-0.5" />
                      <span className="text-[8px] text-center px-0.5">Select Ring</span>
                    </div>
                  )}
                  <div className="input-group flex-1 relative">
                    <label className="input-label text-xs">Ring Name / SKU</label>
                    <input 
                      required 
                      type="text" 
                      value={ring.name} 
                      onFocus={() => setActiveDropdown(ring.id)}
                      onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setReturnRings(returnRings.map(r => {
                          if (r.id === ring.id) {
                            const existing = existingUniqueRings.find(er => er.name === newName);
                            return { ...r, name: newName, imageUrl: existing ? existing.imageUrl : r.imageUrl };
                          }
                          return r;
                        }));
                      }} 
                      className="input-field py-1.5" 
                      placeholder="Select a ring..." 
                    />
                    {activeDropdown === ring.id && existingUniqueRings.length > 0 && (
                      <div className="absolute top-[calc(100%+4px)] left-0 w-full max-h-48 overflow-y-auto bg-[#1a1a1a] border border-white/20 rounded shadow-xl z-50">
                        {existingUniqueRings.filter(r => r.name.toLowerCase().includes(ring.name.toLowerCase())).map(r => (
                          <div 
                            key={r.name} 
                            className="flex items-center gap-3 p-2 cursor-pointer hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setReturnRings(returnRings.map(rr => rr.id === ring.id ? { ...rr, name: r.name, imageUrl: r.imageUrl } : rr));
                              setActiveDropdown(null);
                            }}
                          >
                            {r.imageUrl ? (
                              <img src={r.imageUrl} alt={r.name} className="w-8 h-8 object-cover rounded border border-white/10 flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 flex items-center justify-center bg-black/40 border border-white/10 rounded flex-shrink-0">
                                <ImageIcon size={14} className="text-muted" />
                              </div>
                            )}
                            <span className="text-sm truncate">{r.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white/5 p-3 rounded border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <label className="input-label text-xs font-semibold text-orange-400">Sizes, Quantities & Return Prices</label>
                    <button type="button" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1" onClick={() => {
                      setReturnRings(returnRings.map(r => r.id === ring.id ? { ...r, sizes: [...r.sizes, emptySizeEntry()] } : r));
                    }}>
                      <Plus size={12} /> Add Size
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    {ring.sizes.map((s) => (
                      <div key={s.id} className="flex gap-2 items-end">
                        <div className="input-group mb-0 flex-1">
                          <input type="text" value={s.size} onChange={(e) => handleSizeChange(ring.id, s.id, 'size', e.target.value, true)} className="input-field py-1 text-sm" placeholder="Size" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" required min="1" value={s.quantity} onChange={(e) => handleSizeChange(ring.id, s.id, 'quantity', e.target.value, true)} className="input-field py-1 text-sm" placeholder="Qty" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" step="0.01" value={s.unitCost} onChange={(e) => handleSizeChange(ring.id, s.id, 'unitCost', e.target.value, true)} className="input-field py-1 text-sm" placeholder="Cost" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" step="0.01" value={s.unitCostAfterTax} onChange={(e) => handleSizeChange(ring.id, s.id, 'unitCostAfterTax', e.target.value, true)} className="input-field py-1 text-sm" placeholder="Tax Cost" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <input type="number" step="0.01" value={s.returnedPrice} onChange={(e) => handleSizeChange(ring.id, s.id, 'returnedPrice', e.target.value, true)} className="input-field py-1 text-sm" placeholder="Ret. Price" />
                        </div>
                        <div className="input-group mb-0 flex-1">
                          <select value={s.returnStatus || 'Return in progress'} onChange={(e) => handleSizeChange(ring.id, s.id, 'returnStatus', e.target.value, true)} className="input-field py-1 text-xs">
                            <option value="Return in progress">In progress</option>
                            <option value="Returned">Returned</option>
                            <option value="No Return">No Return</option>
                          </select>
                        </div>
                        <div className="input-group mb-0 flex-[1.5]">
                          <input type="text" value={s.remark} onChange={(e) => handleSizeChange(ring.id, s.id, 'remark', e.target.value, true)} className="input-field py-1 text-sm" placeholder="Remark" />
                        </div>
                        {ring.sizes.length > 1 && (
                          <button type="button" onClick={() => {
                            setReturnRings(returnRings.map(r => r.id === ring.id ? { ...r, sizes: r.sizes.filter(sz => sz.id !== s.id) } : r));
                          }} className="btn btn-outline p-1.5 mb-0.5 border-danger text-danger hover:bg-danger/20">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button type="button" className="btn btn-outline" onClick={() => setIsReturningGlobal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary bg-orange-500 hover:bg-orange-600 border-orange-500">Save Return</button>
          </div>
        </form>
      )}

      <div className="table-container max-h-[calc(100vh-280px)] overflow-auto custom-scrollbar border border-white/10 rounded-lg shadow-2xl">
        <table className="data-table border-separate border-spacing-0">
          <thead>
            <tr className="bg-zinc-900 shadow-sm relative z-40">
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">
                  Ring Name {sortConfig.key === 'name' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th>Size</th>
              <th className="text-success cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('quantity')}>
                <div className="flex items-center gap-1">
                  Stock-In {sortConfig.key === 'quantity' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-danger cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('sales')}>
                <div className="flex items-center gap-1">
                  Stock-Out {sortConfig.key === 'sales' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-danger cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('returns')}>
                <div className="flex items-center gap-1">
                  Return {sortConfig.key === 'returns' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-warning cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('inventory')}>
                <div className="flex items-center gap-1">
                  Inventory {sortConfig.key === 'inventory' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-purple-400">Cost</th>
              <th className="text-purple-400 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('costTaxQ')}>
                <div className="flex items-center gap-1">
                  (Cost+Tax)*Q {sortConfig.key === 'costTaxQ' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-blue-400">Unit Price</th>
              <th className="text-blue-400 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('priceQ')}>
                <div className="flex items-center gap-1">
                  Price*Q {sortConfig.key === 'priceQ' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-orange-400">Ret. Price</th>
              <th className="text-orange-400 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('returnedTotal')}>
                <div className="flex items-center gap-1">
                  Ret. Total {sortConfig.key === 'returnedTotal' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="text-blue-400 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('profit')}>
                <div className="flex items-center gap-1">
                  Profit {sortConfig.key === 'profit' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th className="cursor-pointer hover:bg-white/5 transition-colors" onClick={() => handleSort('orderDate')}>
                <div className="flex items-center gap-1">
                  Date {sortConfig.key === 'orderDate' && (sortConfig.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                </div>
              </th>
              <th>Delivery Date</th>
              <th>Return Status</th>
              <th>Remark</th>
              <th className="text-right">Actions</th>
            </tr>
            <tr className="filter-row">
              <th><MultiSelectFilter columnKey="name" options={uniqueValues.name} /></th>
              <th><MultiSelectFilter columnKey="size" options={uniqueValues.size} /></th>
              <th><MultiSelectFilter columnKey="quantity" options={uniqueValues.quantity} /></th>
              <th><MultiSelectFilter columnKey="sales" options={uniqueValues.sales} /></th>
              <th><MultiSelectFilter columnKey="returns" options={uniqueValues.returns} /></th>
              <th><MultiSelectFilter columnKey="inventory" options={uniqueValues.inventory} /></th>
              <th><MultiSelectFilter columnKey="unitCost" options={uniqueValues.unitCost} /></th>
              <th><MultiSelectFilter columnKey="unitCostAfterTax" options={uniqueValues.unitCostAfterTax} /></th>
              <th><MultiSelectFilter columnKey="unitPrice" options={uniqueValues.unitPrice} /></th>
              <th><MultiSelectFilter columnKey="priceQ" options={uniqueValues.priceQ} /></th>
              <th><MultiSelectFilter columnKey="returnedPrice" options={uniqueValues.returnedPrice} /></th>
              <th><MultiSelectFilter columnKey="returnedTotal" options={uniqueValues.returnedTotal} /></th>
              <th><MultiSelectFilter columnKey="profit" options={uniqueValues.profit} /></th>
              <th><MultiSelectFilter columnKey="orderDate" options={uniqueValues.orderDate} /></th>
              <th><MultiSelectFilter columnKey="deliveryDate" options={uniqueValues.deliveryDate} /></th>
              <th><MultiSelectFilter columnKey="returnStatus" options={uniqueValues.returnStatus} /></th>
              <th><MultiSelectFilter columnKey="remark" options={uniqueValues.remark} /></th>
              <th className="text-right">
                <button 
                  onClick={clearFilters}
                  className="text-[10px] text-blue-400 hover:text-blue-300 underline underline-offset-2 whitespace-nowrap"
                >
                  Clear All
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan="18" className="text-center py-8 text-muted">No matching inventory records found.</td>
              </tr>
            ) : (
              (() => {
                // Group items by name
                const groupedItems = filteredItems.reduce((acc, item) => {
                  if (!acc[item.name]) acc[item.name] = [];
                  acc[item.name].push(item);
                  return acc;
                }, {});

                let grandTotalStockIn = 0;
                let grandTotalStockOut = 0;
                let grandTotalReturn = 0;
                let grandTotalInventory = 0;
                let grandTotalCostTaxQ = 0;
                let grandTotalPriceQ = 0;
                let grandTotalReturnedTotal = 0;
                let grandTotalProfit = 0;

                const rows = [];
                const sortedGroups = Object.entries(groupedItems).map(([name, group]) => {
                  // Pre-calculate aggregates for sorting
                  let groupStockIn = 0;
                  let groupStockOut = 0;
                  let groupReturns = 0;
                  let groupInventory = 0;
                  let groupCostTaxQ = 0;
                  let groupPriceQ = 0;
                  let groupReturnedTotal = 0;
                  let groupProfit = 0;
                  let groupLatestDate = '';

                  group.forEach(item => {
                    const si = item.quantity || 0;
                    const so = item.sales || 0;
                    const ret = item.returns || 0;
                    const ctq = (item.unitCostAfterTax || 0) * si;
                    const pq = (item.unitPrice || 0) * so;
                    const rt = (item.returnedPrice || 0) * ret;
                    const art = (item.returnStatus === 'Returned' || item.returnStatus === 'Return in progress') ? rt : 0;
                    
                    if (!item.isReturnRecord) groupStockIn += si;
                    groupStockOut += so;
                    groupReturns += ret;
                    if (!item.isReturnRecord) groupCostTaxQ += ctq;
                    groupPriceQ += pq;
                    groupReturnedTotal += art;
                    groupProfit += (pq - (item.isReturnRecord ? 0 : ctq) + art);
                    
                    const display = getDisplayValues(item);
                    groupInventory += display.inventory;
                    
                    if (!groupLatestDate || (item.orderDate && item.orderDate > groupLatestDate)) {
                      groupLatestDate = item.orderDate;
                    }
                  });

                  return { name, group, groupStockIn, groupStockOut, groupReturns, groupInventory, groupCostTaxQ, groupPriceQ, groupReturnedTotal, groupProfit, groupLatestDate };
                });

                sortedGroups.sort((a, b) => {
                  let valA, valB;
                  switch (sortConfig.key) {
                    case 'name': valA = a.name; valB = b.name; break;
                    case 'quantity': valA = a.groupStockIn; valB = b.groupStockIn; break;
                    case 'sales': valA = a.groupStockOut; valB = b.groupStockOut; break;
                    case 'returns': valA = a.groupReturns; valB = b.groupReturns; break;
                    case 'inventory': valA = a.groupInventory; valB = b.groupInventory; break;
                    case 'costTaxQ': valA = a.groupCostTaxQ; valB = b.groupCostTaxQ; break;
                    case 'priceQ': valA = a.groupPriceQ; valB = b.groupPriceQ; break;
                    case 'returnedTotal': valA = a.groupReturnedTotal; valB = b.groupReturnedTotal; break;
                    case 'profit': valA = a.groupProfit; valB = b.groupProfit; break;
                    case 'orderDate': valA = a.groupLatestDate; valB = b.groupLatestDate; break;
                    default: return 0;
                  }

                  if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                  if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                  return 0;
                });

                sortedGroups.forEach(({ name, group }) => {
                  // Sort group by size numerically ascending
                  group.sort((a, b) => {
                    const numA = parseFloat(a.size);
                    const numB = parseFloat(b.size);
                    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                    return String(a.size).localeCompare(String(b.size));
                  });

                  group.forEach((item, index) => {
                    const isEditing = editingItemId === item.id;
                    const isSelling = sellingItemId === item.id;
                    const rawStockIn = isEditing ? (Number(editForm.quantity) || 0) : (item.quantity || 0);
                    const returns = isEditing ? (Number(editForm.returns) || 0) : (item.returns || 0);
                    // For old return records where quantity was 0, use returns as the stock-in display
                    const stockIn = rawStockIn || (returns > 0 ? returns : 0);
                    const stockOut = isEditing ? (Number(editForm.sales) || 0) : (item.sales || 0);
                    const returnedPrice = isEditing ? (Number(editForm.returnedPrice) || 0) : (item.returnedPrice || 0);
                    
                    const inventory = stockIn - stockOut - returns;
                    
                    const cost = isEditing ? (Number(editForm.unitCost) || 0) : (item.unitCost || 0);
                    const unitPrice = isEditing ? (Number(editForm.unitPrice) || 0) : (item.unitPrice || 0);
                    const costAfterTax = isEditing ? (Number(editForm.unitCostAfterTax) || 0) : (item.unitCostAfterTax || 0);
                    const costTaxQ = costAfterTax * stockIn;
                    const priceQ = unitPrice * stockOut;
                    
                    const returnedTotal = returnedPrice * returns;
                    const actualReturnedTotal = (item.returnStatus === 'Returned' || item.returnStatus === 'Return in progress' || (isEditing && (editForm.returnStatus === 'Returned' || editForm.returnStatus === 'Return in progress'))) ? returnedTotal : 0;
                    
                    const profit = priceQ - (item.isReturnRecord ? 0 : costTaxQ) + actualReturnedTotal;

                    if (!isEditing) {
                      if (!item.isReturnRecord) {
                        grandTotalStockIn += stockIn;
                        grandTotalCostTaxQ += costTaxQ;
                      }
                      grandTotalStockOut += stockOut;
                      grandTotalReturn += returns;
                      grandTotalInventory += inventory;
                      grandTotalPriceQ += priceQ;
                      grandTotalReturnedTotal += actualReturnedTotal;
                      grandTotalProfit += profit;
                    }

                    rows.push(
                      <tr key={item.id} className={inventory > 0 ? "bg-white/5" : ""} onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (isEditing) saveEdit(item.id);
                          if (isSelling) saveSell(item.id);
                        }
                      }}>
                        {index === 0 && (
                          <td rowSpan={group.length} className="font-bold border-r border-white/10 align-top bg-black/20" style={{ padding: '0.5rem', minWidth: '110px' }}>
                            {editingRingName === name ? (
                              <div className="flex flex-col items-center justify-start h-full gap-2 w-full">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="Ring" className="w-14 h-14 object-cover rounded border border-white/20 shadow-sm flex-shrink-0" />
                                ) : (
                                  <div className="w-14 h-14 rounded border border-dashed border-white/20 flex flex-col items-center justify-center text-muted">
                                    <ImageIcon size={14} className="mb-1" />
                                    <span className="text-[9px]">No Photo</span>
                                  </div>
                                )}
                                <input 
                                  type="text" 
                                  className="input-field py-1 px-2 w-full text-center text-xs" 
                                  value={editRingNameForm} 
                                  onChange={e => setEditRingNameForm(e.target.value)} 
                                  autoFocus
                                />
                                <div className="flex gap-1 mt-1">
                                  <button className="btn btn-primary p-1" onClick={saveRingNameEdit} title="Save changes">
                                    <Check size={14} />
                                  </button>
                                  <button className="btn btn-outline p-1" onClick={() => setEditingRingName(null)} title="Cancel">
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-start h-full gap-2 relative group w-full">
                                <button 
                                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 p-1.5 text-muted hover:text-white transition-opacity bg-black/60 rounded-full z-10"
                                  onClick={() => startRingNameEdit(name)}
                                  title="Edit Ring Name"
                                >
                                  <Edit2 size={12} />
                                </button>
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt="Ring" className="w-14 h-14 object-cover rounded border border-white/20 shadow-sm flex-shrink-0" />
                                ) : (
                                  <div className="w-14 h-14 rounded border border-dashed border-white/20 flex flex-col items-center justify-center text-muted">
                                    <ImageIcon size={14} className="mb-1" />
                                    <span className="text-[9px]">No Photo</span>
                                  </div>
                                )}
                                <span className="text-xs text-center leading-tight break-words w-full">
                                  {name}
                                </span>
                              </div>
                            )}
                          </td>
                        )}
                        <td className="font-bold text-center">
                          {isEditing ? (
                            <input type="text" className="input-field py-1 px-2 w-16 text-xs text-center mx-auto" value={editForm.size} onChange={e => setEditForm({...editForm, size: e.target.value})} />
                          ) : (
                            item.size || '-'
                          )}
                        </td>
                        <td className="text-center">
                          {isEditing ? (
                            <input type="number" min="0" className="input-field py-1 px-2 w-16 text-center mx-auto" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} />
                          ) : (
                            stockIn || ''
                          )}
                        </td>
                        
                        <td className="text-center">
                          {isEditing ? (
                            <input type="number" min="0" className="input-field py-1 px-2 w-16 text-center mx-auto" value={editForm.sales} onChange={e => setEditForm({...editForm, sales: e.target.value})} />
                          ) : (
                            stockOut || ''
                          )}
                        </td>
                        
                        <td className="text-center">
                          {isEditing ? (
                            <input type="number" min="0" className="input-field py-1 px-2 w-16 text-center mx-auto" value={editForm.returns} onChange={e => setEditForm({...editForm, returns: e.target.value})} />
                          ) : (
                            returns || ''
                          )}
                        </td>

                        <td className={`text-center font-bold ${inventory > 0 ? 'text-gold' : 'text-muted'}`}>{inventory}</td>
                        <td>
                          {isEditing ? (
                            <input type="number" step="0.01" className="input-field py-1 px-2 w-20 mx-auto" value={editForm.unitCost} onChange={handleEditCostChange} />
                          ) : (
                            cost ? cost.toFixed(2) : '0'
                          )}
                        </td>
                        <td className={inventory > 0 ? 'text-pink-400' : ''}>
                          {isEditing ? (
                            <div className="flex flex-col items-center">
                              <input type="number" step="0.01" className="input-field py-1 px-1 w-20 mx-auto text-xs" value={editForm.unitCostAfterTax} onChange={e => setEditForm({...editForm, unitCostAfterTax: e.target.value})} title="Unit Cost After Tax" />
                              <span className="text-[10px] text-muted">Cost+Tax (Per Item)</span>
                            </div>
                          ) : (
                            costTaxQ ? costTaxQ.toFixed(2) : '0.00'
                          )}
                        </td>
                        
                        <td className="text-center">
                          {isEditing ? (
                            <input type="number" step="0.01" min="0" className="input-field py-1 px-2 w-20 text-center mx-auto" value={editForm.unitPrice} onChange={e => setEditForm({...editForm, unitPrice: e.target.value})} />
                          ) : (
                            unitPrice ? unitPrice.toFixed(2) : ''
                          )}
                        </td>

                        <td>{priceQ ? priceQ.toFixed(2) : ''}</td>
                        <td className="text-center">
                          {isEditing ? (
                            <input type="number" step="0.01" min="0" className="input-field py-1 px-2 w-16 text-center mx-auto" value={editForm.returnedPrice} onChange={e => setEditForm({...editForm, returnedPrice: e.target.value})} />
                          ) : (
                            returnedPrice ? returnedPrice.toFixed(2) : ''
                          )}
                        </td>
                        <td>{returnedTotal ? returnedTotal.toFixed(2) : ''}</td>
                        <td>{profit ? profit.toFixed(2) : ''}</td>
                        <td className="text-xs text-muted">
                          {isEditing ? (
                            <input type="date" className="input-field py-1 px-2 w-[120px] text-xs" value={editForm.orderDate} onChange={e => setEditForm({...editForm, orderDate: e.target.value})} title="Order Date" />
                          ) : (
                            item.orderDate || '-'
                          )}
                        </td>
                        <td className="text-xs text-muted">
                          {isEditing ? (
                            <input type="date" className="input-field py-1 px-2 w-[120px] text-xs" value={editForm.deliveryDate} onChange={e => setEditForm({...editForm, deliveryDate: e.target.value})} title="Delivery Date" />
                          ) : (
                            item.deliveryDate || '-'
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <select className="input-field py-1 px-1 text-xs" value={editForm.returnStatus} onChange={e => setEditForm({...editForm, returnStatus: e.target.value})}>
                              <option value="">-</option>
                              <option value="Return in progress">In progress</option>
                              <option value="Returned">Returned</option>
                              <option value="No Return">No Return</option>
                            </select>
                          ) : (
                            <div className="flex flex-col gap-1 items-start">
                              {item.returnStatus ? (
                                <span className={`badge ${item.returnStatus === 'Returned' ? 'badge-info' : item.returnStatus === 'No Return' ? 'badge-muted' : 'badge-warning'}`}>
                                  {item.returnStatus}
                                </span>
                              ) : (
                                item.orderDate && (() => {
                                  const info = getReturnDeadlineInfo(item.orderDate);
                                  if (!info.deadline) return '-';
                                  return (
                                    <>
                                      <span className="text-xs">{format(info.deadline, 'MMM dd')}</span>
                                      {getStatusBadge(item.orderDate)}
                                    </>
                                  );
                                })()
                              )}
                              {!item.returnStatus && !item.orderDate && '-'}
                            </div>
                          )}
                        </td>
                        <td>
                          {isEditing ? (
                            <input type="text" className="input-field py-1 px-2 w-full text-xs" value={editForm.remark} onChange={e => setEditForm({...editForm, remark: e.target.value})} placeholder="Remark" />
                          ) : (
                            <span className="text-xs text-muted max-w-[150px] break-words block" title={item.remark}>{item.remark || '-'}</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button className="btn btn-primary p-1" onClick={() => saveEdit(item.id)} title="Save changes">
                                  <Check size={16} />
                                </button>
                                <button className="btn btn-outline p-1" onClick={() => setEditingItemId(null)} title="Cancel">
                                  <X size={16} />
                                </button>
                              </>
                            ) : isSelling ? (
                              <div className="flex gap-1 items-center bg-black/40 p-1 rounded border border-white/10">
                                <input type="number" min="1" className="input-field py-1 px-1 w-12 text-xs text-center" value={sellForm.qty} onChange={e => setSellForm({...sellForm, qty: e.target.value})} title="Qty to sell" />
                                <span className="text-muted text-xs">@</span>
                                <input type="number" step="0.01" min="0" className="input-field py-1 px-1 w-16 text-xs text-center" value={sellForm.price} onChange={e => setSellForm({...sellForm, price: e.target.value})} title="Sale Price" />
                                <button className="btn btn-primary p-1 ml-1" onClick={() => saveSell(item.id)} title="Confirm Sale">
                                  <Check size={14} />
                                </button>
                                <button className="btn btn-outline p-1" onClick={() => setSellingItemId(null)} title="Cancel">
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button className="btn btn-outline p-1 text-success border-success hover:bg-success/20" style={{borderColor: 'var(--accent-success)', color: 'var(--accent-success)'}} onClick={() => startSell(item)} title="Record a Sale">
                                  <ShoppingCart size={16} />
                                </button>
                                <button className="btn btn-outline p-1" onClick={() => startEdit(item)} title="Edit Record">
                                  <Edit2 size={16} />
                                </button>
                                <button className="btn btn-danger btn-outline p-1" onClick={() => handleDelete(item.id)} title="Delete Record">
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });

                return rows;
              })()
            )}
          </tbody>
          <tfoot className="sticky bottom-0 z-40 bg-[#0d0d0d] font-bold border-t-2 border-gold/40 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
            <tr className="text-white text-sm">
              <td colSpan="2" className="text-right py-3 pr-4">GRAND TOTALS:</td>
              <td className="text-center text-success">{grandTotals.stockIn}</td>
              <td className="text-center text-danger">{grandTotals.stockOut}</td>
              <td className="text-center text-danger">{grandTotals.returns}</td>
              <td className="text-center text-warning">{grandTotals.inventory}</td>
              <td>-</td>
              <td className="text-purple-400">${grandTotals.costTaxQ.toFixed(2)}</td>
              <td>-</td>
              <td className="text-blue-400">${grandTotals.priceQ.toFixed(2)}</td>
              <td>-</td>
              <td className="text-orange-400">${grandTotals.returnedTotal.toFixed(2)}</td>
              <td className="text-gold bg-gold/10 font-black">${grandTotals.profit.toFixed(2)}</td>
              <td colSpan="5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
