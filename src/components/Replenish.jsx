import { useState, useMemo } from 'react';
import { Image as ImageIcon, PackageX } from 'lucide-react';
import { getDisplayValues } from '../utils/helpers';

const sortSizes = (a, b) => {
  const numA = parseFloat(a);
  const numB = parseFloat(b);
  if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
  return String(a).localeCompare(String(b));
};

export default function Replenish({ items }) {
  const [threshold, setThreshold] = useState(2);

  const imageByName = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      if (item.name && item.imageUrl && !map.has(item.name)) {
        map.set(item.name, item.imageUrl);
      }
    });
    return map;
  }, [items]);

  const sizeGroups = useMemo(() => {
    const map = new Map();

    items.forEach(item => {
      if (!item.name) return;
      const key = `${item.name}___${item.size || '-'}`;
      if (!map.has(key)) {
        map.set(key, {
          name: item.name,
          size: item.size || '-',
          imageUrl: item.imageUrl || '',
          inventory: 0,
          totalSold: 0,
        });
      }
      const group = map.get(key);
      if (!group.imageUrl && item.imageUrl) group.imageUrl = item.imageUrl;

      const display = getDisplayValues(item);
      group.inventory += display.inventory;
      group.totalSold += item.sales || 0;
    });

    return Array.from(map.values()).map(group => ({
      ...group,
      imageUrl: group.imageUrl || imageByName.get(group.name) || '',
    }));
  }, [items, imageByName]);

  const lowStockList = useMemo(() => {
    return sizeGroups
      .filter(g => g.inventory <= threshold)
      .sort((a, b) => {
        if (a.inventory !== b.inventory) return a.inventory - b.inventory;
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;
        return sortSizes(a.size, b.size);
      });
  }, [sizeGroups, threshold]);

  const outOfStockCount = lowStockList.filter(g => g.inventory <= 0).length;
  const lowStockCount = lowStockList.length - outOfStockCount;

  return (
    <div className="glass-panel p-6 animate-fade-in">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <PackageX size={20} className="text-danger" /> Needs Replenishing
        </h2>
        <div className="flex items-center gap-2">
          <label className="text-xs text-secondary uppercase tracking-wider">Low stock at or below</label>
          <input
            type="number"
            min="0"
            className="input-field py-1 px-2 w-16 text-center text-xs"
            value={threshold}
            onChange={e => setThreshold(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <p className="text-xs text-secondary mb-6">
        <span className="text-danger font-semibold">{outOfStockCount} out of stock</span>
        {' · '}
        <span className="text-warning font-semibold">{lowStockCount} running low</span>
      </p>

      {lowStockList.length === 0 ? (
        <p className="text-center text-muted py-8">Nothing needs replenishing right now.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {lowStockList.map(group => (
            <div
              key={`${group.name}___${group.size}`}
              className={`glass-panel p-2.5 flex flex-col items-center gap-1 text-center ${group.inventory <= 0 ? 'border-danger/40' : 'border-warning/40'}`}
            >
              {group.imageUrl ? (
                <img src={group.imageUrl} alt={group.name} className="w-full aspect-square object-cover rounded border border-white/10" />
              ) : (
                <div className="w-full aspect-square rounded border border-dashed border-white/20 flex items-center justify-center text-muted">
                  <ImageIcon size={24} />
                </div>
              )}
              <span className="text-xs font-semibold leading-tight break-words w-full">{group.name}</span>
              <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider leading-none">
                <span className="text-secondary">Size {group.size}</span>
                <span className="text-muted">·</span>
                <span className={`font-bold ${group.inventory <= 0 ? 'text-danger' : 'text-warning'}`}>
                  {group.inventory <= 0 ? 'Out of stock' : `${group.inventory} left`}
                </span>
              </div>
              {group.totalSold > 0 && (
                <span className="text-[9px] text-muted leading-none">{group.totalSold} sold total</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
