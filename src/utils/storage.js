const STORAGE_KEY = 'lord-of-the-rings-inventory';
const LOG_KEY = 'lord-of-the-rings-logs';

export const loadInventory = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to parse inventory', error);
    return [];
  }
};

export const saveInventory = (inventory) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(inventory));
};

export const loadLogs = () => {
  const data = localStorage.getItem(LOG_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
};

export const saveLogs = (logs) => {
  localStorage.setItem(LOG_KEY, JSON.stringify(logs));
};
