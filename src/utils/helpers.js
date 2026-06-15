import { addDays, differenceInDays } from 'date-fns';

export const calculateRevenue = (sales, returns, unitPrice) => {
  return ((sales || 0) - (returns || 0)) * (unitPrice || 0);
};

export const calculateNetProfit = (sales, returns, unitPrice, unitCostAfterTax) => {
  const revenue = calculateRevenue(sales, returns, unitPrice);
  const cost = ((sales || 0) - (returns || 0)) * (unitCostAfterTax || 0);
  return revenue - cost;
};

// 90 days return deadline calculation
export const getReturnDeadlineInfo = (orderDateStr) => {
  if (!orderDateStr) return { deadline: null, daysRemaining: null, isUrgent: false, isOverdue: false };
  
  const [y, m, d] = orderDateStr.split('-').map(Number);
  const orderDate = new Date(y, m - 1, d);
  if (isNaN(orderDate.getTime())) return { deadline: null, daysRemaining: null, isUrgent: false, isOverdue: false };

  const deadline = addDays(orderDate, 90);
  const today = new Date();
  const daysRemaining = differenceInDays(deadline, today);

  return {
    deadline,
    daysRemaining,
    isUrgent: daysRemaining > 0 && daysRemaining <= 14, 
    isOverdue: daysRemaining <= 0
  };
};

export const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const getDisplayValues = (item) => {
  const returns = item.returns || 0;
  const stockIn = (item.quantity || 0) || (returns > 0 ? returns : 0);
  const stockOut = item.sales || 0;
  const inventory = stockIn - stockOut - returns;
  
  const unitCostAfterTax = item.unitCostAfterTax || 0;
  const unitPrice = item.unitPrice || 0;
  const returnedPrice = item.returnedPrice || 0;
  
  const costTaxQ = item.isReturnRecord ? 0 : unitCostAfterTax * (item.quantity || 0);
  const priceQ = unitPrice * stockOut;
  const returnedTotal = (item.returnStatus === 'Returned' || item.returnStatus === 'Return in progress') 
    ? (returnedPrice * returns) 
    : 0;
    
  // Profit = (Sales Margin) + (Return Margin)
  // Sales Margin = Sales * (Price - Cost)
  // Return Margin = Returns * (ReturnedPrice - Cost)
  const salesMargin = stockOut * (unitPrice - unitCostAfterTax);
  const returnMargin = returns * (returnedPrice - unitCostAfterTax);
  const profit = Number((salesMargin + returnMargin).toFixed(2));

  return {
    ...item,
    quantity: stockIn,
    inventory,
    priceQ,
    costTaxQ,
    returnedTotal,
    profit
  };
};
