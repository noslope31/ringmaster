import { useState, useEffect } from 'react';
import { loadInventory, saveInventory, loadLogs, saveLogs } from './utils/storage';
import Dashboard from './components/Dashboard';
import InventoryTable from './components/InventoryTable';
import StockTable from './components/StockTable';
import Login from './components/Login';
import { Gem, ListOrdered, PackageSearch, LogOut } from 'lucide-react';
import { supabase } from './utils/supabase';

function App() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentView, setCurrentView] = useState('orders');
  const [session, setSession] = useState(undefined); // undefined = checking, null = not logged in, object = logged in

  // --- Auth: listen for login/logout events ---
  useEffect(() => {
    // Get the current session on first load
    supabase?.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout changes
    const { data: { subscription } } = supabase?.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Reset loaded state when user logs out so data reloads on next login
      if (!session) {
        setIsLoaded(false);
        setItems([]);
        setLogs([]);
      }
    }) ?? { data: { subscription: null } };

    return () => subscription?.unsubscribe();
  }, []);

  // --- Data: load inventory and logs ---
  useEffect(() => {
    // Only load data when we have an active session (or no Supabase, for local-only use)
    if (session === undefined) return; // Still checking auth
    if (supabase && !session) return;  // Supabase is configured but not logged in — wait

    const loadData = async () => {
      const localInv = loadInventory();
      const localLogs = loadLogs();

      // 1. Try loading from Supabase Cloud if configured and logged in
      if (supabase && session) {
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
  }, [session]);

  // --- Data: save inventory and logs ---
  useEffect(() => {
    if (isLoaded) {
      // Save locally to localStorage as a persistent backup
      saveInventory(items);
      saveLogs(logs);

      const saveData = async () => {
        // 1. Try saving to Supabase Cloud (only when logged in)
        if (supabase && session) {
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
  }, [items, logs, isLoaded]);

  // --- Sign out handler ---
  const handleSignOut = async () => {
    await supabase?.auth.signOut();
  };

  // --- Render: waiting to determine auth state ---
  if (session === undefined) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</div>
      </div>
    );
  }

  // --- Render: not logged in (and Supabase is configured) ---
  if (supabase && !session) {
    return <Login />;
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
        {session && (
          <button
            id="sign-out-button"
            onClick={handleSignOut}
            className="btn btn-outline"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
            title={`Signed in as ${session.user?.email}`}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        )}
      </header>

      <main className="w-full max-w-7xl mx-auto p-6 flex-1 flex flex-col gap-6">
        <Dashboard items={items} />

        <div className="flex gap-2 p-1 bg-black/20 rounded-lg border border-white/5 w-fit">
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
