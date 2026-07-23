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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6 w-full">
      <div className="glass-panel p-4 flex flex-col items-center justify-center text-center aspect-square min-w-0">
        <div className="p-2 bg-white/5 rounded-full mb-2">
          <Package className="text-gold" size={20} />
        </div>
        <p className="text-[9px] text-secondary font-medium uppercase tracking-wider mb-1">Total Rings</p>
        <h3 className="text-xl font-bold">{totalItems}</h3>
      </div>
      
      <div className="glass-panel p-4 flex flex-col items-center justify-center text-center aspect-square min-w-0">
        <div className="p-2 bg-white/5 rounded-full mb-2">
          <DollarSign className="text-blue-400" size={20} />
        </div>
        <p className="text-[9px] text-secondary font-medium uppercase tracking-wider mb-1">Total Revenue</p>
        <h3 className="text-lg font-bold">${totalRevenue.toFixed(2)}</h3>
      </div>

      <div className="glass-panel p-4 flex flex-col items-center justify-center text-center aspect-square min-w-0">
        <div className="p-2 bg-white/5 rounded-full mb-2">
          <ShoppingCart className="text-purple-400" size={20} />
        </div>
        <p className="text-[9px] text-secondary font-medium uppercase tracking-wider mb-1">Total Cost</p>
        <h3 className="text-lg font-bold">${totalCostBeforeTax.toFixed(2)}</h3>
      </div>

      <div className="glass-panel p-4 flex flex-col items-center justify-center text-center aspect-square min-w-0 border-gold/20">
        <div className="p-2 bg-gold/5 rounded-full mb-2">
          <TrendingUp className="text-gold" size={20} />
        </div>
        <p className="text-[9px] text-secondary font-medium uppercase tracking-wider mb-1">Total (Cost+Tax)</p>
        <h3 className="text-lg font-bold">${totalInvestment.toFixed(2)}</h3>
      </div>

      <div className="glass-panel p-4 flex flex-col items-center justify-center text-center aspect-square min-w-0">
        <div className="p-2 bg-green-500/10 rounded-full mb-2">
          <TrendingUp className="text-success" size={20} />
        </div>
        <p className="text-[9px] text-secondary font-medium uppercase tracking-wider mb-1">Net Profit</p>
        <h3 className="text-lg font-bold text-success">${totalProfit.toFixed(2)}</h3>
      </div>

      <div className="glass-panel p-4 flex flex-col items-center justify-center text-center aspect-square min-w-0">
        <div className="p-2 bg-white/5 rounded-full mb-2">
          <AlertTriangle className={overdueCount > 0 ? "text-danger" : urgentCount > 0 ? "text-warning" : "text-secondary"} size={20} />
        </div>
        <p className="text-[9px] text-secondary font-medium uppercase tracking-wider mb-1">Deadlines</p>
        <h3 className="text-lg font-bold">{urgentCount + overdueCount}</h3>
        {(urgentCount > 0 || overdueCount > 0) && (
          <span className="text-[8px] text-muted uppercase mt-1">Action Needed</span>
        )}
      </div>
    </div>
  );
}
