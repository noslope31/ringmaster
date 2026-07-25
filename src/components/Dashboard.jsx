import { DollarSign, Package, TrendingUp, AlertTriangle, ShoppingCart, Gem } from 'lucide-react';
import { getReturnDeadlineInfo, getDisplayValues } from '../utils/helpers';

export default function Dashboard({ items }) {
  const totalItems = items.length;

  const totals = items.reduce((acc, item) => {
    const display = getDisplayValues(item);
    acc.revenue += display.priceQ + display.returnedTotal;
    acc.profit += display.profit;
    acc.investment += display.costTaxQ;
    acc.costBeforeTax += (item.isReturnRecord ? 0 : (item.unitCost || 0) * (item.quantity || 0));
    return acc;
  }, { revenue: 0, profit: 0, investment: 0, costBeforeTax: 0 });

  const totalRevenue = totals.revenue;
  const totalProfit = totals.profit;
  const totalInvestment = totals.investment;
  const totalCostBeforeTax = totals.costBeforeTax;

  // Check for items approaching return deadline (within 14 days or overdue)
  // but only if they are not sold out or if returns are still possible (we can assume if they have stock, they might need return)
  // Simple check: how many items have 'isUrgent' or 'isOverdue'
  let urgentCount = 0;
  let overdueCount = 0;

  items.forEach(item => {
    const info = getReturnDeadlineInfo(item.orderDate);
    if (info.isOverdue) overdueCount++;
    else if (info.isUrgent) urgentCount++;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4 w-full">
      <div className="glass-panel px-2.5 py-2 flex items-center gap-2 min-w-0">
        <div className="p-1 bg-white/5 rounded-full flex-shrink-0">
          <Package className="text-gold" size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] text-secondary font-medium uppercase tracking-wider leading-none mb-0.5">Total Rings</p>
          <h3 className="text-sm font-bold leading-none">{totalItems}</h3>
        </div>
      </div>

      <div className="glass-panel px-2.5 py-2 flex items-center gap-2 min-w-0">
        <div className="p-1 bg-white/5 rounded-full flex-shrink-0">
          <DollarSign className="text-blue-400" size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] text-secondary font-medium uppercase tracking-wider leading-none mb-0.5">Total Revenue</p>
          <h3 className="text-sm font-bold leading-none">${totalRevenue.toFixed(2)}</h3>
        </div>
      </div>

      <div className="glass-panel px-2.5 py-2 flex items-center gap-2 min-w-0">
        <div className="p-1 bg-white/5 rounded-full flex-shrink-0">
          <ShoppingCart className="text-purple-400" size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] text-secondary font-medium uppercase tracking-wider leading-none mb-0.5">Total Cost</p>
          <h3 className="text-sm font-bold leading-none">${totalCostBeforeTax.toFixed(2)}</h3>
        </div>
      </div>

      <div className="glass-panel px-2.5 py-2 flex items-center gap-2 min-w-0 border-gold/20">
        <div className="p-1 bg-gold/5 rounded-full flex-shrink-0">
          <TrendingUp className="text-gold" size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] text-secondary font-medium uppercase tracking-wider leading-none mb-0.5">Total (Cost+Tax)</p>
          <h3 className="text-sm font-bold leading-none">${totalInvestment.toFixed(2)}</h3>
        </div>
      </div>

      <div className="glass-panel px-2.5 py-2 flex items-center gap-2 min-w-0">
        <div className="p-1 bg-green-500/10 rounded-full flex-shrink-0">
          <TrendingUp className="text-success" size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] text-secondary font-medium uppercase tracking-wider leading-none mb-0.5">Net Profit</p>
          <h3 className="text-sm font-bold text-success leading-none">${totalProfit.toFixed(2)}</h3>
        </div>
      </div>

      <div className="glass-panel px-2.5 py-2 flex items-center gap-2 min-w-0">
        <div className="p-1 bg-white/5 rounded-full flex-shrink-0">
          <AlertTriangle className={overdueCount > 0 ? "text-danger" : urgentCount > 0 ? "text-warning" : "text-secondary"} size={14} />
        </div>
        <div className="min-w-0">
          <p className="text-[8px] text-secondary font-medium uppercase tracking-wider leading-none mb-0.5">Deadlines</p>
          <h3 className="text-sm font-bold leading-none">
            {urgentCount + overdueCount}
            {(urgentCount > 0 || overdueCount > 0) && (
              <span className="text-[8px] text-muted uppercase ml-1 font-normal">Action Needed</span>
            )}
          </h3>
        </div>
      </div>
    </div>
  );
}
