import { useState, useMemo } from 'react';
import { Image as ImageIcon, ArrowLeft } from 'lucide-react';
import { getDisplayValues } from '../utils/helpers';

const sortSizes = (a, b) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return String(a).localeCompare(String(b));
};

export default function RingGallery({ items }) {
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedRing, setSelectedRing] = useState(null);

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
                <th>Date</th>
                <th>Delivery Date</th>
                <th>Return Status</th>
              </tr>
            </thead>
            <tbody>
              {relatedItems.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-6 text-muted">No records found.</td></tr>
              ) : relatedItems.map(item => (
                <tr key={item.id}>
                  <td className="font-bold text-center">{item.size || '-'}</td>
                  <td className="text-center">{item.quantity || 0}</td>
                  <td className="text-center">{item.sales || 0}</td>
                  <td className="whitespace-nowrap">{item.orderDate || '-'}</td>
                  <td className="whitespace-nowrap">{item.deliveryDate || '-'}</td>
                  <td>{item.returnStatus || '-'}</td>
                </tr>
              ))}
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
            return (
              <button
                key={ring.name}
                className="glass-panel p-3 flex flex-col items-center gap-2 hover:border-gold/40 transition-colors text-center"
                onClick={() => setSelectedRing(ring.name)}
              >
                {ring.imageUrl ? (
                  <img src={ring.imageUrl} alt={ring.name} className="w-full aspect-square object-cover rounded border border-white/10" />
                ) : (
                  <div className="w-full aspect-square rounded border border-dashed border-white/20 flex items-center justify-center text-muted">
                    <ImageIcon size={24} />
                  </div>
                )}
                <span className="text-xs font-semibold leading-tight break-words">{ring.name}</span>
                <span className={`text-[10px] uppercase tracking-wider ${totalInv > 0 ? 'text-gold' : 'text-muted'}`}>
                  {totalInv} in stock
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
