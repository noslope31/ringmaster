import { useState, useEffect } from 'react';
import { loadInventory, saveInventory, loadLogs, saveLogs } from './utils/storage';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import StockTable from './components/StockTable';
import { Gem, ListOrdered, PackageSearch, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from './utils/supabase';

// Get passcode from environment variables, fallback to "ringmaster" if not set
const CORRECT_PASSCODE = import.meta.env.VITE_APP_PASSCODE || 'ringmaster';

function App() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState('orders');

  // --- Passcode Protection State ---
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passcodeError, setPasscodeError] = useState(false);

  // Check if already unlocked on this device
  useEffect(() => {
    const savedPasscode = localStorage.getItem('ringmaster_app_passcode');
    if (savedPasscode === CORRECT_PASSCODE) {
      setIsUnlocked(true);
    }
  }, []);

  // --- Data: load inventory and logs ---
  useEffect(() => {
    if (!isUnlocked) return;

    const loadData = async () => {
      const localInv = loadInventory();
      const localLogs = loadLogs();

      // 1. Try loading from Supabase Cloud if configured
      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('ringmaster_data')
            .select('inventory, logs')
            .eq('id', 1)
            .maybeSingle();

          if (error) throw error;

          if (data && ((data.inventory && data.inventory.length > 0) || (data.logs && data.logs.length > 0))) {
            setItems(data.inventory || []);
            setLogs(data.logs || []);
            setIsLoaded(true);
            return;
          } else if (localInv.length > 0 || localLogs.length > 0) {
            // Migrate local data to Supabase if Supabase is empty
            setItems(localInv);
            setLogs(localLogs);
            setIsLoaded(true);
            return;
          }
        } catch (error) {
          console.error('[Storage] Supabase load failed, falling back to local storage', error);
        }
      }

      // 2. Try loading from local Express backend if running
      try {
        const res = await fetch('/api/data');
        if (!res.ok) throw new Error('API server returned error status');
        const data = await res.json();

        if ((data.inventory && data.inventory.length > 0) || (data.logs && data.logs.length > 0)) {
          setItems(data.inventory);
          setLogs(data.logs);
        } else if (localInv.length > 0 || localLogs.length > 0) {
          setItems(localInv);
          setLogs(localLogs);
        } else {
          setItems([]);
          setLogs([]);
        }
      } catch (error) {
        console.warn('[Storage] Local API backend not available. Falling back to browser localStorage.', error);
        // 3. Final Fallback: use local browser storage
        setItems(localInv);
        setLogs(localLogs);
      }
      setIsLoaded(true);
    };

    loadData();
  }, [isUnlocked]);

  // --- Data: save inventory and logs ---
  useEffect(() => {
    if (isLoaded && isUnlocked) {
      // Save locally to localStorage as a persistent backup
      saveInventory(items);
      saveLogs(logs);

      const saveData = async () => {
        // 1. Try saving to Supabase Cloud
        if (supabase) {
          try {
            const { error } = await supabase
              .from('ringmaster_data')
              .upsert({ id: 1, inventory: items, logs: logs, updated_at: new Date().toISOString() });
            if (error) throw error;
            return;
          } catch (error) {
            console.error('[Storage] Supabase save failed:', error);
          }
        }

        // 2. Try saving to local Express backend database
        try {
          await fetch('/api/data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inventory: items, logs }),
          });
        } catch (error) {
          console.error('[Storage] Failed to save data to local backend database:', error);
        }
      };

      saveData();
    }
  }, [items, logs, isLoaded, isUnlocked]);

  // --- Passcode Submit Handler ---
  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcodeInput === CORRECT_PASSCODE) {
      localStorage.setItem('ringmaster_app_passcode', passcodeInput);
      setIsUnlocked(true);
      setPasscodeError(false);
    } else {
      setPasscodeError(true);
    }
  };

  // --- Render Passcode Screen if locked ---
  if (!isUnlocked) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.05), transparent 40%), radial-gradient(circle at 80% 20%, rgba(212, 175, 55, 0.03), transparent 40%)',
      }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: 'rgba(212, 175, 55, 0.1)',
              borderRadius: '50%',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.15)',
              marginBottom: '1rem',
            }}>
              <Gem size={32} color="var(--accent-gold)" />
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              backgroundImage: 'linear-gradient(to right, var(--accent-gold), #fff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '0.25rem',
            }}>
              RingMaster
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Enter passcode to unlock inventory
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem' }}>
            <form onSubmit={handlePasscodeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Enter passcode"
                    required
                    className="input-field"
                    style={{ width: '100%', paddingRight: '2.75rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      padding: '0',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {passcodeError && (
                <div style={{
                  background: 'var(--accent-danger-light)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--border-radius-md)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.875rem',
                  color: '#fca5a5',
                  textAlign: 'center',
                }}>
                  Incorrect passcode. Please try again.
                </div>
              )}

              <button
                type="submit"
                className="btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  background: 'var(--accent-gold)',
                  color: '#0a0a0c',
                  fontWeight: '600',
                  padding: '0.75rem',
                  fontSize: '0.9375rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}
              >
                <Lock size={16} />
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // --- Render: main app ---
  return (
    <div className="min-h-screen flex flex-col items-center">
      <header className="w-full max-w-7xl mx-auto p-6 mt-4 animate-fade-in flex items-center gap-3">
        <div className="p-2 bg-gold/10 rounded-full border border-gold/20 shadow-glow">
          <Gem className="text-gold" size={32} />
        </div>
        <div style={{ flex: 1 }}>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gold to-yellow-500" style={{ backgroundImage: 'linear-gradient(to right, var(--accent-gold), #fff)' }}>
            RingMaster
          </h1>
          <p className="text-sm text-secondary">Lord of the Rings Inventory Tracker</p>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto p-6 flex-1 flex flex-col gap-6">
        <Dashboard items={items} />

        <div className="flex flex-wrap gap-2 p-1 bg-black/20 rounded-lg border border-white/5 w-fit">
          <button 
            className={`btn ${currentView === 'orders' ? 'bg-gold/20 text-gold border-gold/30' : 'btn-outline border-transparent'}`}
            onClick={() => setCurrentView('orders')}
          >
            <ListOrdered size={16} /> Order History
          </button>
          <button 
            className={`btn ${currentView === 'stock' ? 'bg-gold/20 text-gold border-gold/30' : 'btn-outline border-transparent'}`}
            onClick={() => setCurrentView('stock')}
          >
            <PackageSearch size={16} /> Current Stock
          </button>
          <button 
            className={`btn ${currentView === 'logs' ? 'bg-gold/20 text-gold border-gold/30' : 'btn-outline border-transparent'}`}
            onClick={() => setCurrentView('logs')}
          >
            <ListOrdered size={16} /> Submission Logs
          </button>
        </div>

        {currentView === 'orders' ? (
          <InventoryTable items={items} setItems={setItems} logs={logs} setLogs={setLogs} />
        ) : currentView === 'stock' ? (
          <StockTable items={items} setItems={setItems} />
        ) : (
          <div className="glass-panel p-6 animate-fade-in">
            <h2 className="text-xl font-bold mb-6">Original Submission History</h2>
            <div className="table-container">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Data Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr><td colSpan="3" className="text-center py-8 text-muted">No logs found.</td></tr>
                  ) : (
                    [...logs].reverse().map((log, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap text-muted">{new Date(log.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${log.type === 'Order' ? 'badge-info' : 'badge-warning'}`}>
                            {log.type}
                          </span>
                        </td>
                        <td className="max-w-[400px]">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-gold">{log.summary}</span>
                            <pre className="text-[10px] text-muted overflow-x-auto bg-black/20 p-2 rounded mt-1">
                              {JSON.stringify(log.rawData, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full max-w-7xl mx-auto p-6 text-center text-sm text-muted">
        <p>RingMaster Inventory © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;
